//! phantom-cipher 后端入口。
//!
//! 单二进制 HTTP 服务：
//!   - `/api/*` 走 REST + WebSocket（详见 `routes/`）
//!   - 其他路径回落到 SPA 入口 HTML（详见 `spa.rs`）
//!
//! 配置全走环境变量：
//!   PORT            监听端口（默认 3000）
//!   DB_PATH         SQLite 文件路径（默认 data/phantom.db）
//!   FRONTEND_DIST   前端 dist 目录（默认 ./public）
//!   RUST_LOG        tracing filter（默认 info）

mod db;
mod disconnect;
mod game;
mod routes;
mod spa;
mod store;
mod sweeper;
mod types;

use anyhow::Result;
use axum::extract::Request;
use axum::routing::any;
use axum::Router;
use std::sync::Arc;
use tower_http::trace::TraceLayer;

#[tokio::main(flavor = "multi_thread")]
async fn main() -> Result<()> {
    init_tracing();

    let cfg = Config::from_env();
    let store = Arc::new(store::Store::new(db::open(&cfg.db_path)?));
    store.rehydrate();

    let disconnect = Arc::new(disconnect::DisconnectTimers::new());
    sweeper::spawn(store.clone());

    // 微信小程序 jscode2session：用 appid + secret 把 wx.login() 的 code
    // 换成 openid。两个值从环境变量注进来（没配置就走 disabled 分支让
    // /api/wx/login 直接返错，不影响其它玩法）
    let wx_auth = routes::WxAuth {
        appid: std::env::var("WX_APPID").unwrap_or_default(),
        secret: std::env::var("WX_SECRET").unwrap_or_default(),
        http: reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
            .expect("reqwest client"),
    };

    let state = Arc::new(routes::AppState {
        store: store.clone(),
        disconnect,
        wx: wx_auth,
    });

    // 压缩这层故意没挂——前面的 nginx（Cloudflare 边缘 + KTLS 那台）
    // 在 proxy_set_header Accept-Encoding "" 把请求里的编码协商抹掉，
    // 由它统一做 brotli/gzip。在 Rust 这边再加一层只是死代码 + 让
    // 二进制变大。哪天裸跑（不过 nginx）再补 CompressionLayer。
    let dist = cfg.dist_dir.clone();
    let app = Router::new()
        .merge(routes::router(state))
        .fallback(any(move |req: Request| {
            let dist = dist.clone();
            async move { spa::fallback(req, dist).await }
        }))
        .layer(TraceLayer::new_for_http());

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", cfg.port)).await?;
    tracing::info!(port = cfg.port, rooms_loaded = store.len(), "phantom-cipher listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
            tracing::info!("shutdown signal received");
        })
        .await?;
    Ok(())
}

struct Config {
    port: u16,
    db_path: String,
    dist_dir: String,
}

impl Config {
    fn from_env() -> Self {
        Self {
            port: std::env::var("PORT")
                .ok()
                .and_then(|p| p.parse().ok())
                .unwrap_or(3000),
            db_path: std::env::var("DB_PATH").unwrap_or_else(|_| "data/phantom.db".into()),
            dist_dir: std::env::var("FRONTEND_DIST").unwrap_or_else(|_| "./public".into()),
        }
    }
}

fn init_tracing() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,phantom_cipher=info".into()),
        )
        .init();
}
