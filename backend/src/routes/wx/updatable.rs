//! 动态消息（updatableMessage）—— 转发出去的小程序卡片可以"活的"，
//! 服务端推状态变更，所有持卡的人看到的卡都同步更新。
//!
//! 完整链路（这里只做服务端两步）：
//!   1. POST /api/wx/activity-create  → 拿 activity_id（24h 有效）
//!   2. 客户端 wx.updateShareMenu({ activityId, isUpdatableMessage: true,
//!       templateInfo: { templateId: '...', parameterList: [...] } })
//!   3. 用户从分享菜单转发，朋友收到的卡片就是动态版
//!   4. POST /api/wx/updatable-msg-send → 推 target_state（1 进行中
//!       / 2 即将过期 / 3 已结束）+ 各 group_openid 完成度
//!
//! 用在本游戏：分享一个房间，朋友收到的卡片随对局推进自动更新
//! "WAITING / IN PROGRESS / GAME OVER"。

use crate::routes::{ActionResponse, SharedState};
use axum::extract::{Json, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use serde::{Deserialize, Serialize};

use super::token::ensure_token;

// ---------- activity_id 创建 ----------

#[derive(Deserialize)]
pub struct ActivityCreateRequest {
    /// 私密分享时指定 sharer 的 openid（公开分享时省略）
    #[serde(default)]
    pub openid: Option<String>,
    #[serde(default)]
    pub unionid: Option<String>,
}

#[derive(Serialize)]
#[serde(untagged)]
pub enum ActivityCreateResponse {
    Ok {
        ok: bool,
        activity_id: String,
        expiration_time: i64,
    },
    Err {
        ok: bool,
        error: String,
    },
}

#[derive(Deserialize)]
struct WxActivityResp {
    #[serde(default)]
    activity_id: Option<String>,
    #[serde(default)]
    expiration_time: Option<i64>,
    #[serde(default)]
    errcode: Option<i64>,
    #[serde(default)]
    errmsg: Option<String>,
}

pub async fn activity_create(
    State(state): State<SharedState>,
    Json(req): Json<ActivityCreateRequest>,
) -> impl IntoResponse {
    let token = match ensure_token(&state.wx).await {
        Ok(t) => t,
        Err(resp) => return resp.into_response(),
    };

    let mut url = format!(
        "https://api.weixin.qq.com/cgi-bin/message/wxopen/activityid/create?access_token={}",
        token
    );
    if let Some(o) = req.openid.as_deref().filter(|s| !s.is_empty()) {
        url.push_str("&openid=");
        url.push_str(&urlencoding(o));
    }
    if let Some(u) = req.unionid.as_deref().filter(|s| !s.is_empty()) {
        url.push_str("&unionid=");
        url.push_str(&urlencoding(u));
    }

    let resp = match state.wx.http.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("微信接口连不通: {e}"))),
            )
                .into_response();
        }
    };

    let parsed: WxActivityResp = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("解析失败: {e}"))),
            )
                .into_response();
        }
    };

    if let Some(activity_id) = parsed.activity_id.filter(|s| !s.is_empty()) {
        return (
            StatusCode::OK,
            Json(ActivityCreateResponse::Ok {
                ok: true,
                activity_id,
                expiration_time: parsed.expiration_time.unwrap_or(0),
            }),
        )
            .into_response();
    }
    let errcode = parsed.errcode.unwrap_or(-1);
    let errmsg = parsed.errmsg.unwrap_or_default();
    (
        StatusCode::OK,
        Json(ActivityCreateResponse::Err {
            ok: false,
            error: format!("activity_id 创建失败 ({errcode}): {errmsg}"),
        }),
    )
        .into_response()
}

// ---------- 推送状态更新 ----------

#[derive(Deserialize)]
pub struct UpdatableMsgRequest {
    pub activity_id: String,
    /// 1=进行中 2=即将过期 3=已结束
    pub target_state: u8,
    pub template_id: String,
    /// version_type：0=正式版 1=开发版 2=体验版
    #[serde(default)]
    pub version_type: Option<u8>,
    /// parameter_list：[{ name, value }, ...]，按模板申请时的字段名填
    #[serde(default)]
    pub parameter_list: Option<serde_json::Value>,
}

#[derive(Serialize)]
#[serde(untagged)]
pub enum UpdatableMsgResponse {
    Ok { ok: bool },
    Err { ok: bool, error: String },
}

#[derive(Deserialize)]
struct WxRespSimple {
    #[serde(default)]
    errcode: Option<i64>,
    #[serde(default)]
    errmsg: Option<String>,
}

pub async fn updatable_msg_send(
    State(state): State<SharedState>,
    Json(req): Json<UpdatableMsgRequest>,
) -> impl IntoResponse {
    if req.activity_id.trim().is_empty() || req.template_id.trim().is_empty() {
        return (
            StatusCode::BAD_REQUEST,
            Json(ActionResponse::err("activity_id / template_id 不能为空")),
        )
            .into_response();
    }
    let token = match ensure_token(&state.wx).await {
        Ok(t) => t,
        Err(resp) => return resp.into_response(),
    };

    let mut body = serde_json::Map::new();
    body.insert(
        "activity_id".into(),
        serde_json::Value::String(req.activity_id),
    );
    body.insert(
        "target_state".into(),
        serde_json::Value::from(req.target_state),
    );
    body.insert(
        "template_id".into(),
        serde_json::Value::String(req.template_id),
    );
    body.insert(
        "version_type".into(),
        serde_json::Value::from(req.version_type.unwrap_or(0)),
    );
    if let Some(pl) = req.parameter_list {
        body.insert("parameter_list".into(), pl);
    }

    let url = format!(
        "https://api.weixin.qq.com/cgi-bin/message/wxopen/updatablemsg/send?access_token={}",
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

    let parsed: WxRespSimple = match resp.json().await {
        Ok(p) => p,
        Err(e) => {
            return (
                StatusCode::BAD_GATEWAY,
                Json(ActionResponse::err(format!("解析失败: {e}"))),
            )
                .into_response();
        }
    };
    let errcode = parsed.errcode.unwrap_or(0);
    if errcode == 0 {
        return (StatusCode::OK, Json(UpdatableMsgResponse::Ok { ok: true })).into_response();
    }
    let errmsg = parsed.errmsg.unwrap_or_default();
    (
        StatusCode::OK,
        Json(UpdatableMsgResponse::Err {
            ok: false,
            error: format!("动态消息推送失败 ({errcode}): {errmsg}"),
        }),
    )
        .into_response()
}

fn urlencoding(s: &str) -> String {
    // 极简：openid / unionid 字符集本身就是 URL 安全的（[A-Za-z0-9_-]+ ），
    // 直接拼一般也行。这里保险起见做一遍最常见字符替换
    s.replace(' ', "%20").replace('&', "%26").replace('=', "%3D")
}
