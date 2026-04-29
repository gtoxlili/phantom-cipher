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
use axum::extract::ws::{CloseCode, CloseFrame, Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use bytes::Bytes;
use serde::Deserialize;
use std::sync::Arc;

// 自定义 close code（WebSocket 协议把 4000-4999 留给应用自定义）。
// 客户端按这两个 code 区分要不要重连——之前一律走默认 1000，
// "网络抖动我自己关你"和"你被同 pid 的新连接顶替了"两种场景在
// 客户端看来一样，导致网络抖动场景下客户端不重连、UI 卡死。
const CLOSE_REPLACED: CloseCode = 4000; // 客户端不该重连
const CLOSE_SEND_FAILED: CloseCode = 4001; // 客户端应该重连

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
        // 退出原因决定 close code，客户端据此决定是否重连
        let close = loop {
            match rx.recv().await {
                None => {
                    // mpsc tx 被 drop——大概率是同 pid 新连接把
                    // subscribers map 里的 entry 替换掉了。告诉
                    // 客户端"你被替了，别重连"
                    break CloseFrame {
                        code: CLOSE_REPLACED,
                        reason: "replaced".into(),
                    };
                }
                Some(arc_bytes) => {
                    // Bytes 自己就是 Arc 计数的，clone 等于 +1
                    let frame: Bytes = (*arc_bytes).clone();
                    if sender.send(Message::Binary(frame)).await.is_err() {
                        // 写失败——TCP 半开 / 网络抖动 / 客户端
                        // 没接住。让客户端重连
                        break CloseFrame {
                            code: CLOSE_SEND_FAILED,
                            reason: "send_failed".into(),
                        };
                    }
                }
            }
        };
        let _ = sender.send(Message::Close(Some(close))).await;
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
