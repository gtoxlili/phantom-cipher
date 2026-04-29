//! phantom-cipher backend (experimental Rust rewrite).
//!
//! Single-binary HTTP server. Serves:
//!   - /api/* — JSON Server-Action equivalents + a WebSocket per
//!     player carrying msgpack-encoded state pushes
//!   - everything else — static frontend assets out of FRONTEND_DIST
//!     (default ./public), with brotli/gzip compression
//!
//! Configuration via env:
//!   PORT              listening port (default 3000)
//!   DB_PATH           SQLite path (default data/phantom.db)
//!   FRONTEND_DIST     static asset dir (default ./public)
//!   RUST_LOG          tracing filter (default info)

mod db;
mod disconnect;
mod game;
mod routes;
mod store;
mod sweeper;
mod types;

use anyhow::Result;
use axum::body::Body;
use axum::extract::Request;
use axum::http::{Method, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::{Router, routing::any};
use std::sync::Arc;
use tower_http::compression::CompressionLayer;
use tower_http::trace::TraceLayer;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,phantom_cipher=info".into()),
        )
        .init();

    let db_path = std::env::var("DB_PATH").unwrap_or_else(|_| "data/phantom.db".into());
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3000);
    let dist_dir = std::env::var("FRONTEND_DIST").unwrap_or_else(|_| "./public".into());

    let pool = db::open(&db_path)?;
    let store = Arc::new(store::Store::new(pool));
    store.rehydrate();

    let disconnect = Arc::new(disconnect::DisconnectTimers::new());
    sweeper::spawn(store.clone());

    let state = Arc::new(routes::AppState {
        store: store.clone(),
        disconnect,
    });

    // Static + SPA fallback. Hand-rolled instead of tower_http's
    // ServeDir+not_found_service combo because the latter tries
    // to detect file existence asynchronously and the timing
    // around that on macOS / the Rust 1.95 runtime turned out to
    // be inconsistent (some 404s never reached not_found_service).
    // The handler below is explicit: request paths with a file
    // extension are served from disk, anything else routes back
    // to index.html so the Solid router can pick it up.
    let dist_for_fallback = dist_dir.clone();
    let app: Router = Router::new()
        .merge(routes::router(state))
        .fallback(any(move |req: Request| {
            let dist = dist_for_fallback.clone();
            async move { spa_fallback(req, dist).await }
        }))
        .layer(TraceLayer::new_for_http())
        .layer(CompressionLayer::new().br(true).gzip(true));

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await?;
    tracing::info!(
        port,
        rooms_loaded = store.len(),
        "phantom-cipher backend listening"
    );

    let shutdown = async {
        let _ = tokio::signal::ctrl_c().await;
        tracing::info!("shutdown signal received");
    };

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown)
        .await?;
    Ok(())
}

