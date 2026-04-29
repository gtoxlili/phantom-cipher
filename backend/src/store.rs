//! 房间注册表 + 状态广播。
//!
//! 每个 `Room` 包一个 `parking_lot::Mutex<Game>`（规则机是同步的），
//! 加上一份 `DashMap` 存放每条 WebSocket 的发送端。
//!
//! 性能上唯一值得说的优化：
//!   公共状态每次 notify 只序列化一次，结果包成 `Arc<Bytes>`，再
//!   原子地把同一份字节扇出给所有订阅者——比起原 Node 版每个订阅者
//!   一次 JSON.stringify 至少省下一个数量级。
//!   私有状态本就因人而异（每人手牌不同），只能逐人序列化。

use crate::db::{self, ArchiveInput, ArchiveParticipant, DbPool};
use crate::game::{Game, GameError, GameResult};
use crate::types::{GameSnapshot, Phase, RevealInfo, ServerEvent};
use bytes::Bytes;
use dashmap::DashMap;
use parking_lot::Mutex;
use std::sync::Arc;
use tokio::sync::mpsc;

pub type Subscriber = mpsc::UnboundedSender<Arc<Bytes>>;

pub struct Room {
    pub code: String,
    pub state: Mutex<Game>,
    pub subscribers: DashMap<String, Subscriber>,
}

impl Room {
    pub fn new(code: String, host_id: String) -> Self {
        Self {
            code: code.clone(),
            state: Mutex::new(Game::new(code, host_id)),
            subscribers: DashMap::new(),
        }
    }

    pub fn from_snapshot(snap: GameSnapshot) -> Self {
        let code = snap.code.clone();
        Self {
            code,
            state: Mutex::new(Game::from_snapshot(snap)),
            subscribers: DashMap::new(),
        }
    }

    pub fn subscriber_count(&self) -> usize {
        self.subscribers.len()
    }

    /// 注册一个订阅者，立刻把当前的公共 + 自己的私有状态各推一帧
    /// 进它的 mpsc。返回的 Receiver 由 WS 任务消费写到 socket。
    pub fn subscribe(&self, player_id: &str) -> mpsc::UnboundedReceiver<Arc<Bytes>> {
        let (tx, rx) = mpsc::unbounded_channel();
        {
            let game = self.state.lock();
            if let Some(pub_bytes) = serialize_public(&game) {
                let _ = tx.send(Arc::new(pub_bytes));
            }
            if let Some(priv_bytes) = serialize_private_for(&game, player_id) {
                let _ = tx.send(Arc::new(priv_bytes));
            }
        }
        self.subscribers.insert(player_id.to_string(), tx);
        rx
    }

    pub fn unsubscribe(&self, player_id: &str) {
        self.subscribers.remove(player_id);
    }

    /// 把当前公共状态广播给所有订阅者，再附带一份各人自己的私有
    /// 状态。公共部分整体序列化一次。
    pub fn notify(&self) {
        let game = self.state.lock();
        let Some(pub_bytes) = serialize_public(&game) else {
            return;
        };
        let pub_arc: Arc<Bytes> = Arc::new(pub_bytes);
        for entry in self.subscribers.iter() {
            // 公共部分零拷贝复用，只是 Arc 计数 +1
            let _ = entry.value().send(pub_arc.clone());
            if let Some(priv_bytes) = serialize_private_for(&game, entry.key()) {
                let _ = entry.value().send(Arc::new(priv_bytes));
            }
        }
    }

    /// 翻牌结果广播。所有人收到的都是同一帧——客户端动画想要单独
    /// 一个事件，而不是从 public state 里去比对差异。
    pub fn emit_reveal(&self, info: &RevealInfo) {
        let bytes = match rmp_serde::to_vec_named(&ServerEvent::Reveal(info.clone())) {
            Ok(b) => Bytes::from(b),
            Err(_) => return,
        };
        let arc: Arc<Bytes> = Arc::new(bytes);
        for entry in self.subscribers.iter() {
            let _ = entry.value().send(arc.clone());
        }
    }
}

fn serialize_public(game: &Game) -> Option<Bytes> {
    rmp_serde::to_vec_named(&ServerEvent::Public(game.to_public_state()))
        .ok()
        .map(Bytes::from)
}

