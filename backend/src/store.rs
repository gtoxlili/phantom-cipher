//! Room registry + broadcast wiring.
//!
//! Each Room wraps a `parking_lot::Mutex<Game>` (the rule engine
//! is sync) plus a `DashMap` of subscriber channels — one mpsc
//! per connected WebSocket. The hot-path optimization that makes
//! this rewrite earn its keep:
//!
//!   - Public state: serialized **once** per notify(), the
//!     resulting `Bytes` is fanned out to all subscribers via
//!     reference-counted `Arc`. Node sent N JSON.stringify calls
//!     per broadcast; we send 1 + N zero-copy ref bumps.
//!
//!   - Private state: serialized per-player (it has to be — each
//!     player sees their own hand) but each subscriber gets only
//!     their own `Arc`, no allocation duplication.
//!
//! The WebSocket task drains its mpsc and writes binary frames;
//! it never holds the Game lock.

use crate::db::{self, ArchiveInput, ArchiveParticipant, DbPool};
use crate::game::{Game, GameError, GameResult};
use crate::types::{Phase, ServerEvent};
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

    pub fn from_snapshot(snap: crate::types::GameSnapshot) -> Self {
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

    /// Register a subscriber and immediately push them the current
    /// public + their own private state. Returns the receiving end
    /// of an mpsc the caller (the WS task) drains and writes to
    /// the wire.
    pub fn subscribe(&self, player_id: &str) -> mpsc::UnboundedReceiver<Arc<Bytes>> {
        let (tx, rx) = mpsc::unbounded_channel();
        // Initial state push (msgpack frames).
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

    /// Re-broadcast public state to everyone, plus per-player
    /// private. Pre-serializes public exactly once.
    pub fn notify(&self) {
        let game = self.state.lock();
        let Some(pub_bytes) = serialize_public(&game) else {
            return;
        };
        let pub_arc: Arc<Bytes> = Arc::new(pub_bytes);
        for entry in self.subscribers.iter() {
            // Cheap: Arc clone is one atomic increment.
            let _ = entry.value().send(pub_arc.clone());
            if let Some(priv_bytes) = serialize_private_for(&game, entry.key()) {
                let _ = entry.value().send(Arc::new(priv_bytes));
            }
        }
    }

    /// One-shot reveal broadcast — same payload to everyone, no
    /// per-player customization.
    pub fn emit_reveal(&self, info: &crate::types::RevealInfo) {
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
    let pub_state = game.to_public_state();
    rmp_serde::to_vec_named(&ServerEvent::Public(pub_state))
        .ok()
        .map(Bytes::from)
}

fn serialize_private_for(game: &Game, player_id: &str) -> Option<Bytes> {
    let priv_state = game.to_private_state(player_id)?;
    rmp_serde::to_vec_named(&ServerEvent::Private(priv_state))
        .ok()
        .map(Bytes::from)
}

// ---------- Store ----------

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

    pub fn each<F: FnMut(&Arc<Room>)>(&self, mut f: F) {
        for entry in self.rooms.iter() {
            f(entry.value());
        }
    }

    /// Drop empty rooms — called after each leave. Mirrors the
    /// gameStore.cleanup() behavior of the original.
    pub fn cleanup(&self, code: &str) {
        let drop = if let Some(room) = self.rooms.get(code) {
            let game = room.state.lock();
            game.players.is_empty() && room.subscribers.is_empty()
        } else {
            return;
        };
        if drop {
            self.rooms.remove(code);
            db::delete_room(&self.db, code);
        }
    }

    /// Persist the room's current snapshot, plus archive the match
    /// if it just ended. Idempotent — archive_match has a UNIQUE
    /// constraint so duplicate calls are no-ops.
    pub fn persist_and_maybe_archive(&self, room: &Room) {
        let snap = {
            let game = room.state.lock();
            let snap = game.to_snapshot();
            // Archive if game is in 'ended' phase + has a started_at.
            if matches!(game.phase, Phase::Ended) {
                if let Some(started_at) = game.started_at {
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
                    let input = ArchiveInput {
                        code: game.code.clone(),
                        winner_id: game.winner_id.clone(),
                        winner_name,
                        player_count: game.players.len(),
                        started_at,
                        ended_at: now_ms(),
                        log: game.log.clone(),
                        participants,
                    };
                    drop(game);
                    db::archive_match(&self.db, input);
                    return self.persist_room_only(room);
                }
            }
            snap
        };
        db::persist_room(&self.db, &snap);
    }

    fn persist_room_only(&self, room: &Room) {
        let snap = room.state.lock().to_snapshot();
        db::persist_room(&self.db, &snap);
    }
}

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

pub fn sanitize_code(raw: &str) -> String {
    raw.trim().chars().take(6).collect::<String>().to_uppercase()
}

// ---------- High-level mutation entrypoint ----------
//
// All Server-Action equivalents go through `with_room` so that
// persistence + notify always happen together after a successful
// mutation. Rust's borrow checker forces the lock-then-mutate-then-
// release pattern, which prevents the action layer from forgetting
// to broadcast.

pub fn with_room<F, T>(store: &Store, code: &str, f: F) -> GameResult<T>
where
    F: FnOnce(&mut Game) -> GameResult<T>,
{
    let room = store.get(code).ok_or(GameError::RoomNotFound)?;
    let result = {
        let mut game = room.state.lock();
        f(&mut *game)?
    };
    store.persist_and_maybe_archive(&room);
    room.notify();
    Ok(result)
}
