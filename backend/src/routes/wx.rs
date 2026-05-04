//! 微信小程序登录端点。
//!
//! 流程：
//!   1. 小程序调 `wx.login()` 拿到 5 分钟有效 code
//!   2. 小程序把 code POST 到 `/api/wx/login`
//!   3. 这边拿 appid + secret + code 调 jscode2session
//!      <https://api.weixin.qq.com/sns/jscode2session>
//!   4. 拿到 `{ openid, session_key, unionid? }` 后只回 openid 给小程序
//!      session_key 不外传——后续如果有需要做 watermark / encryptedData
//!      解密再用，本项目暂时不需要
//!
//! `openid` 直接当 `player_id` 用：在小程序内是稳定的、跨打开次数不变、
//! 跨设备共享（同一微信号）。比 UUID 强在跨设备识别。
//!
//! 未配置 `WX_APPID` / `WX_SECRET` 时直接 503 拒绝，让客户端 fallback
//! 到本地 UUID 模式（小程序里 identity.js 走兜底分支）。

use super::{ActionResponse, SharedState};
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

impl WxLoginResponse {
    fn ok(openid: String, unionid: Option<String>) -> Self {
        Self::Ok {
            ok: true,
            openid,
            unionid,
        }
    }
    fn err(msg: impl Into<String>) -> Self {
        Self::Err {
            ok: false,
            error: msg.into(),
        }
    }
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

    let appid = state.wx.appid.trim();
    let secret = state.wx.secret.trim();
    if appid.is_empty() || secret.is_empty() {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            Json(ActionResponse::err("WX_APPID / WX_SECRET 未配置")),
        )
            .into_response();
    }

    // GET https://api.weixin.qq.com/sns/jscode2session?appid=&secret=&js_code=&grant_type=authorization_code
    let url = "https://api.weixin.qq.com/sns/jscode2session";
    let resp = match state
        .wx
        .http
        .get(url)
        .query(&[
            ("appid", appid),
            ("secret", secret),
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
        let body = WxLoginResponse::ok(openid, parsed.unionid);
        return (StatusCode::OK, Json(body)).into_response();
    }

    let errmsg = parsed
        .errmsg
        .unwrap_or_else(|| "微信登录失败".to_string());
    let errcode = parsed.errcode.unwrap_or(-1);
    tracing::info!(errcode, errmsg = %errmsg, "wx code2session 业务错");
    let body = WxLoginResponse::err(format!("微信登录失败 ({errcode}): {errmsg}"));
    (StatusCode::OK, Json(body)).into_response()
}