fn serialize_private_for(game: &Game, player_id: &str) -> Option<Bytes> {
    let priv_state = game.to_private_state(player_id)?;
    rmp_serde::to_vec_named(&ServerEvent::Private(priv_state))
        .ok()
        .map(Bytes::from)
}

// ---- Store ----------------------------------------------------------

pub struct Store {
    rooms: DashMap<String, Arc<Room>>,
    pub db: DbPool,
}

impl Store {
    pub fn new(db: DbPool) -> Self {
        Self {
            rooms: DashMap::new(),
            db,
        }
    }

    /// 启动时把磁盘上还在 rooms 表里的房间还原回内存。
    pub fn rehydrate(&self) {
        let snaps = db::load_all_room_snapshots(&self.db);
        let n = snaps.len();
        for snap in snaps {
            let code = snap.code.clone();
            self.rooms.insert(code, Arc::new(Room::from_snapshot(snap)));
        }
        if n > 0 {
            tracing::info!(rooms = n, "rehydrated rooms from disk");
        }
    }

    pub fn get(&self, code: &str) -> Option<Arc<Room>> {
        self.rooms.get(code).map(|r| r.clone())
    }

    pub fn insert(&self, room: Arc<Room>) {
        self.rooms.insert(room.code.clone(), room);
    }

    pub fn remove(&self, code: &str) {
        self.rooms.remove(code);
    }

    pub fn len(&self) -> usize {
        self.rooms.len()
    }

    /// 把房间码规整成大写六字符——同时服务用户输入容错和路由防御。
    pub fn sanitize_code(raw: &str) -> String {
        raw.trim().chars().take(6).collect::<String>().to_uppercase()
    }

    /// 房间空了就连同磁盘记录一起清掉。每次 leave 之后都会调一次。
    pub fn cleanup(&self, code: &str) {
        let should_drop = self
            .rooms
            .get(code)
            .map(|room| {
                let g = room.state.lock();
                g.players.is_empty() && room.subscribers.is_empty()
            })
            .unwrap_or(false);
        if should_drop {
            self.rooms.remove(code);
            db::delete_room(&self.db, code);
        }
    }

    /// 持久化房间快照，如果对局刚好走到 `ended` 还顺手归档。
    /// `archive_match` 是幂等的（matches 表上 UNIQUE(code, started_at)），
    /// 重复调用不会脏数据。
    pub fn persist_and_maybe_archive(&self, room: &Room) {
        let to_archive = {
            let game = room.state.lock();
            if matches!(game.phase, Phase::Ended) {
                game.started_at.map(|started| build_archive(&game, started))
            } else {
                None
            }
        };
        if let Some(archive) = to_archive {
            db::archive_match(&self.db, archive);
        }
        let snap = room.state.lock().to_snapshot();
        db::persist_room(&self.db, &snap);
    }

    /// 锁住房间状态、跑一次 mutation、自动 persist + notify。
    /// 所有动作（draw/guess/place/...）都从这里走，避免有人忘记
    /// 在 mutate 之后广播。
    pub fn mutate<F, T>(&self, code: &str, f: F) -> GameResult<T>
    where
        F: FnOnce(&mut Game) -> GameResult<T>,
    {
        let room = self.get(code).ok_or(GameError::RoomNotFound)?;
        let result = {
            let mut game = room.state.lock();
            f(&mut *game)?
        };
        self.persist_and_maybe_archive(&room);
        room.notify();
        Ok(result)
    }
}

fn build_archive(game: &Game, started_at: i64) -> ArchiveInput {
    let winner_name = game
        .winner_id
        .as_ref()
        .and_then(|wid| game.players.iter().find(|p| &p.id == wid))
        .map(|p| p.name.clone());
    let participants = game
        .players
        .iter()
        .map(|p| ArchiveParticipant {
            player_id: p.id.clone(),
            name: p.name.clone(),
            is_winner: game.winner_id.as_deref() == Some(&p.id),
            is_host: p.id == game.host_id,
        })
        .collect();
    ArchiveInput {
        code: game.code.clone(),
        winner_id: game.winner_id.clone(),
        winner_name,
        player_count: game.players.len(),
        started_at,
        ended_at: now_ms(),
        log: game.log.clone(),
        participants,
    }
}

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
