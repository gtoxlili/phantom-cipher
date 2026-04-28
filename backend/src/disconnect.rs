//! AFK forfeit timers — port of lib/disconnect-timers.ts.
//!
//! When a WebSocket closes, schedule a `leave()` call after a grace
//! window (30s). A same-pid reconnect cancels the timer before it
//! fires. Forfeits use the existing `Game::leave` path so the
//! per-phase semantics (auto-out + advance turn vs. just remove
//! from waiting) stay identical to the original behavior.

use crate::store::{self, Store};
use dashmap::DashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Notify;

const FORFEIT_DELAY: Duration = Duration::from_secs(30);

#[derive(Default)]
pub struct DisconnectTimers {
    /// Each entry holds a Notify that, when triggered, cancels the
    /// pending forfeit. Storing Notify instead of JoinHandle lets us
    /// keep the spawn ergonomics simple (the task is fire-and-forget).
    cancels: DashMap<String, Arc<Notify>>,
}

impl DisconnectTimers {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn cancel(&self, code: &str, player_id: &str) {
        let key = format!("{code}:{player_id}");
        if let Some((_, notify)) = self.cancels.remove(&key) {
            notify.notify_waiters();
        }
    }

    pub fn schedule(self: &Arc<Self>, store: Arc<Store>, code: String, player_id: String) {
        let key = format!("{code}:{player_id}");
        // Replace any existing timer (idempotent on rapid disconnect/reconnect bursts).
        if let Some((_, prev)) = self.cancels.remove(&key) {
            prev.notify_waiters();
        }
        let notify = Arc::new(Notify::new());
        self.cancels.insert(key.clone(), notify.clone());

        let timers = self.clone();
        tokio::spawn(async move {
            tokio::select! {
                _ = tokio::time::sleep(FORFEIT_DELAY) => {
                    // Forfeit fires.
                    timers.cancels.remove(&key);
                    if let Some(room) = store.get(&code) {
                        let _ = store::with_room(&store, &code, |g| {
                            g.leave(&player_id);
                            Ok(())
                        });
                        // After leave the room may be empty — let cleanup decide.
                        store.cleanup(&code);
                        let _ = room;
                    }
                }
                _ = notify.notified() => {
                    // Cancelled by reconnect.
                }
            }
        });
    }
}
