//! 断线宽限期定时器。
//!
//! WS 关闭后服务端不会立刻把人踢出局——给 30 秒等他刷新或重连。
//! 同 pid 重新连进来会取消这个定时器；超时则调用 `Game::leave`，
//! 走和点"返回"按钮一样的退出路径（自动跳过他这一回合 + 清牌）。

use crate::store::Store;
use dashmap::DashMap;
use std::sync::Arc;
use std::time::Duration;
use tokio::sync::Notify;

const FORFEIT_DELAY: Duration = Duration::from_secs(30);

#[derive(Default)]
pub struct DisconnectTimers {
    /// 用 `Arc<Notify>` 而不是 JoinHandle 是图代码简单——cancel
    /// 时只要 `notify_waiters()`，spawn 出去的那个 task 自己 select
    /// 就退出了，不用持有 handle 也不用单独维护"已取消"标志。
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

        // 抢断/反复断线时直接覆盖：先把上一个 timer 的 notify 触发掉
        if let Some((_, prev)) = self.cancels.remove(&key) {
            prev.notify_waiters();
        }

        let notify = Arc::new(Notify::new());
        self.cancels.insert(key.clone(), notify.clone());

        let timers = self.clone();
        tokio::spawn(async move {
            tokio::select! {
                _ = tokio::time::sleep(FORFEIT_DELAY) => {
                    // 30 秒到了人没回来——执行 forfeit
                    timers.cancels.remove(&key);
                    let _ = store.mutate(&code, |g| {
                        g.leave(&player_id);
                        Ok(())
                    });
                    // leave 之后房间可能空了，让 cleanup 决定要不要清
                    store.cleanup(&code);
                }
                _ = notify.notified() => {
                    // 被 cancel/replace 唤醒，什么都不用做直接退
                }
            }
        });
    }
}
