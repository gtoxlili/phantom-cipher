//! Idle-room sweeper — port of lib/sweeper.ts.
//!
//! Phase-aware TTL: 1h for waiting/ended (lobbies, scoreboards),
//! 6h for in-flight games. Runs every 5 minutes plus an immediate
//! pass at boot (to clean up anything left behind by a previous
//! process).

use crate::db;
use crate::store::Store;
use std::sync::Arc;
use std::time::Duration;
use tokio::time;

const WAITING_TTL_MS: i64 = 60 * 60 * 1_000;
const ACTIVE_TTL_MS: i64 = 6 * 60 * 60 * 1_000;
const SWEEP_INTERVAL: Duration = Duration::from_secs(5 * 60);

pub fn spawn(store: Arc<Store>) {
    tokio::spawn(async move {
        // Immediate sweep on boot, then every interval.
        sweep_once(&store);
        let mut ticker = time::interval(SWEEP_INTERVAL);
        ticker.tick().await; // first tick fires immediately; consume.
        loop {
            ticker.tick().await;
            sweep_once(&store);
        }
    });
}

fn sweep_once(store: &Store) {
    let now = now_ms();
    let candidates = db::list_stale_room_codes(&store.db, now, WAITING_TTL_MS, ACTIVE_TTL_MS);
    if candidates.is_empty() {
        return;
    }
    let mut removed = 0;
    let mut skipped = 0;
    for code in &candidates {
        if let Some(room) = store.get(code) {
            if room.subscriber_count() > 0 {
                skipped += 1;
                continue;
            }
        }
        store.remove(code);
        db::delete_room(&store.db, code);
        removed += 1;
    }
    if removed > 0 {
        tracing::info!(
            removed,
            skipped,
            "sweeper: removed {removed} idle room(s) (skipped {skipped})"
        );
    }
}

fn now_ms() -> i64 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
