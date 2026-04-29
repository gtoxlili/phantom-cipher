//! 动作接口——对应原 Server Actions 的每个动词。
//!
//! 一律 POST + JSON body，body 里都带 `playerId`，路径里都带
//! `code`。响应统一走 `ActionResponse` 信封。
//!
//! 加入 / 重开两个动作不能直接走 `Store::mutate`：前者要在房间不
//! 存在时新建，后者顺路要清下"已归档"标记。剩下六个全部委托给
//! `mutate` 自动 persist + notify。

use super::{ActionResponse, SharedState};
use crate::game::GameError;
use crate::store::{Room, Store};
use crate::types::{
    ContinueRequest, DrawRequest, GuessRequest, JoinRequest, PlaceJokerRequest, PlayerIdOnly,
    Phase,
};
use axum::extract::{Path, State};
use axum::Json;
use std::sync::Arc;

fn from_err(e: GameError) -> ActionResponse {
    ActionResponse::err(e.to_string())
}

pub async fn join_or_create(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<JoinRequest>,
) -> Json<ActionResponse> {
    if raw_code.is_empty() || req.player_id.is_empty() || req.name.is_empty() {
        return Json(ActionResponse::err("请提供房间码、玩家与昵称"));
    }
    let code = Store::sanitize_code(&raw_code);

    // 三种情况：房间不存在、已是房间成员、想新加入
    let room = match state.store.get(&code) {
        // 1. 全新房间——第一个进来的人就是 host
        None => {
            let room = Arc::new(Room::new(code.clone(), req.player_id.clone()));
            room.state.lock().add_player(&req.player_id, &req.name);
            state.store.insert(room.clone());
            room
        }
        Some(room) => {
            let already_in = room
                .state
                .lock()
                .players
                .iter()
                .any(|p| p.id == req.player_id);

            if already_in {
                // 2. 重连场景，addPlayer 自己处理 connected/alive 回滚
                room.state.lock().add_player(&req.player_id, &req.name);
                state.store.persist_and_maybe_archive(&room);
                room.notify();
                return Json(ActionResponse::ok());
            }

            // 3. 新玩家加入既有房间——先把准入条件验完
            {
                let g = room.state.lock();
                if req.as_host {
                    return Json(from_err(GameError::RoomExists));
                }
                if !matches!(g.phase, Phase::Waiting) {
                    return Json(from_err(GameError::GameInProgress));
                }
                if g.players.len() >= 4 {
                    return Json(from_err(GameError::RoomFull));
                }
                if g.has_player_name(&req.name) {
                    return Json(from_err(GameError::NameTaken));
                }
            }
            room.state.lock().add_player(&req.player_id, &req.name);
            room
        }
    };

    state.store.persist_and_maybe_archive(&room);
    room.notify();
    Json(ActionResponse::ok())
}

pub async fn start_game(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<PlayerIdOnly>,
) -> Json<ActionResponse> {
    let code = Store::sanitize_code(&raw_code);
    match state.store.mutate(&code, |g| g.start(&req.player_id)) {
        Ok(_) => Json(ActionResponse::ok()),
        Err(e) => Json(from_err(e)),
    }
}

pub async fn draw_tile(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<DrawRequest>,
) -> Json<ActionResponse> {
    let code = Store::sanitize_code(&raw_code);
    match state.store.mutate(&code, |g| g.draw_tile(&req.player_id, req.color)) {
        Ok(_) => Json(ActionResponse::ok()),
        Err(e) => Json(from_err(e)),
    }
}

pub async fn guess_tile(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<GuessRequest>,
) -> Json<ActionResponse> {
    let code = Store::sanitize_code(&raw_code);
    let Some(room) = state.store.get(&code) else {
        return Json(from_err(GameError::RoomNotFound));
    };
    // guess() 返回 reveal 信息，要在 notify 之前先单独广播一次
    // ——前端动画依赖独立的 reveal 事件，不是从 public state 里
    // 反推差异。所以这里没走 mutate。
    let reveal = {
        let mut g = room.state.lock();
        g.guess(&req.player_id, &req.target_player_id, &req.tile_id, req.number)
    };
    match reveal {
        Ok(reveal) => {
            room.emit_reveal(&reveal);
            state.store.persist_and_maybe_archive(&room);
            room.notify();
            Json(ActionResponse::ok())
        }
        Err(e) => Json(from_err(e)),
    }
}

pub async fn place_joker(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<PlaceJokerRequest>,
) -> Json<ActionResponse> {
    let code = Store::sanitize_code(&raw_code);
    match state
        .store
        .mutate(&code, |g| g.place_joker(&req.player_id, req.position))
    {
        Ok(_) => Json(ActionResponse::ok()),
        Err(e) => Json(from_err(e)),
    }
}

pub async fn decide_continue(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<ContinueRequest>,
) -> Json<ActionResponse> {
    let code = Store::sanitize_code(&raw_code);
    match state
        .store
        .mutate(&code, |g| g.decide_continue(&req.player_id, req.cont))
    {
        Ok(_) => Json(ActionResponse::ok()),
        Err(e) => Json(from_err(e)),
    }
}

pub async fn reset_game(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<PlayerIdOnly>,
) -> Json<ActionResponse> {
    let code = Store::sanitize_code(&raw_code);
    match state.store.mutate(&code, |g| g.reset(&req.player_id)) {
        Ok(_) => Json(ActionResponse::ok()),
        Err(e) => Json(from_err(e)),
    }
}

pub async fn leave_room(
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Json(req): Json<PlayerIdOnly>,
) -> Json<ActionResponse> {
    let code = Store::sanitize_code(&raw_code);
    let Some(room) = state.store.get(&code) else {
        // 房间已经清掉的话，leave 是 no-op，但别返回错——前端
        // 不在乎区分这两种情况
        return Json(ActionResponse::ok());
    };
    room.state.lock().leave(&req.player_id);
    state.store.persist_and_maybe_archive(&room);
    room.notify();
    state.store.cleanup(&code);
    Json(ActionResponse::ok())
}
