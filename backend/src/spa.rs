//! SPA 静态资源 + 入口 HTML 注入。
//!
//! 设计上故意没用 tower-http 的 ServeDir + not_found_service：那条
//! 路在某些 macOS 编排下 not_found_service 不一定会被触发，导致
//! /room/AB12 这种 SPA 客户端路由变 404。手写一个简单分发更可靠：
//!
//!   - 路径末段含 `.` → 当静态资源处理（带 mime + 长缓存）
//!   - 否则 → 当 SPA 路由处理，回 index.html，并按需注入 per-room
//!     metadata 和把 og:image 改写成绝对 URL（微信卡片不识别相对
//!     路径）

use axum::body::Body;
use axum::extract::Request;
use axum::http::{header, Method, StatusCode};
use axum::response::{IntoResponse, Response};
use std::path::Path;

pub async fn fallback(req: Request, dist_dir: String) -> Response {
    let method = req.method().clone();
    let uri = req.uri().clone();
    let host = req
        .headers()
        .get(header::HOST)
        .and_then(|v| v.to_str().ok())
        .map(str::to_string);
    let scheme_hint = req
        .headers()
        .get("x-forwarded-proto")
        .and_then(|v| v.to_str().ok())
        .map(str::to_string);
    let accept_encoding = req
        .headers()
        .get(header::ACCEPT_ENCODING)
        .and_then(|v| v.to_str().ok())
        .map(str::to_string);

    if method != Method::GET && method != Method::HEAD {
        return (StatusCode::METHOD_NOT_ALLOWED, "method not allowed").into_response();
    }
    let is_head = method == Method::HEAD;

    let raw = uri.path().trim_start_matches('/');
    // 反路径穿越：`..` 和点开头的隐藏文件直接拒
    if raw.split('/').any(|seg| seg == ".." || seg.starts_with('.')) {
        return (StatusCode::FORBIDDEN, "forbidden").into_response();
    }

    let last_seg = raw.rsplit('/').next().unwrap_or("");
    if last_seg.contains('.') {
        return serve_asset(&dist_dir, raw, is_head, accept_encoding.as_deref()).await;
    }

    serve_spa(&dist_dir, uri.path(), host.as_deref(), scheme_hint.as_deref(), is_head).await
}

/// Vite 构建期产 `.br` / `.gz` 兄弟文件（vite-plugin-compression2，br
/// quality 11 / gzip level 9）。这里按客户端 Accept-Encoding 选最好
/// 的那个直接送回，nginx 看到 Content-Encoding 就跳过 runtime 压缩，
/// CF 边缘也存的是更小的版本。woff2 字体内部已经是 brotli 压过的，
/// Vite 那边 exclude 了，这里也对应找不到 .br，自然 fallback 到原文件。
async fn serve_asset(
    dist_dir: &str,
    rel_path: &str,
    is_head: bool,
    accept_encoding: Option<&str>,
) -> Response {
    let base_path = format!("{dist_dir}/{rel_path}");
    let mime = mime_for(&base_path);
    let cache = cache_for(&base_path);

    let prefers_br = accept_encoding.is_some_and(|ae| accepts_encoding(ae, "br"));
    let prefers_gzip = accept_encoding.is_some_and(|ae| accepts_encoding(ae, "gzip"));

    // br 优先 —— 同等 Accept-Encoding 下比 gzip 小约 15%
    if prefers_br {
        if let Ok(b) = tokio::fs::read(format!("{base_path}.br")).await {
            return build_compressed_response(b, mime, cache, "br", is_head);
        }
    }
    if prefers_gzip {
        if let Ok(b) = tokio::fs::read(format!("{base_path}.gz")).await {
            return build_compressed_response(b, mime, cache, "gzip", is_head);
        }
    }

    // 没有预压缩兄弟文件（图标、woff2 等）或客户端不支持 → 回原文件
    let bytes = match tokio::fs::read(&base_path).await {
        Ok(b) => b,
        Err(_) => {
            return Response::builder()
                .status(StatusCode::NOT_FOUND)
                .body(if is_head { Body::empty() } else { Body::from("not found") })
                .expect("response build");
        }
    };
    let len = bytes.len();
    let body = if is_head { Body::empty() } else { Body::from(bytes) };
    Response::builder()
        .header(header::CONTENT_TYPE, mime)
        .header(header::CACHE_CONTROL, cache)
        .header(header::CONTENT_LENGTH, len)
        .header(header::VARY, "Accept-Encoding")
        .body(body)
        .expect("response build")
}

