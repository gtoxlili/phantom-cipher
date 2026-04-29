//! 闲置房间清扫器。
//!
//! 关页面不会触发显式 leave，只会 markDisconnected——所以光靠玩家
//! 行为没办法把"开了房没人来"或者"重启之后所有人都没回来"的
//! 僵尸房间清掉。这里按相位分两档 TTL 兜底：
//!   - waiting / ended：1 小时（等待大厅 + 终局画面）
//!   - 进行中：6 小时（一局打两小时也算正常）
//!
//! 还有订阅者就跳过。启动时立即扫一次，之后每 5 分钟一轮。

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
