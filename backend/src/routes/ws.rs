//! 每位玩家一条 WebSocket，承载所有状态推送（msgpack 二进制帧）。
//!
//! 升级路径：
//!   1. 校验房间和玩家身份，403/404 这层就拦掉
//!   2. 取消还在跑的 forfeit 定时器（同 pid 重连）
//!   3. 翻 connected=true 标志，状态变了就广播一帧
//!   4. 升级，spawn 一个发送任务把 mpsc 里的字节灌进 socket
//!   5. close 时反过来：unsubscribe + connected=false + 重排
//!      forfeit + 房间空了清掉

use super::SharedState;
use crate::store::Room;
use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use bytes::Bytes;
use serde::Deserialize;
use std::sync::Arc;

#[derive(Deserialize)]
pub struct WsParams {
    pub pid: String,
}

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<SharedState>,
    Path(raw_code): Path<String>,
    Query(params): Query<WsParams>,
) -> Response {
    let code = crate::store::Store::sanitize_code(&raw_code);
    let pid = params.pid;

    let Some(room) = state.store.get(&code) else {
        return (StatusCode::NOT_FOUND, "room not found").into_response();
    };

    // 房间存在不代表你是房间成员——再核一次
    {
        let g = room.state.lock();
        if !g.players.iter().any(|p| p.id == pid) {
            return (StatusCode::FORBIDDEN, "not in room").into_response();
        }
    }

    // 同一个 pid 重新连进来，把还在跑的 forfeit 定时器取消掉
    state.disconnect.cancel(&code, &pid);

    // 翻 connected=true。如果原来就是 false（重启 rehydrate 后
    // 默认就是 false），broadcast 一次让队友看到我回来了
    let was_disconnected = room.state.lock().mark_connected(&pid);
    if was_disconnected {
        room.notify();
    }

    // close 时要做的事都得 move 进 upgrade 回调
    let store = state.store.clone();
    let timers = state.disconnect.clone();
    let code_close = code.clone();
    let pid_close = pid.clone();
    let room_close = room.clone();

    ws.on_upgrade(move |socket| async move {
        run_ws(socket, room_close.clone(), pid.clone()).await;

        // 走到这说明 WS 已经关了——可能是客户端关页面、可能是
        // 网络断、也可能是同 pid 第二个 tab 把 subscriber 抢了
        room_close.unsubscribe(&pid_close);
        room_close.state.lock().mark_disconnected(&pid_close);
        timers.schedule(store.clone(), code_close.clone(), pid_close);
        store.cleanup(&code_close);
    })
}

/// 单个 WS 的读 + 写循环。
///
/// 写循环单独在一个 spawn task 里，从 `room.subscribe` 拿到的
/// mpsc Receiver 不停拉字节往 socket 灌；读循环只是消费 ping/pong/
/// close——客户端不会主动发任何业务消息，所有 mutation 都走 POST。
async fn run_ws(socket: WebSocket, room: Arc<Room>, pid: String) {
    use futures::{SinkExt, StreamExt};
    let (mut sender, mut receiver) = socket.split();
    let mut rx = room.subscribe(&pid);

    let send_task = tokio::spawn(async move {
        while let Some(arc_bytes) = rx.recv().await {
            // Bytes 自己就是 Arc 计数的，clone 等于 +1
            let frame: Bytes = (*arc_bytes).clone();
            if sender.send(Message::Binary(frame)).await.is_err() {
                break;
            }
        }
        let _ = sender.close().await;
    });

    while let Some(msg) = receiver.next().await {
        match msg {
            Ok(Message::Close(_)) | Err(_) => break,
            // ping/pong/binary/text 都不期待，但要消费掉别让协议栈卡住
            Ok(_) => {}
        }
    }
    send_task.abort();
}
