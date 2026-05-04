//! 微信小程序后端代理 —— 凡是只能在服务端做的活儿（揣 AppSecret /
//! access_token）全部聚合到这一组路由下。
//!
//! 端点速查：
//!   POST /api/wx/login           wx.login() code → openid（公开）
//!   POST /api/wx/sec-check       msgSecCheck 文本合规检测
//!   POST /api/wx/subscribe-send  subscribeMessage.send 推送
//!   GET  /api/wx/qrcode          getwxacodeunlimit 小程序码 PNG
//!
//! 这一层共享一个 access_token 缓存（`token` 子模块），所有要带
//! `?access_token=` 的微信接口都走它，避免每次请求都重新换 token。

pub mod login;
pub mod qrcode;
pub mod seccheck;
pub mod subscribe;
pub mod token;

pub use login::login;
pub use qrcode::qrcode;
pub use seccheck::sec_check;
pub use subscribe::subscribe_send;
pub use token::TokenCache;

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
