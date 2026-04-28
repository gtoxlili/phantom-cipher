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
use axum::http::{StatusCode, Uri, header};
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
        .fallback(any(move |uri: Uri| {
            let dist = dist_for_fallback.clone();
            async move { spa_fallback(uri, dist).await }
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
/// the file on disk; everything else → serve index.html.
async fn spa_fallback(uri: Uri, dist_dir: String) -> Response {
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
            return Response::builder()
                .header(header::CONTENT_TYPE, mime)
                .header(header::CACHE_CONTROL, asset_cache(&file_path))
                .body(Body::from(bytes))
                .expect("response build")
                .into_response();
        }
        return (StatusCode::NOT_FOUND, "not found").into_response();
    }

    // SPA route — serve the entry HTML.
    let html_path = format!("{dist_dir}/index.html");
    let bytes = tokio::fs::read(&html_path).await.unwrap_or_default();
    Response::builder()
        .header(header::CONTENT_TYPE, "text/html; charset=utf-8")
        .header(header::CACHE_CONTROL, "no-cache")
        .body(Body::from(bytes))
        .expect("response build")
        .into_response()
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
