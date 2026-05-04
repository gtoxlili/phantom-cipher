//! `wx.login()` code → openid 交换。
//!
//! 流程：
//!   1. 小程序调 `wx.login()` 拿到 5 分钟有效 code
//!   2. POST 到 `/api/wx/login`
//!   3. 这边调 jscode2session 接口换 openid + unionid
//!   4. session_key 不外传——本项目暂无 watermark / 解密需求

use crate::routes::{ActionResponse, SharedState};
use axum::extract::{Json, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct WxLoginRequest {
    pub code: String,
}

#[derive(Serialize)]
#[serde(untagged)]
pub enum WxLoginResponse {
    Ok {
        ok: bool,
        openid: String,
        #[serde(skip_serializing_if = "Option::is_none")]
        unionid: Option<String>,
    },
    Err {
        ok: bool,
        error: String,
    },
}

#[derive(Deserialize)]
struct Code2SessionResp {
    #[serde(default)]
    openid: Option<String>,
    #[serde(default)]
    unionid: Option<String>,
    #[serde(default)]
    errcode: Option<i64>,
    #[serde(default)]
    errmsg: Option<String>,
}

pub async fn login(
    State(state): State<SharedState>,
    Json(req): Json<WxLoginRequest>,
) -> impl IntoResponse {
    let code = req.code.trim();
    if code.is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ActionResponse::err("code 不能为空")),
        )
            .into_response();
    }

    if !state.wx.enabled() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ActionResponse::err("WX_APPID / WX_SECRET 未配置")),
        )
            .into_response();
    }

    let resp = match state
        .wx
        .http
        .get("https://api.weixin.qq.com/sns/jscode2session")
        .query(&[
            ("appid", state.wx.appid.as_str()),
            ("secret", state.wx.secret.as_str()),
            ("js_code", code),
            ("grant_type", "authorization_code"),
        ])
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!(error = %e, "wx code2session 网络错误");
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("微信接口连不通: {e}"))),
            )
                .into_response();
        }
    };

    let parsed: Code2SessionResp = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            tracing::warn!(error = %e, "wx code2session 解析错误");
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err("微信接口返回格式异常")),
            )
                .into_response();
        }
    };

    if let Some(openid) = parsed.openid.filter(|s| !s.is_empty()) {
        return (
            StatusCode::OK,
            Json(WxLoginResponse::Ok {
                ok: true,
                openid,
                unionid: parsed.unionid,
            }),
        )
            .into_response();
    }

    let errmsg = parsed.errmsg.unwrap_or_else(|| "微信登录失败".to_string());
    let errcode = parsed.errcode.unwrap_or(-1);
    tracing::info!(errcode, errmsg = %errmsg, "wx code2session 业务错");
    (
        StatusCode::OK,
        Json(WxLoginResponse::Err {
            ok: false,
            error: format!("微信登录失败 ({errcode}): {errmsg}"),
        }),
    )
        .into_response()
}
