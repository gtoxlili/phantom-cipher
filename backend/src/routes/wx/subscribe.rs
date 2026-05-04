//! `subscribeMessage.send` —— 服务端推送订阅消息。
//!
//! 用户必须先在客户端 `wx.requestSubscribeMessage` 授权某个 `template_id`，
//! 服务端才能给他推。一次授权一次推（一次性订阅消息）。
//!
//! 现在做成通用端点：调用方传 openid + template_id + page + data 即可。
//! 后续业务把它接到对应游戏事件（"轮到你了"、"对手放置赖子" 等）。
//!
//! 调用方建议：
//!   - template_id 在小程序后台 [订阅消息] 里申请，类目要匹配
//!   - data 字段名按模板里的 thing1/number2/... 之类来
//!   - page 必须是发布后的合法路径，比如 "pages/room/room?code=ABCD"

use crate::routes::{ActionResponse, SharedState};
use axum::extract::{Json, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::token::ensure_token;

#[derive(Deserialize)]
pub struct SubscribeSendRequest {
    pub openid: String,
    pub template_id: String,
    #[serde(default)]
    pub page: Option<String>,
    pub data: Value,
    /// 跳转小程序类型：developer/trial/formal，默认 formal
    #[serde(default)]
    pub miniprogram_state: Option<String>,
    #[serde(default)]
    pub lang: Option<String>,
}

#[derive(Serialize)]
#[serde(untagged)]
pub enum SubscribeSendResponse {
    Ok { ok: bool },
    Err { ok: bool, error: String },
}

#[derive(Deserialize)]
struct WxResp {
    #[serde(default)]
    errcode: Option<i64>,
    #[serde(default)]
    errmsg: Option<String>,
}

pub async fn subscribe_send(
    State(state): State<SharedState>,
    Json(req): Json<SubscribeSendRequest>,
) -> impl IntoResponse {
    if req.openid.trim().is_empty() || req.template_id.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ActionResponse::err("openid / template_id 不能为空")),
        )
            .into_response();
    }

    let token = match ensure_token(&state.wx).await {
        Ok(t) => t,
        Err(resp) => return resp.into_response(),
    };

    let mut body = serde_json::Map::new();
    body.insert("touser".into(), Value::String(req.openid));
    body.insert("template_id".into(), Value::String(req.template_id));
    body.insert("data".into(), req.data);
    if let Some(p) = req.page.filter(|s| !s.is_empty()) {
        body.insert("page".into(), Value::String(p));
    }
    if let Some(s) = req.miniprogram_state.filter(|s| !s.is_empty()) {
        body.insert("miniprogram_state".into(), Value::String(s));
    }
    if let Some(l) = req.lang.filter(|s| !s.is_empty()) {
        body.insert("lang".into(), Value::String(l));
    }

    let url = format!(
        "https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token={}",
        token
    );
    let resp = match state
        .wx
        .http
        .post(&url)
        .json(&Value::Object(body))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!(error = %e, "subscribe.send 网络错误");
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
            tracing::warn!(error = %e, "subscribe.send 解析错误");
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err("微信接口返回格式异常")),
            )
                .into_response();
        }
    };

    let errcode = parsed.errcode.unwrap_or(0);
    if errcode == 0 {
        return (
            StatusCode::OK,
            Json(SubscribeSendResponse::Ok { ok: true }),
        )
            .into_response();
    }
    let errmsg = parsed.errmsg.unwrap_or_default();
    tracing::info!(errcode, errmsg = %errmsg, "subscribe.send 业务错");
    (
        StatusCode::OK,
        Json(SubscribeSendResponse::Err {
            ok: false,
            error: format!("推送失败 ({errcode}): {errmsg}"),
        }),
    )
        .into_response()
}
