//! `getwxacodeunlimit` —— 生成无限制小程序码 PNG。
//!
//! 用作"邀请进房"二维码：scene = 房间码（4 字符），page = 房间页路径。
//! 用户扫码进微信即直达该房间。
//!
//! 端点用 GET 方便 `<image src="...">` 直接加载。返回 image/png 二进制。
//!
//! 注意：
//!   - scene 最大 32 字符，URL 安全字符；4 字符房间码远在范围内
//!   - page 必须是已发布版本中存在的页面路径
//!   - 微信侧每次 ~50KB 的 PNG，建议前端别每帧拉
//!
//! 失败时回 JSON 错（不返图）；前端按 src error 处理或先 fetch 再渲染。

use crate::routes::{ActionResponse, SharedState};
use axum::extract::{Query, State};
use axum::http::{header, StatusCode};
use axum::response::{IntoResponse, Response};
use serde::Deserialize;

use super::token::ensure_token;

#[derive(Deserialize)]
pub struct QrcodeQuery {
    /// 场景值，最长 32 字符
    pub scene: String,
    /// 跳转页路径，省略时由微信回小程序首页
    #[serde(default)]
    pub page: Option<String>,
    /// 边长 px，默认 430
    #[serde(default)]
    pub width: Option<u32>,
    /// 是否透明底
    #[serde(default)]
    pub is_hyaline: Option<bool>,
    /// 校验 page 是否真的存在，建议正式发布开 true、调试期 false
    #[serde(default)]
    pub check_path: Option<bool>,
    /// 二维码主题色，仅 auto_color=false 时用；hex 字串
    #[serde(default)]
    pub line_color: Option<String>,
    #[serde(default)]
    pub auto_color: Option<bool>,
    /// "release" / "trial" / "develop"
    #[serde(default)]
    pub env_version: Option<String>,
}

fn hex_to_rgb(hex: &str) -> Option<(u8, u8, u8)> {
    let s = hex.trim_start_matches('#');
    if s.len() != 6 { return None; }
    let r = u8::from_str_radix(&s[0..2], 16).ok()?;
    let g = u8::from_str_radix(&s[2..4], 16).ok()?;
    let b = u8::from_str_radix(&s[4..6], 16).ok()?;
    Some((r, g, b))
}

pub async fn qrcode(
    State(state): State<SharedState>,
    Query(q): Query<QrcodeQuery>,
) -> Response {
    let scene = q.scene.trim();
    if scene.is_empty() || scene.len() > 32 {
        return (
            StatusCode::BAD_REQUEST,
            axum::Json(ActionResponse::err("scene 长度需要在 1-32 字符之间")),
        )
            .into_response();
    }

    let token = match ensure_token(&state.wx).await {
        Ok(t) => t,
        Err(resp) => return resp.into_response(),
    };

    let mut body = serde_json::Map::new();
    body.insert("scene".into(), serde_json::Value::String(scene.to_string()));
    if let Some(p) = q.page.filter(|s| !s.is_empty()) {
        body.insert("page".into(), serde_json::Value::String(p));
    }
    body.insert(
        "width".into(),
        serde_json::Value::from(q.width.unwrap_or(430)),
    );
    if let Some(hy) = q.is_hyaline {
        body.insert("is_hyaline".into(), serde_json::Value::Bool(hy));
    }
    if let Some(cp) = q.check_path {
        body.insert("check_path".into(), serde_json::Value::Bool(cp));
    }
    if let Some(ac) = q.auto_color {
        body.insert("auto_color".into(), serde_json::Value::Bool(ac));
    }
    if let Some(lc) = q.line_color.as_deref().and_then(hex_to_rgb) {
        body.insert(
            "line_color".into(),
            serde_json::json!({ "r": lc.0, "g": lc.1, "b": lc.2 }),
        );
    }
    if let Some(ev) = q.env_version.filter(|s| !s.is_empty()) {
        body.insert("env_version".into(), serde_json::Value::String(ev));
    }

    // 用 .query() 而不是字符串拼接：access_token 万一有 URL 不安全字符
    // 也能稳；同时 reqwest 自动处理 multi-value query
    let resp = match state
        .wx
        .http
        .post("https://api.weixin.qq.com/wxa/getwxacodeunlimit")
        .query(&[("access_token", token.as_str())])
        .json(&serde_json::Value::Object(body))
        .send()
        .await
    {
        Ok(r) => r,
        Err(e) => {
            tracing::warn!(error = %e, "wxacode 网络错误");
            return (
                StatusCode::BAD_GATEWAY,
                axum::Json(ActionResponse::err(format!("微信接口连不通: {e}"))),
            )
                .into_response();
        }
    };

    // 收紧诊断：把上游 status / content-type 抓出来，body 拿不到就直接 log 出来
    let status = resp.status();
    let ctype = resp
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .to_string();

    let bytes = match resp.bytes().await {
        Ok(b) => b,
        Err(e) => {
            tracing::warn!(error = %e, %status, ctype = %ctype, "wxacode 读取响应体失败");
            return (
                StatusCode::BAD_GATEWAY,
                axum::Json(ActionResponse::err(format!("读取失败: {e}"))),
            )
                .into_response();
        }
    };

    // 微信成功返图片二进制；失败返 JSON `{ errcode, errmsg }`。
    // 历史上是 image/png，但近期也观测到 image/jpeg。检测顺序：
    //   1) Content-Type image/* → 信上游
    //   2) 否则按 magic bytes（PNG 89504E47 / JPEG FFD8FF）兜底
    let out_ctype: Option<String> = if ctype.starts_with("image/") {
        Some(ctype.clone())
    } else if bytes.len() >= 8 && &bytes[..4] == b"\x89PNG" {
        Some("image/png".to_string())
    } else if bytes.len() >= 3 && &bytes[..3] == b"\xFF\xD8\xFF" {
        Some("image/jpeg".to_string())
    } else {
        None
    };
    if let Some(ct) = out_ctype {
        return (
            StatusCode::OK,
            [
                (header::CONTENT_TYPE, ct.as_str()),
                (header::CACHE_CONTROL, "public, max-age=600"),
            ],
            bytes,
        )
            .into_response();
    }

    // 解析错误体回给客户端
    if let Ok(v) = serde_json::from_slice::<serde_json::Value>(&bytes) {
        let errcode = v.get("errcode").and_then(|x| x.as_i64()).unwrap_or(-1);
        let errmsg = v
            .get("errmsg")
            .and_then(|x| x.as_str())
            .unwrap_or("(no msg)");
        tracing::info!(errcode, errmsg, %status, "wxacode 业务错");
        return (
            StatusCode::OK,
            axum::Json(ActionResponse::err(format!(
                "二维码生成失败 ({errcode}): {errmsg}"
            ))),
        )
            .into_response();
    }

    // 既不是 PNG 也不是 JSON：上游可能返了 HTML 错误页 / 空体 / 异常压缩
    // 把前 200 字节预览写到日志，方便定位
    let preview: String = bytes
        .iter()
        .take(200)
        .map(|b| {
            if b.is_ascii() && !b.is_ascii_control() {
                *b as char
            } else {
                '·'
            }
        })
        .collect();
    tracing::warn!(
        %status,
        ctype = %ctype,
        body_len = bytes.len(),
        body_preview = %preview,
        "wxacode 响应非 PNG 也非 JSON"
    );
    (
        StatusCode::BAD_GATEWAY,
        axum::Json(ActionResponse::err(format!(
            "微信接口返回未知格式 (status={}, content-type={})",
            status, ctype
        ))),
    )
        .into_response()
}