fn build_compressed_response(
    bytes: Vec<u8>,
    mime: &str,
    cache: &str,
    encoding: &str,
    is_head: bool,
) -> Response {
    let len = bytes.len();
    let body = if is_head { Body::empty() } else { Body::from(bytes) };
    Response::builder()
        .header(header::CONTENT_TYPE, mime)
        .header(header::CACHE_CONTROL, cache)
        .header(header::CONTENT_LENGTH, len)
        .header(header::CONTENT_ENCODING, encoding)
        .header(header::VARY, "Accept-Encoding")
        .body(body)
        .expect("response build")
}

/// 在 Accept-Encoding 字段里查指定编码是否可用。
/// 简化处理——不解析 q-value（q=0 表示明确拒绝，但极少见，一般客户端
/// 要么列出来要么不列），逗号 + 分号都当分隔符切，命中且不带 `q=0`
/// 就算支持。
fn accepts_encoding(accept_encoding: &str, encoding: &str) -> bool {
    accept_encoding
        .split(',')
        .map(str::trim)
        .any(|part| {
            let mut segs = part.split(';').map(str::trim);
            let name = segs.next().unwrap_or("");
            let rejected = segs.any(|s| s.eq_ignore_ascii_case("q=0") || s.eq_ignore_ascii_case("q=0.0"));
            !rejected && name.eq_ignore_ascii_case(encoding)
        })
}

async fn serve_spa(
    dist_dir: &str,
    path: &str,
    host: Option<&str>,
    scheme_hint: Option<&str>,
    is_head: bool,
) -> Response {
    let html_path = format!("{dist_dir}/index.html");
    let bytes = tokio::fs::read(&html_path).await.unwrap_or_default();
    let origin = host
        .filter(|h| !h.is_empty())
        .map(|h| derive_origin(h, scheme_hint));

    let html = if let Ok(text) = std::str::from_utf8(&bytes) {
        let mut html = text.to_string();
        if let Some(origin) = origin.as_deref() {
            html = absolutize_image_meta(&html, origin);
        }
        if let Some(code) = extract_room_code(path) {
            html = inject_room_metadata(&html, &code);
        }
        html.into_bytes()
    } else {
        bytes
    };
    let len = html.len();
    let body = if is_head { Body::empty() } else { Body::from(html) };

    Response::builder()
        .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
        .header(header::CACHE_CONTROL, "no-cache")
        .header(header::CONTENT_LENGTH, len)
        .body(body)
        .expect("response build")
}

// ---- mime / 缓存策略 ------------------------------------------------

fn mime_for(path: &str) -> &'static str {
    let ext = Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    match ext.as_str() {
        "js" | "mjs" => "application/javascript; charset=utf-8",
        "css" => "text/css; charset=utf-8",
        "html" | "htm" => "text/html; charset=utf-8",
        "json" => "application/json; charset=utf-8",
        "webmanifest" => "application/manifest+json",
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "ico" => "image/x-icon",
        "woff" => "font/woff",
        "woff2" => "font/woff2",
        "txt" => "text/plain; charset=utf-8",
        "wasm" => "application/wasm",
        _ => "application/octet-stream",
    }
}

/// `/assets/*` 是 hash 命名，可以一年长缓存；其他根目录文件
/// （icon / manifest）走 5 分钟，部署更新能尽快生效。
fn cache_for(path: &str) -> &'static str {
    if path.contains("/assets/") {
        "public, max-age=31536000, immutable"
    } else {
        "public, max-age=300"
    }
}

// ---- HTML 注入 ------------------------------------------------------

/// `/room/<code>` （大小写不敏感）→ `Some(规整大写 6 字符)`。
/// 其他路径 → `None`。
fn extract_room_code(path: &str) -> Option<String> {
    let trimmed = path.trim_start_matches('/');
    let mut parts = trimmed.split('/');
    let head = parts.next()?;
    if !head.eq_ignore_ascii_case("room") {
        return None;
    }
    let code = parts.next()?;
    if parts.next().is_some() {
        return None;
    }
    let normalized: String = code
        .chars()
        .filter(|c| c.is_ascii_alphanumeric())
        .take(6)
        .collect::<String>()
        .to_ascii_uppercase();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized)
    }
}

