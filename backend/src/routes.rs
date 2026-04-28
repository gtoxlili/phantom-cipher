//! HTTP + WebSocket routes.
//!
//! Server-Action equivalents are exposed as REST POSTs at
//! /api/room/:code/<verb>. The body is JSON (low-volume; one POST
//! per turn), the response is a uniform `{ ok: true }` /
//! `{ ok: false, error }` envelope so the frontend keeps a single
//! handling path.
//!
//! State pushes use a single WebSocket per player at
//! /api/room/:code/ws?pid=... — frames are MessagePack-encoded
//! `ServerEvent`s, fanned out from `Room::notify()` via Arc<Bytes>.

use crate::db;
use crate::disconnect::DisconnectTimers;
use crate::game::{Game, GameError};
use crate::store::{self, Room, Store, sanitize_code};
use crate::types::{
    ContinueRequest, DrawRequest, GuessRequest, JoinRequest, PlaceJokerRequest, PlayerIdOnly,
};
use axum::{
    Json, Router,
    extract::{
        Path, Query, State,
        ws::{Message, Utf8Bytes, WebSocket, WebSocketUpgrade},
    },
    http::StatusCode,
    response::{IntoResponse, Response},
    routing::{get, post},
};
use bytes::Bytes;
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::mpsc;

pub struct AppState {
    pub store: Arc<Store>,
    pub disconnect: Arc<DisconnectTimers>,
}

pub type SharedState = Arc<AppState>;

#[derive(Serialize)]
#[serde(untagged)]
enum ActionResponse {
    Ok { ok: bool },
    Err { ok: bool, error: String },
}

impl ActionResponse {
    fn ok() -> Self {
        Self::Ok { ok: true }
    }
    fn err(msg: impl Into<String>) -> Self {
        Self::Err {
            ok: false,
            error: msg.into(),
        }
    }
}

fn from_game_err(e: GameError) -> ActionResponse {
    ActionResponse::err(e.to_string())
}

pub fn router(state: SharedState) -> Router {
    Router::new()
        .route("/api/room/{code}/join", post(join_or_create))
        .route("/api/room/{code}/start", post(start_game))
        .route("/api/room/{code}/draw", post(draw_tile))
        .route("/api/room/{code}/guess", post(guess_tile))
        .route("/api/room/{code}/place-joker", post(place_joker))
        .route("/api/room/{code}/continue", post(decide_continue))
        .route("/api/room/{code}/reset", post(reset_game))
        .route("/api/room/{code}/leave", post(leave_room))
        .route("/api/room/{code}/ws", get(ws_handler))
        .route("/api/stats", get(stats))
        .with_state(state)
}

// ---------- Action handlers ----------

async fn join_or_create(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<JoinRequest>,
) -> Json<ActionResponse> {
    if raw_code.is_empty() || req.player_id.is_empty() || req.name.is_empty() {
        return Json(ActionResponse::err("请提供房间码、玩家与昵称"));
    }
    let code = sanitize_code(&raw_code);

    let existing = state.store.get(&code);
    let room = match existing {
        None => {
            let room = Arc::new(Room::new(code.clone(), req.player_id.clone()));
            {
                let mut g = room.state.lock();
                g.add_player(&req.player_id, &req.name);
            }
            state.store.insert(room.clone());
            room
        }
        Some(room) => {
            let already_in = {
                let g = room.state.lock();
                g.players.iter().any(|p| p.id == req.player_id)
            };
            if already_in {
                let mut g = room.state.lock();
                g.add_player(&req.player_id, &req.name);
                drop(g);
                state.store.persist_and_maybe_archive(&room);
                room.notify();
                return Json(ActionResponse::ok());
            }
            // Validate join conditions.
            let g = room.state.lock();
            if req.as_host {
                return Json(from_game_err(GameError::RoomExists));
            }
            if !matches!(g.phase, crate::types::Phase::Waiting) {
                return Json(from_game_err(GameError::GameInProgress));
            }
            if g.players.len() >= 4 {
                return Json(from_game_err(GameError::RoomFull));
            }
            if g.has_player_name(&req.name) {
                return Json(from_game_err(GameError::NameTaken));
            }
            drop(g);
            let mut g = room.state.lock();
            g.add_player(&req.player_id, &req.name);
            drop(g);
            room
        }
    };
    state.store.persist_and_maybe_archive(&room);
    room.notify();
    Json(ActionResponse::ok())
}

async fn start_game(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<PlayerIdOnly>,
) -> Json<ActionResponse> {
    let code = sanitize_code(&raw_code);
    match store::with_room(&state.store, &code, |g| g.start(&req.player_id)) {
        Ok(_) => Json(ActionResponse::ok()),
        Err(e) => Json(from_game_err(e)),
    }
}

async fn draw_tile(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<DrawRequest>,
) -> Json<ActionResponse> {
    let code = sanitize_code(&raw_code);
    match store::with_room(&state.store, &code, |g| g.draw_tile(&req.player_id, req.color)) {
        Ok(_) => Json(ActionResponse::ok()),
        Err(e) => Json(from_game_err(e)),
    }
}

async fn guess_tile(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<GuessRequest>,
) -> Json<ActionResponse> {
    let code = sanitize_code(&raw_code);
    let room = match state.store.get(&code) {
        Some(r) => r,
        None => return Json(from_game_err(GameError::RoomNotFound)),
    };
    let result = {
        let mut g = room.state.lock();
        g.guess(&req.player_id, &req.target_player_id, &req.tile_id, req.number)
    };
    match result {
        Ok(reveal) => {
            // Reveal first (animations on the client want a separate event),
            // then state push as part of normal notify.
            room.emit_reveal(&reveal);
            state.store.persist_and_maybe_archive(&room);
            room.notify();
            Json(ActionResponse::ok())
        }
        Err(e) => Json(from_game_err(e)),
    }
}