/// Hand-rolled SPA static handler. Path-with-extension → look for
/// the file on disk; everything else → serve index.html with the
/// SPA shell. HEAD responses share GET's headers but skip the body
/// per RFC 9110 §9.3.2.
async fn spa_fallback(req: Request, dist_dir: String) -> Response {
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

    let is_get_or_head = method == Method::GET || method == Method::HEAD;
    let is_head = method == Method::HEAD;
    if !is_get_or_head {
        return (StatusCode::METHOD_NOT_ALLOWED, "method not allowed").into_response();
    }

    let raw = uri.path().trim_start_matches('/');
    // Reject path traversal — anything with `..` or absolute paths.
    if raw.split('/').any(|seg| seg == ".." || seg.starts_with('.')) {
        return (StatusCode::FORBIDDEN, "forbidden").into_response();
    }
    let last_seg = raw.rsplit('/').next().unwrap_or("");
    let looks_like_asset = last_seg.contains('.');

    if looks_like_asset {
        let file_path = format!("{dist_dir}/{raw}");
        if let Ok(bytes) = tokio::fs::read(&file_path).await {
            let mime = mime_type(&file_path);
            let len = bytes.len();
            let mut builder = Response::builder()
                .header(header::CONTENT_TYPE, mime)
                .header(header::CACHE_CONTROL, asset_cache(&file_path))
                .header(header::CONTENT_LENGTH, len);
            // HEAD: declare the headers but drop the body.
            let body = if is_head { Body::empty() } else { Body::from(bytes) };
            return builder
                .body(body)
                .expect("response build")
                .into_response();
        }
        let mut builder = Response::builder().status(StatusCode::NOT_FOUND);
        return builder
            .body(if is_head { Body::empty() } else { Body::from("not found") })
            .expect("response build")
            .into_response();
    }

    // SPA route — serve the entry HTML, with per-room metadata +
    // absolute-URL image rewrites so share crawlers (especially
    // WeChat, which is finicky about relative og:image) get a
    // canonical URL pointing at the real origin.
    let html_path = format!("{dist_dir}/index.html");
    let bytes = tokio::fs::read(&html_path).await.unwrap_or_default();
    let origin = host
        .as_deref()
        .map(|h| derive_origin(h, scheme_hint.as_deref()))
        .filter(|o| !o.is_empty());
    let html = if let Ok(text) = std::str::from_utf8(&bytes) {
        let mut html = text.to_string();
        if let Some(origin) = origin.as_deref() {
            html = absolutize_image_meta(&html, origin);
        }
        if let Some(code) = extract_room_code(uri.path()) {
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
        .into_response()
}

/// Compose `https://example.com` from the Host header and an
/// optional X-Forwarded-Proto hint. Falls back to https when the
/// host has no port (assumed to be behind a TLS-terminating proxy)
/// and to http for explicit numeric ports — same heuristic as
/// most Rust web stacks default to.
fn derive_origin(host: &str, forwarded_proto: Option<&str>) -> String {
    if host.is_empty() {
        return String::new();
    }
    let scheme = forwarded_proto.unwrap_or_else(|| {
        // Without an explicit hint, lean on a common-case rule:
        // a host like `localhost:3000` is almost always plain
        // HTTP; a bare hostname behind a proxy is almost always
        // HTTPS. This isn't airtight but it's right for ~all
        // self-hosted deployments without explicit X-F-P.
        if host.contains(':') && host.starts_with("localhost") {
            "http"
        } else if host.contains(':')
            && host
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

/// Rewrite the four image meta tags to absolute URLs. The
/// original Next.js app did this implicitly via `metadataBase`;
/// emitting absolute URLs is important for WeChat link cards in
/// particular, which historically don't resolve relative paths.
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

/// `/room/<code>` (case-insensitive) → Some(uppercase code, max 6
/// chars). Anything else → None.
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

/// Rewrite the metadata tags share-card crawlers care about:
/// `<title>`, og:title, twitter:title, and the description pair.
/// Image tags are absolutized separately — see absolutize_image_meta.
fn inject_room_metadata(html: &str, code: &str) -> String {
    let title = format!("入局 · {code} · 达芬奇密码");
    let og_title = format!("{code} · TAKE THEIR CIPHER");
    let desc = format!("入局 {code} — 二十四块密码 · 唯一的胜者。");
    let mut out = html.replace(
        "<title>TAKE THEIR CIPHER · 达芬奇密码</title>",
        &format!("<title>{title}</title>"),
    );
    out = out.replace(
        r#"<meta property="og:title" content="TAKE THEIR CIPHER · 达芬奇密码" />"#,
        &format!(r#"<meta property="og:title" content="{og_title}" />"#),
    );
    out = out.replace(
        r#"<meta name="twitter:title" content="TAKE THEIR CIPHER · 达芬奇密码" />"#,
        &format!(r#"<meta name="twitter:title" content="{og_title}" />"#),
    );
    out = out.replace(
        r#"<meta property="og:description" content="二十四块密码 · 唯一的胜者。" />"#,
        &format!(r#"<meta property="og:description" content="{desc}" />"#),
    );
    out = out.replace(
        r#"<meta name="twitter:description" content="二十四块密码 · 唯一的胜者。" />"#,
        &format!(r#"<meta name="twitter:description" content="{desc}" />"#),
    );
    out
}

fn mime_type(path: &str) -> &'static str {
    let ext = path.rsplit('.').next().unwrap_or("").to_ascii_lowercase();
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

/// Hashed assets under /assets/* are cache-immutable; everything
/// else (root-level icons, manifest) gets a short TTL so updates
/// propagate in a deploy.
fn asset_cache(path: &str) -> &'static str {
    if path.contains("/assets/") {
        "public, max-age=31536000, immutable"
    } else {
        "public, max-age=300"
    }
}
