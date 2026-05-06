//! stable_token 缓存。
//!
//! 微信 `cgi-bin/stable_token` 接口返回的 access_token 有 7200s 有效期，
//! 每分钟最多 10000 次调用。我们做内存级 SWR 缓存：
//!   - 每个 access_token 用到 expires_in - 300s（前 5 分钟）认作"快到期"
//!   - 第一个发现快到期的请求承担刷新责任，其余请求用旧 token 继续打
//!   - 刷新失败保留旧 token 继续兜底，避免微信侧抖动直接打瘫业务
//!
//! 拿不到 access_token 时所有依赖它的端点都回 503，前端按 fallback 处理。

use std::time::{Duration, Instant};
use tokio::sync::Mutex;

use super::WxAuth;

#[derive(Debug, Clone)]
struct TokenSlot {
    token: String,
    /// 算好的过期时间点，到点就需要刷新
    expires_at: Instant,
}

pub struct TokenCache {
    slot: Mutex<Option<TokenSlot>>,
    /// 单 flight 互斥：同一时刻只让一个协程去打微信换 token
    refresh_lock: Mutex<()>,
}

impl TokenCache {
    pub fn new() -> Self {
        Self {
            slot: Mutex::new(None),
            refresh_lock: Mutex::new(()),
        }
    }

    /// 拿当前 access_token。需要时自动刷新；带刷新失败兜底。
    pub async fn get(&self, wx: &WxAuth) -> anyhow::Result<String> {
        if !wx.enabled() {
            return Err(anyhow::anyhow!("WX_APPID / WX_SECRET 未配置"));
        }

        // 命中缓存且离过期还早：直接返回
        {
            let g = self.slot.lock().await;
            if let Some(s) = g.as_ref() {
                if s.expires_at > Instant::now() + Duration::from_secs(60) {
                    return Ok(s.token.clone());
                }
            }
        }

        // 抢刷新锁；拿不到说明别人正在刷
        let _guard = self.refresh_lock.lock().await;

        // 再读一次：可能上一个 refresh 已经把新 token 写好了
        {
            let g = self.slot.lock().await;
            if let Some(s) = g.as_ref() {
                if s.expires_at > Instant::now() + Duration::from_secs(60) {
                    return Ok(s.token.clone());
                }
            }
        }

        // 真去刷
        match Self::fetch_new(wx).await {
            Ok((token, expires_in)) => {
                let slot = TokenSlot {
                    token: token.clone(),
                    expires_at: Instant::now() + Duration::from_secs(expires_in.saturating_sub(60)),
                };
                let mut g = self.slot.lock().await;
                *g = Some(slot);
                Ok(token)
            }
            Err(e) => {
                // 刷新失败但旧 token 还能凑合用就先用着
                let g = self.slot.lock().await;
                if let Some(s) = g.as_ref() {
                    tracing::warn!(error = %e, "stable_token 刷新失败，临时复用旧 token");
                    return Ok(s.token.clone());
                }
                Err(e)
            }
        }
    }

    async fn fetch_new(wx: &WxAuth) -> anyhow::Result<(String, u64)> {
        #[derive(serde::Deserialize)]
        struct Resp {
            #[serde(default)]
            access_token: Option<String>,
            #[serde(default)]
            expires_in: Option<u64>,
            #[serde(default)]
            errcode: Option<i64>,
            #[serde(default)]
            errmsg: Option<String>,
        }

        let body = serde_json::json!({
            "grant_type": "client_credential",
            "appid": wx.appid,
            "secret": wx.secret,
        });

        let resp: Resp = wx
            .http
            .post("https://api.weixin.qq.com/cgi-bin/stable_token")
            .json(&body)
            .send()
            .await?
            .json()
            .await?;

        if let Some(token) = resp.access_token.filter(|s| !s.is_empty()) {
            let expires_in = resp.expires_in.unwrap_or(7200);
            return Ok((token, expires_in));
        }

        Err(anyhow::anyhow!(
            "stable_token errcode={} errmsg={}",
            resp.errcode.unwrap_or(-1),
            resp.errmsg.as_deref().unwrap_or("(no msg)"),
        ))
    }
}

/// 给端点处理函数用的快捷封装：拿到 token 或回 503。
pub async fn ensure_token(
    wx: &WxAuth,
) -> Result<String, (axum::http::StatusCode, axum::Json<serde_json::Value>)> {
    match wx.token.get(wx).await {
        Ok(t) => Ok(t),
        Err(e) => Err((
            axum::http::StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(serde_json::json!({
                "ok": false,
                "error": format!("微信 access_token 不可用: {e}"),
            })),
        )),
    }
}

