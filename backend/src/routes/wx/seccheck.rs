//! `msg_sec_check` 文本内容安全检测。
//!
//! 微信合规线要求：凡是用户输入的可见文本（昵称、聊天、评论、上传素材）
//! 都得在服务端走一遍 msgSecCheck，"risky" 命中要拦下。
//! 本项目场景：玩家昵称（用户自己输入 / shuffle 给的代号）。
//!
//! 端点行为：返回 `{ ok: true, pass: bool, label?, suggest? }`。
//! `pass: false` 说明有风险，前端直接拒绝；`pass: true` 放行。
//! 后端报错或微信侧异常时返 `{ ok: false, error }`，调用方按"放行
//! + 记日志"处理（合规上更严的话也可以拦，看业务）。

use crate::routes::{ActionResponse, SharedState};
use axum::extract::{Json, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};

use super::token::ensure_token;

#[derive(Deserialize)]
pub struct SecCheckRequest {
    pub content: String,
    pub openid: String,
    /// 1=资料 2=评论 3=论坛 4=社交日志，默认 1
    #[serde(default = "default_scene")]
    pub scene: u8,
}

fn default_scene() -> u8 { 1 }

#[derive(Serialize)]
#[serde(untagged)]
pub enum SecCheckResponse {
    Ok {
        ok: bool,
        pass: bool,
        #[serde(skip_serializing_if = "Option::is_none")]
        suggest: Option<String>,
        #[serde(skip_serializing_if = "Option::is_none")]
        label: Option<i64>,
    },
    Err {
        ok: bool,
        error: String,
    },
}

#[derive(Deserialize)]
struct WxResp {
    #[serde(default)]
    errcode: Option<i64>,
    #[serde(default)]
    errmsg: Option<String>,
    #[serde(default)]
    result: Option<WxResult>,
}
#[derive(Deserialize)]
struct WxResult {
    #[serde(default)]
    suggest: Option<String>,
    #[serde(default)]
    label: Option<i64>,
}

pub async fn sec_check(
    State(state): State<SharedState>,
    Json(req): Json<SecCheckRequest>,
) -> impl IntoResponse {
    let content = req.content.trim();
    if content.is_empty() {
        // 空文本无需检测，直接放行
        return (
            StatusCode::OK,
            Json(SecCheckResponse::Ok {
                ok: true,
                pass: true,
                suggest: None,
                label: None,
            }),
        )
            .into_response();
    }
    if req.openid.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ActionResponse::err("openid 不能为空")),
        )
            .into_response();
    }

    let token = match ensure_token(&state.wx).await {
        Ok(t) => t,
        Err(resp) => return resp.into_response(),
    };

    let body = serde_json::json!({
        "openid": req.openid,
        "scene": req.scene,
        "version": 2,
        "content": content,
    });

    let url = format!(
        "https://api.weixin.qq.com/wxa/msg_sec_check?access_token={}",
        token
    );
    let resp = match state.wx.http.post(&url).json(&body).send().await {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!(error = %e, "msg_sec_check 网络错误");
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("微信接口连不通: {e}"))),
            )
                .into_response();
        }
    };

    let parsed: WxResp = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            tracing::warn!(error = %e, "msg_sec_check 解析错误");
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err("微信接口返回格式异常")),
            )
                .into_response();
        }
    };

    let errcode = parsed.errcode.unwrap_or(0);
    if errcode != 0 {
        let errmsg = parsed.errmsg.unwrap_or_default();
        tracing::info!(errcode, errmsg = %errmsg, "msg_sec_check 业务错");
        return (
            StatusCode::OK,
            Json(SecCheckResponse::Err {
                ok: false,
                error: format!("内容检测失败 ({errcode}): {errmsg}"),
            }),
        )
            .into_response();
    }

    let result = parsed.result.unwrap_or(WxResult {
        suggest: None,
        label: None,
    });
    let suggest = result.suggest.unwrap_or_else(|| "pass".into());
    // suggest = "pass" / "review" / "risky"，"risky" 直接拦
    let pass = suggest != "risky";
    (
        StatusCode::OK,
        Json(SecCheckResponse::Ok {
            ok: true,
            pass,
            suggest: Some(suggest),
            label: result.label,
        }),
    )
        .into_response()
}
