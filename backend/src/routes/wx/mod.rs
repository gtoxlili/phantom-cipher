//! 微信小程序后端代理 —— 凡是只能在服务端做的活儿（揣 AppSecret /
//! access_token）全部聚合到这一组路由下。
//!
//! 端点速查：
//!   POST /api/wx/login                wx.login() code → openid（公开）
//!   POST /api/wx/sec-check            msgSecCheck 文本合规检测
//!   POST /api/wx/subscribe-send       subscribeMessage.send 一次性推送
//!   GET  /api/wx/qrcode               getwxacodeunlimit 小程序码 PNG
//!   POST /api/wx/activity-create      updatableMessage 创建 activity_id
//!   POST /api/wx/updatable-msg-send   updatableMessage 推送状态变更
//!   POST /api/wx/shortlink            genwxashortlink 微信短链
//!   POST /api/wx/urllink              generate_urllink 跨平台 H5 链接
//!
//! 这一层共享一个 access_token 缓存（`token` 子模块），所有要带
//! `?access_token=` 的微信接口都走它，避免每次请求都重新换 token。

pub mod link;
pub mod login;
pub mod qrcode;
pub mod seccheck;
pub mod subscribe;
pub mod token;
pub mod updatable;

pub use link::{shortlink, urllink};
pub use login::login;
pub use qrcode::qrcode;
pub use seccheck::sec_check;
pub use subscribe::subscribe_send;
pub use token::TokenCache;
pub use updatable::{activity_create, updatable_msg_send};

#[derive(Clone)]
pub struct WxAuth {
    pub appid: String,
    pub secret: String,
    pub http: reqwest::Client,
    pub token: std::sync::Arc<TokenCache>,
}

impl WxAuth {
    pub fn new(appid: String, secret: String) -> Self {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(8))
            .build()
            .expect("reqwest client");
        Self {
            appid,
            secret,
            http,
            token: std::sync::Arc::new(TokenCache::new()),
        }
    }

    pub fn enabled(&self) -> bool {
        !self.appid.trim().is_empty() && !self.secret.trim().is_empty()
    }
}
