//! HTTP + WebSocket 路由汇总。
//!
//! 业务上分三块：动作（POST 改状态）、WebSocket（推状态）、
//! 统计（只读）。这里只负责把路由表拼起来 + 暴露共享 state，
//! 真正的处理函数在子模块里。
//!
//! 响应封装统一用 `{ ok, error? }` 信封，前端一个解析路径就够。

use crate::disconnect::DisconnectTimers;
use crate::store::Store;
use axum::Router;
use axum::routing::{get, post};
use serde::Serialize;
use std::sync::Arc;

pub mod actions;
pub mod stats;
pub mod ws;

pub struct AppState {
    pub store: Arc<Store>,
    pub disconnect: Arc<DisconnectTimers>,
}

pub type SharedState = Arc<AppState>;

/// 所有动作 / WS / 统计接口的统一返回信封。前端按 `ok` 字段
/// 二选一：成功直接进游戏流程，失败 toast 出来即可。
#[derive(Serialize)]
#[serde(untagged)]
pub enum ActionResponse {
    Ok { ok: bool },
    Err { ok: bool, error: String },
}

impl ActionResponse {
    pub fn ok() -> Self {
        Self::Ok { ok: true }
    }
    pub fn err(msg: impl Into<String>) -> Self {
        Self::Err {
            ok: false,
            error: msg.into(),
        }
    }
}

pub fn router(state: SharedState) -> Router {
    Router::new()
        .route("/api/room/{code}/join", post(actions::join_or_create))
        .route("/api/room/{code}/start", post(actions::start_game))
        .route("/api/room/{code}/draw", post(actions::draw_tile))
        .route("/api/room/{code}/guess", post(actions::guess_tile))
        .route("/api/room/{code}/place-joker", post(actions::place_joker))
        .route("/api/room/{code}/continue", post(actions::decide_continue))
        .route("/api/room/{code}/reset", post(actions::reset_game))
        .route("/api/room/{code}/leave", post(actions::leave_room))
        .route("/api/room/{code}/ws", get(ws::ws_handler))
        .route("/api/stats", get(stats::stats))
        .with_state(state)
}
