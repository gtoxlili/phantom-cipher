//! 短链 / URL Link —— 把进入小程序的链接生成出来给非微信渠道（短信、
//! 邮件、外站 H5）拉用户回小程序。
//!
//! 两个端点：
//!   POST /api/wx/shortlink  → genwxashortlink，wxaurl.cn 短链，
//!                              微信生态内分享更紧凑
//!   POST /api/wx/urllink    → generate_urllink，跨平台 H5 → 小程序的
//!                              加密 URL Link
//!
//! 业务上：分享给微信好友走 onShareAppMessage（卡片）；分享到非微信
//! 渠道（朋友圈外的微博 / 网页 / SMS / 邮件）走 urllink。

use crate::routes::{ActionResponse, SharedState};
use axum::extract::{Json, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};

use super::token::ensure_token;

// ---------- 短链 ----------

#[derive(Deserialize)]
pub struct ShortLinkRequest {
    /// 跳转路径，如 "/pages/room/room"
    pub path: String,
    /// query 串，如 "code=ABCD"
    #[serde(default)]
    pub query: Option<String>,
    /// release / trial / develop，默认 release
    #[serde(default)]
    pub env_version: Option<String>,
    /// 0=永久（默认） 1=临时（需配合 expire_interval）
    #[serde(default)]
    pub expire_type: Option<u8>,
    /// 单位秒，仅 expire_type=1 生效
    #[serde(default)]
    pub expire_interval: Option<u64>,
}

#[derive(Serialize)]
#[serde(untagged)]
pub enum ShortLinkResponse {
    Ok { ok: bool, link: String },
    Err { ok: bool, error: String },
}

#[derive(Deserialize)]
struct WxShortLinkResp {
    #[serde(default)]
    short_link: Option<String>,
    #[serde(default)]
    link: Option<String>,
    #[serde(default)]
    errcode: Option<i64>,
    #[serde(default)]
    errmsg: Option<String>,
}

pub async fn shortlink(
    State(state): State<SharedState>,
    Json(req): Json<ShortLinkRequest>,
) -> impl IntoResponse {
    if req.path.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ActionResponse::err("path 不能为空")),
        )
            .into_response();
    }
    let token = match ensure_token(&state.wx).await {
        Ok(t) => t,
        Err(resp) => return resp.into_response(),
    };

    let mut jump = serde_json::Map::new();
    jump.insert("path".into(), serde_json::Value::String(req.path));
    if let Some(q) = req.query.filter(|s| !s.is_empty()) {
        jump.insert("query".into(), serde_json::Value::String(q));
    }

    let mut body = serde_json::Map::new();
    body.insert("jump_wxa".into(), serde_json::Value::Object(jump));
    body.insert(
        "env_version".into(),
        serde_json::Value::String(
            req.env_version
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "release".into()),
        ),
    );
    body.insert(
        "expire_type".into(),
        serde_json::Value::from(req.expire_type.unwrap_or(0)),
    );
    if let Some(i) = req.expire_interval {
        body.insert("expire_interval".into(), serde_json::Value::from(i));
    }

    let url = format!(
        "https://api.weixin.qq.com/wxa/genwxashortlink?access_token={}",
        token
    );
    let resp = match state
        .wx
        .http
        .post(&url)
        .json(&serde_json::Value::Object(body))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("微信接口连不通: {e}"))),
            )
                .into_response();
        }
    };

    let parsed: WxShortLinkResp = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("解析失败: {e}"))),
            )
                .into_response();
        }
    };

    let link = parsed
        .short_link
        .or(parsed.link)
        .filter(|s| !s.is_empty());
    if let Some(l) = link {
        return (
            StatusCode::OK,
            Json(ShortLinkResponse::Ok { ok: true, link: l }),
        )
            .into_response();
    }
    let errcode = parsed.errcode.unwrap_or(-1);
    let errmsg = parsed.errmsg.unwrap_or_default();
    (
        StatusCode::OK,
        Json(ShortLinkResponse::Err {
            ok: false,
            error: format!("短链生成失败 ({errcode}): {errmsg}"),
        }),
    )
        .into_response()
}

// ---------- URL Link（跨平台 H5 跳小程序） ----------

#[derive(Deserialize)]
pub struct UrlLinkRequest {
    pub path: String,
    #[serde(default)]
    pub query: Option<String>,
    #[serde(default)]
    pub env_version: Option<String>,
    #[serde(default)]
    pub expire_type: Option<u8>,
    #[serde(default)]
    pub expire_interval: Option<u64>,
}

#[derive(Serialize)]
#[serde(untagged)]
pub enum UrlLinkResponse {
    Ok { ok: bool, url_link: String },
    Err { ok: bool, error: String },
}

#[derive(Deserialize)]
struct WxUrlLinkResp {
    #[serde(default)]
    url_link: Option<String>,
    #[serde(default)]
    errcode: Option<i64>,
    #[serde(default)]
    errmsg: Option<String>,
}

pub async fn urllink(
    State(state): State<SharedState>,
    Json(req): Json<UrlLinkRequest>,
) -> impl IntoResponse {
    if req.path.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ActionResponse::err("path 不能为空")),
        )
            .into_response();
    }
    let token = match ensure_token(&state.wx).await {
        Ok(t) => t,
        Err(resp) => return resp.into_response(),
    };

    let mut jump = serde_json::Map::new();
    jump.insert("path".into(), serde_json::Value::String(req.path));
    if let Some(q) = req.query.filter(|s| !s.is_empty()) {
        jump.insert("query".into(), serde_json::Value::String(q));
    }

    let mut body = serde_json::Map::new();
    body.insert("jump_wxa".into(), serde_json::Value::Object(jump));
    body.insert(
        "env_version".into(),
        serde_json::Value::String(
            req.env_version
                .filter(|s| !s.is_empty())
                .unwrap_or_else(|| "release".into()),
        ),
    );
    body.insert(
        "expire_type".into(),
        serde_json::Value::from(req.expire_type.unwrap_or(0)),
    );
    if let Some(i) = req.expire_interval {
        body.insert("expire_interval".into(), serde_json::Value::from(i));
    }

    let url = format!(
        "https://api.weixin.qq.com/wxa/generate_urllink?access_token={}",
        token
    );
    let resp = match state
        .wx
        .http
        .post(&url)
        .json(&serde_json::Value::Object(body))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("微信接口连不通: {e}"))),
            )
                .into_response();
        }
    };

    let parsed: WxUrlLinkResp = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("解析失败: {e}"))),
            )
                .into_response();
        }
    };

    if let Some(u) = parsed.url_link.filter(|s| !s.is_empty()) {
        return (
            StatusCode::OK,
            Json(UrlLinkResponse::Ok {
                ok: true,
                url_link: u,
            }),
        )
            .into_response();
    }
    let errcode = parsed.errcode.unwrap_or(-1);
    let errmsg = parsed.errmsg.unwrap_or_default();
    (
        StatusCode::OK,
        Json(UrlLinkResponse::Err {
            ok: false,
            error: format!("URL Link 生成失败 ({errcode}): {errmsg}"),
        }),
    )
        .into_response()
}
