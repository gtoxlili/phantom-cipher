# 怪盗密码 · WeChat Mini Program

Skyline 渲染的小程序版本——直连 `cipher.gtio.work` 后端，wire 跟 web 端一字不差（REST + msgpack-over-WebSocket）。

## 跑起来

1. 打开微信开发者工具，导入 `miniprogram/` 目录
2. AppID 已配置为 `wx66f2a554748f24ad`（在 `project.config.json` 里）
3. 调试模式下勾选「不校验合法域名」即可调通后端
4. 上线版需要在公众平台 → 开发管理 → 服务器域名 添加：
   - `request 合法域名`：`https://cipher.gtio.work`
   - `socket 合法域名`：`wss://cipher.gtio.work`

## 跟 web 版的差异

- **身份**：web 用 `inf-fingerprint` 算 visitor_id；小程序里没法跑 wasm，直接用本地 UUID 顶替（`davinci-fp-id`）。语义上"这台微信 = 一个玩家"，跟 web 的"这台浏览器 = 一个玩家"对齐
- **字体**：web 走 @fontsource 自托管 Bebas Neue / Inter / Oswald；小程序无法注入字体，全部用 PingFang SC 系统字 + italic 模拟那种衬线感
- **背景**：web 用 PNG halftone；小程序用纯 view + opacity 模拟，更轻
- **路由**：web 是 SPA hash 路由；小程序用 wx.navigateTo
- **toast**：web 用自家组件；小程序也是自家组件，没用 wx.showToast，避免破坏 P5 视觉调

## 文件分工

- `app.js / app.json / app.wxss` —— 入口、Skyline 配置、全局色板与关键帧
- `lib/`
  - `msgpack.js` —— 纯 JS msgpack 解码器，仅服务端→客户端方向
  - `ws.js` —— WebSocket 连接管理（重连、心跳）
  - `api.js` —— REST 动作客户端
  - `store.js` —— 全局响应式 store（订阅式）
  - `identity.js` —— 玩家 visitor_id（UUID v4）
  - `codenames.js` —— 随机代号 + 房间码生成
  - `util.js` —— 时间格式化等
- `pages/home/` —— 首页（创建/加入/玩法说明/排行榜入口）
- `pages/stats/` —— 排行榜
- `pages/room/` —— 对局主画面，下挂 13 个组件
- `components/`
  - `sketch/` —— P5 风格背景装饰（半调点、对角线条、星点、大问号）
  - `tile/` —— 数字牌组件
  - `deck/` —— 牌堆
  - `header/` —— 房间顶部（房间码 + 复制 + 重连提示 + 日志按钮）
  - `phase-banner/` —— 当前阶段红条幅
  - `player-row/` —— 玩家手牌行
  - `number-picker/` —— 选数字底部弹窗
  - `joker-placement/` —— 赖子放置弹窗
  - `reveal-overlay/` —— 翻牌结果浮层
  - `log-panel/` —— 对局日志侧边栏
  - `notifications/` —— 自定义 toast 队列
  - `name-prompt/` —— 入局前取代号