/// 用 Host header（+ 可选的 X-Forwarded-Proto）拼出 `https://host`。
/// 没显式 hint 的话用一条经验规则：`localhost:xxxx` 几乎总是
/// 明文 HTTP，其他带端口的也按非常规端口 = HTTP 处理；纯主机名
/// 视作有 TLS 反代，走 HTTPS。
fn derive_origin(host: &str, forwarded_proto: Option<&str>) -> String {
    let scheme = forwarded_proto.unwrap_or_else(|| {
        if host.starts_with("localhost") && host.contains(':') {
            "http"
        } else if host
            .rsplit_once(':')
            .and_then(|(_, p)| p.parse::<u16>().ok())
            .is_some_and(|p| p != 80 && p != 443)
        {
            "http"
        } else {
            "https"
        }
    });
    format!("{scheme}://{host}")
}

/// og:image / twitter:image 改写成绝对 URL。原 Next 是构建期通过
/// `metadataBase` 烤进去的，新版没有这层就得运行时注入——尤其是
/// 微信链接卡片不识别相对路径。
fn absolutize_image_meta(html: &str, origin: &str) -> String {
    let pairs = [
        (
            r#"<meta property="og:image" content="/og-image.png" />"#,
            format!(r#"<meta property="og:image" content="{origin}/og-image.png" />"#),
        ),
        (
            r#"<meta name="twitter:image" content="/og-image.png" />"#,
            format!(r#"<meta name="twitter:image" content="{origin}/og-image.png" />"#),
        ),
        (
            r#"<meta name="image" content="/og-image.png" />"#,
            format!(r#"<meta name="image" content="{origin}/og-image.png" />"#),
        ),
        (
            r#"<meta name="msapplication-TileImage" content="/og-image.png" />"#,
            format!(r#"<meta name="msapplication-TileImage" content="{origin}/og-image.png" />"#),
        ),
    ];
    let mut out = html.to_string();
    for (needle, replacement) in pairs {
        out = out.replace(needle, &replacement);
    }
    out
}

/// 把房间码烤进 `<title>` / og:title / twitter:title / description，
/// 让分享 `/room/AB12` 链接的卡片预览能看出房间码。
fn inject_room_metadata(html: &str, code: &str) -> String {
    let title = format!("入局 · {code} · 达芬奇密码");
    let og_title = format!("{code} · TAKE THEIR CIPHER");
    let desc = format!("入局 {code} — 二十四块密码 · 唯一的胜者。");
    html.replace(
        "<title>TAKE THEIR CIPHER · 达芬奇密码</title>",
        &format!("<title>{title}</title>"),
    )
    .replace(
        r#"<meta property="og:title" content="TAKE THEIR CIPHER · 达芬奇密码" />"#,
        &format!(r#"<meta property="og:title" content="{og_title}" />"#),
    )
    .replace(
        r#"<meta name="twitter:title" content="TAKE THEIR CIPHER · 达芬奇密码" />"#,
        &format!(r#"<meta name="twitter:title" content="{og_title}" />"#),
    )
    .replace(
        r#"<meta property="og:description" content="二十四块密码 · 唯一的胜者。" />"#,
        &format!(r#"<meta property="og:description" content="{desc}" />"#),
    )
    .replace(
        r#"<meta name="twitter:description" content="二十四块密码 · 唯一的胜者。" />"#,
        &format!(r#"<meta name="twitter:description" content="{desc}" />"#),
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extract_basic_room_code() {
        assert_eq!(extract_room_code("/room/AB12"), Some("AB12".into()));
    }

    #[test]
    fn extract_room_code_normalizes_case_and_length() {
        assert_eq!(extract_room_code("/room/ab12cdef9"), Some("AB12CD".into()));
    }

    #[test]
    fn extract_rejects_non_room_paths() {
        assert!(extract_room_code("/").is_none());
        assert!(extract_room_code("/api/stats").is_none());
        assert!(extract_room_code("/room").is_none());
        assert!(extract_room_code("/room/AB/12").is_none());
    }

    #[test]
    fn origin_uses_forwarded_proto() {
        assert_eq!(
            derive_origin("cipher.gtio.work", Some("https")),
            "https://cipher.gtio.work"
        );
    }

    #[test]
    fn origin_localhost_defaults_http() {
        assert_eq!(
            derive_origin("localhost:3000", None),
            "http://localhost:3000"
        );
    }

    #[test]
    fn origin_bare_host_defaults_https() {
        assert_eq!(
            derive_origin("cipher.gtio.work", None),
            "https://cipher.gtio.work"
        );
    }
}