async fn place_joker(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<PlaceJokerRequest>,
) -> Json<ActionResponse> {
    let code = sanitize_code(&raw_code);
    match store::with_room(&state.store, &code, |g| {
        g.place_joker(&req.player_id, req.position)
    }) {
        Ok(_) => Json(ActionResponse::ok()),
        Err(e) => Json(from_game_err(e)),
    }
}

async fn decide_continue(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<ContinueRequest>,
) -> Json<ActionResponse> {
    let code = sanitize_code(&raw_code);
    match store::with_room(&state.store, &code, |g| {
        g.decide_continue(&req.player_id, req.cont)
    }) {
        Ok(_) => Json(ActionResponse::ok()),
        Err(e) => Json(from_game_err(e)),
    }
}

async fn reset_game(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<PlayerIdOnly>,
) -> Json<ActionResponse> {
    let code = sanitize_code(&raw_code);
    match store::with_room(&state.store, &code, |g| g.reset(&req.player_id)) {
        Ok(_) => Json(ActionResponse::ok()),
        Err(e) => Json(from_game_err(e)),
    }
}

async fn leave_room(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<PlayerIdOnly>,
) -> Json<ActionResponse> {
    let code = sanitize_code(&raw_code);
    let Some(room) = state.store.get(&code) else {
        return Json(ActionResponse::ok());
    };
    {
        let mut g = room.state.lock();
        g.leave(&req.player_id);
    }
    state.store.persist_and_maybe_archive(&room);
    room.notify();
    state.store.cleanup(&code);
    Json(ActionResponse::ok())
}

// ---------- WebSocket ----------

#[derive(Deserialize)]
struct WsParams {
    pid: String,
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Query(params): Query<WsParams>,
) -> Response {
    let code = sanitize_code(&raw_code);
    let pid = params.pid;
    let Some(room) = state.store.get(&code) else {
        return (StatusCode::NOT_FOUND, "room not found").into_response();
    };
    {
        let g = room.state.lock();
        if !g.players.iter().any(|p| p.id == pid) {
            return (StatusCode::FORBIDDEN, "not in room").into_response();
        }
    }
    // Cancel any pending forfeit before subscribing — same pid is reattaching.
    state.disconnect.cancel(&code, &pid);

    // Mark connected on subscribe path. Mirrors the SSE-route fix
    // in the original: rehydrate sets connected=false, and re-joining
    // the WS shouldn't require re-running the join action.
    let was_disconnected = {
        let mut g = room.state.lock();
        g.mark_connected(&pid)
    };

    if was_disconnected {
        room.notify();
    }

    let store_for_close = state.store.clone();
    let disc_for_close = state.disconnect.clone();
    let code_for_close = code.clone();
    let pid_for_close = pid.clone();
    let room_for_close = room.clone();
    let pid_run = pid.clone();

    ws.on_upgrade(move |socket| async move {
        run_ws(socket, room_for_close.clone(), pid_run).await;
        // Cleanup on disconnect.
        room_for_close.unsubscribe(&pid_for_close);
        {
            let mut g = room_for_close.state.lock();
            g.mark_disconnected(&pid_for_close);
        }
        // Schedule forfeit unless they reconnect within the grace window.
        disc_for_close.schedule(store_for_close.clone(), code_for_close.clone(), pid_for_close);
        store_for_close.cleanup(&code_for_close);
    })
}

async fn run_ws(socket: WebSocket, room: Arc<Room>, pid: String) {
    let (mut sender, mut receiver) = futures::StreamExt::split(socket);
    let mut rx = room.subscribe(&pid);

    use futures::SinkExt;

    let send_task = tokio::spawn(async move {
        while let Some(arc_bytes) = rx.recv().await {
            // Bytes is itself Arc-backed; cloning is one ref-bump.
            let frame: Bytes = (*arc_bytes).clone();
            if sender.send(Message::Binary(frame)).await.is_err() {
                break;
            }
        }
        let _ = sender.close().await;
    });

    // Drain inbound until close. We don't expect any messages from
    // the client over WS — all mutations are POSTs — but we still
    // need to read so the protocol stays alive (pings/closes).
    while let Some(msg) = futures::StreamExt::next(&mut receiver).await {
        match msg {
            Ok(Message::Close(_)) | Err(_) => break,
            Ok(Message::Ping(_) | Message::Pong(_) | Message::Binary(_) | Message::Text(_)) => {}
        }
    }
    send_task.abort();
}

// ---------- Stats ----------

#[derive(Deserialize)]
struct StatsQuery {
    leaderboard: Option<i64>,
    recent: Option<i64>,
}

#[derive(Serialize)]
struct StatsResponse {
    totals: db::Totals,
    leaderboard: Vec<db::LeaderboardEntry>,
    recent: Vec<db::RecentMatch>,
}

async fn stats(
    State(state): State<SharedState>,
    Query(q): Query<StatsQuery>,
) -> impl IntoResponse {
    let lb = q.leaderboard.unwrap_or(20).clamp(1, 100);
    let rc = q.recent.unwrap_or(20).clamp(1, 100);
    let body = StatsResponse {
        totals: db::totals(&state.store.db),
        leaderboard: db::leaderboard(&state.store.db, lb),
        recent: db::recent_matches(&state.store.db, rc),
    };
    (
        [(
            axum::http::header::CACHE_CONTROL,
            "public, max-age=10, s-maxage=10, stale-while-revalidate=30",
        )],
        Json(body),
    )
}

// Suppress unused warning during the in-progress port.
#[allow(dead_code)]
fn _unused(_: mpsc::UnboundedSender<()>, _: Utf8Bytes) {}
