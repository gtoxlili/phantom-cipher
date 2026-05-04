//! 微信开放平台运维端点 —— 清/查 API 调用配额。
//!
//! 业务上很少触发，但当某个微信接口被打爆当日额度时这俩是唯一恢复
//! 手段，留着以备不时之需。
//!
//!   POST /api/wx/quota-get   /cgi-bin/openapi/quota/get
//!   POST /api/wx/quota-clear /cgi-bin/clear_quota（每月最多 10 次）

use crate::routes::{ActionResponse, SharedState};
use axum::extract::{Json, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};
use serde_json::Value;

use super::token::ensure_token;

// ---------- 查 quota ----------

#[derive(Deserialize)]
pub struct QuotaGetRequest {
    /// 要查的 cgi 路径，例如 "/wxa/msg_sec_check"。前导 "/" 必须保留
    pub cgi_path: String,
}

#[derive(Serialize)]
#[serde(untagged)]
pub enum QuotaGetResponse {
    Ok {
        ok: bool,
        quota: Value,
        #[serde(skip_serializing_if = "Option::is_none")]
        rate_limit: Option<Value>,
    },
    Err {
        ok: bool,
        error: String,
    },
}

pub async fn quota_get(
    State(state): State<SharedState>,
    Json(req): Json<QuotaGetRequest>,
) -> impl IntoResponse {
    if req.cgi_path.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ActionResponse::err("cgi_path 不能为空")),
        )
            .into_response();
    }
    let token = match ensure_token(&state.wx).await {
        Ok(t) => t,
        Err(resp) => return resp.into_response(),
    };

    let url = format!(
        "https://api.weixin.qq.com/cgi-bin/openapi/quota/get?access_token={}",
        token
    );
    let body = serde_json::json!({ "cgi_path": req.cgi_path });

    let resp = match state.wx.http.post(&url).json(&body).send().await {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("微信接口连不通: {e}"))),
            )
                .into_response();
        }
    };
    let parsed: Value = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("解析失败: {e}"))),
            )
                .into_response();
        }
    };

    let errcode = parsed.get("errcode").and_then(|v| v.as_i64()).unwrap_or(0);
    if errcode != 0 {
        let errmsg = parsed
            .get("errmsg")
            .and_then(|v| v.as_str())
            .unwrap_or("(no msg)");
        return (
            StatusCode::OK,
            Json(QuotaGetResponse::Err {
                ok: false,
                error: format!("查 quota 失败 ({errcode}): {errmsg}"),
            }),
        )
            .into_response();
    }
    let quota = parsed.get("quota").cloned().unwrap_or(Value::Null);
    let rate_limit = parsed.get("rate_limit").cloned();
    (
        StatusCode::OK,
        Json(QuotaGetResponse::Ok {
            ok: true,
            quota,
            rate_limit,
        }),
    )
        .into_response()
}

// ---------- 清 quota ----------

#[derive(Deserialize, Default)]
pub struct QuotaClearRequest {
    /// 不传则用我们自己的 appid 清自家 quota
    #[serde(default)]
    pub appid: Option<String>,
}

pub async fn quota_clear(
    State(state): State<SharedState>,
    Json(req): Json<QuotaClearRequest>,
) -> impl IntoResponse {
    let token = match ensure_token(&state.wx).await {
        Ok(t) => t,
        Err(resp) => return resp.into_response(),
    };
    let appid = req
        .appid
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| state.wx.appid.clone());

    let url = format!(
        "https://api.weixin.qq.com/cgi-bin/clear_quota?access_token={}",
        token
    );
    let body = serde_json::json!({ "appid": appid });

    let resp = match state.wx.http.post(&url).json(&body).send().await {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("微信接口连不通: {e}"))),
            )
                .into_response();
        }
    };
    let parsed: Value = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("解析失败: {e}"))),
            )
                .into_response();
        }
    };
    let errcode = parsed.get("errcode").and_then(|v| v.as_i64()).unwrap_or(0);
    if errcode == 0 {
        return (StatusCode::OK, Json(ActionResponse::ok())).into_response();
    }
    let errmsg = parsed
        .get("errmsg")
        .and_then(|v| v.as_str())
        .unwrap_or("(no msg)");
    (
        StatusCode::OK,
        Json(ActionResponse::err(format!(
            "清 quota 失败 ({errcode}): {errmsg}"
        ))),
    )
        .into_response()
}
