# 微信服务端 API · 待对接清单

> 后端 (`backend/src/routes/wx/*`) 已经实现的端点里，目前**还没有任何客户端消费**的部分。
> 收录这份清单是为了让接手的同学不用再翻一遍 commit 历史就能直接对接。

所有端点都共用同一份 `WxAuth`（`backend/src/main.rs` onLaunch 时从环境变量 `WX_APPID` / `WX_SECRET` 读取）和 `stable_token` 缓存（`wx/token.rs`）。`WX_APPID` / `WX_SECRET` 任一为空时所有端点直接 503，客户端按 fallback 处理。

---

## 已经在用的端点（参考用，不是对接清单）

| 端点 | 调用方 | 文件 |
| --- | --- | --- |
| `POST /api/wx/login` | miniprogram | `miniprogram/lib/identity.js` |
| `POST /api/wx/sec-check` | miniprogram | `miniprogram/lib/wx.js` → home / name-prompt 提交昵称 |
| `GET  /api/wx/qrcode` | miniprogram | `miniprogram/components/qrcode-overlay/` |
| `POST /api/wx/shortlink` | miniprogram | `miniprogram/components/header/` 复制邀请文本 |

Web 前端 (`frontend/`) 不消费任何 `/api/wx/*` —— 它不是小程序环境。

---

## 待对接 1 · 订阅消息推送（`subscribeMessage.send`）

**最有业务价值的一条，建议优先**：转牌时给"轮到 X 的回合"等待中的玩家推一条订阅消息。回合制游戏的留存利器。

### 客户端（小程序）—— 已经有半截脚手架

`miniprogram/lib/wx.js` 已经写好 `subscribeOnce(templateIds)`：调 `wx.requestSubscribeMessage` 让用户授权。但没人调用它，需要：

1. 在公众平台后台 → 订阅消息 → 我的模板 申请一个**一次性模板**
   - 类目要跟"游戏 / 工具"匹配
   - 内容字段建议：玩家昵称 (thing) + 房间码 (character_string) + 回合提示 (thing) + 时间戳 (time)
2. 拿到 template_id 后，写到 `app.js` `globalData.templateTurnId = '...'`
3. 玩家进房后某个时机（如点开局 / 自己第一次出手），调一次：
   ```js
   const wxapi = require('./lib/wx');
   await wxapi.subscribeOnce([getApp().globalData.templateTurnId]);
   ```
   一次授权用户能收一次推送。要持续推就每回合再 prompt 一次（用户会觉得烦，建议改成"长期订阅模板"，类目限制更严但不用反复同意）。

### 服务端 —— 需要改 `backend/src/game.rs` 触发点

后端端点 `POST /api/wx/subscribe-send` 只是个透传层，业务触发逻辑要写到游戏状态机里。建议位置：

```rust
// backend/src/game.rs - advance_turn() 切换 current_idx 后
// 拿到新 current player 的 openid (= player.id)，调 wx 模块发推送
```

调用形态（参考 `wx/subscribe.rs` 的请求体）：

```json
POST /api/wx/subscribe-send
{
  "openid": "玩家的 openid",
  "template_id": "TEMPLATE_TURN_NOTIFICATION",
  "page": "pages/room/room?code=ABCD",
  "miniprogram_state": "trial",
  "data": {
    "thing1":             { "value": "MILADY" },
    "character_string2":  { "value": "ABCD" },
    "thing3":             { "value": "你的回合，请尽快出手" }
  }
}
```

字段名按申请到的模板对齐。

**关键约束**：
- 一次授权一次推。后端要存一个 `(openid, template_id) → remaining_count` 的小记账表，发完就减；用完了就静默不再发，等用户再次授权
- 这部分 schema 暂时没写（DB 可以加张 `subscribe_grants` 表，或者塞内存即可——授权窗口短，进程级缓存就够）

---

## 待对接 2 · 动态分享卡（updatableMessage）

转发出去的小程序卡片可以**活的**，对局推进时所有持卡的人看到的卡同步刷新。

### 流程

1. 客户端进房后调后端拿 activity_id
2. 服务端把 activity_id 存到 `Game` struct
3. 客户端 `wx.updateShareMenu` 时把 activity_id 喂进去
4. 玩家转发 → 朋友收到的卡是动态的
5. 后端在 `phase` 切换时（waiting → drawing / drawing → ended）调 update 推 `target_state`：
   - 1 = 进行中
   - 2 = 即将过期
   - 3 = 已结束

### 客户端要做的

```js
// 1. 拿 activity_id（24h 有效，需要持久化以备转发使用）
wx.request({
  url: apiBase + '/api/wx/activity-create',
  method: 'POST',
  data: {},  // 不传 openid 就是公开模式（任何人都能转发）
  success: (res) => {
    const activityId = res.data.activity_id;
    // 2. 让分享菜单走动态消息
    wx.updateShareMenu({
      withShareTicket: true,
      isUpdatableMessage: true,
      activityId,
      templateInfo: {
        templateId: '<你申请的动态消息模板 id>',
        parameterList: [
          { name: 'member_count', value: '1' },
          { name: 'room_limit',   value: '4' },
        ],
      },
    });
  },
});
```

### 服务端要做的

`backend/src/game.rs` 的 `phase` 切换处调用 `/api/wx/updatable-msg-send`：

```json
POST /api/wx/updatable-msg-send
{
  "activity_id":  "<step 1 拿到的>",
  "template_id":  "<动态消息模板 id>",
  "target_state": 1,
  "version_type": 0,
  "parameter_list": [
    { "name": "member_count", "value": "3" },
    { "name": "room_limit",   "value": "4" }
  ]
}
```

**关键约束**：
- activity_id 24h 后过期。Game 状态机里要存 `(activity_id, expires_at)`，过期了重新拿
- `version_type` 正式版填 `0`，开发/体验版填 `1` / `2`
- 模板申请：公众平台后台 → 群聊互动 → 动态消息模板。类目限制比订阅消息更严

---

## 待对接 3 · URL Link（H5 跳小程序）

跨平台分享路径：把进入小程序的链接生成出来给**非微信渠道**（短信、邮件、外站 H5）拉用户回小程序。

### 何时用

- 微信内分享：用 `onShareAppMessage`（卡片）或 `/api/wx/shortlink`（已接，wxaurl.cn 短链）
- **外站 / SMS / 邮件分享**：`/api/wx/urllink`，生成的链接是 `weixin://...` 协议的加密 URL

### 客户端调用形态

```js
const res = await wx.request({
  url: apiBase + '/api/wx/urllink',
  method: 'POST',
  data: {
    path:  '/pages/room/room',
    query: 'code=ABCD',
    env_version: 'release',
    expire_type: 1,             // 1 = 临时 / 0 = 永久
    expire_interval: 86400 * 7, // 7 天
  },
});
// res.data.url_link → 可粘贴到任何外部场景的链接
```

**典型场景**：玩家把局码 SMS 给朋友。点开链接 → 系统拉起微信 → 直达房间。比 `wxaurl.cn` 短链对外站更友好。

---

## 待对接 4 · 配额运维（getApiQuota / clearQuota）

不是业务向，是运维兜底。当某个微信接口被打爆当日额度时拿来诊断 / 清零。

### 何时用

- 监控告警发现 sec-check 返回 45011（频次超限）→ 调 `/api/wx/quota-get` 看实际额度
- 真撑不住了 → `/api/wx/quota-clear`（每月最多 10 次）

### 直接 curl 调即可，不需要客户端 UI

```bash
# 查 sec-check 当日剩余 / 速率上限
curl -X POST https://cipher.gtio.work/api/wx/quota-get \
  -H 'content-type: application/json' \
  -d '{"cgi_path":"/wxa/msg_sec_check"}'

# 清零（生效一次扣一次月度配额，慎用）
curl -X POST https://cipher.gtio.work/api/wx/quota-clear \
  -H 'content-type: application/json' \
  -d '{}'   # 不传 appid 就是清自家
```

---

## 不打算做的（按需求评估后跳过）

| 端点 | 跳过原因 |
| --- | --- |
| `getuserriskrank` | 要 X.509 证书 + AES256-GCM 加密签名，本游戏无支付/资金/敏感操作，风险等级用不上 |
| `media_check_async` | 异步 + 要在公众平台配 message server XML 推送回调，且游戏里没有用户上传图片/音频 |
| `customerServiceMessage` | 没有客服 UI 入口 |
| `analysis.getDailyVisitTrend` / `getUserPortrait` | 自家 `/api/stats` 已经覆盖核心业务指标 |
| `realtimelogSearch` | 要客户端 `wx.getRealtimeLogManager` 大量埋点配合 |
| `getuserphonenumber` | 游戏不要手机号 |

---

## 端点速查

```
POST /api/wx/login                wx.login() code → openid          [已用]
POST /api/wx/sec-check            msg_sec_check 文本合规             [已用]
GET  /api/wx/qrcode               getwxacodeunlimit 小程序码 PNG     [已用]
POST /api/wx/shortlink            genwxashortlink 微信短链           [已用]

POST /api/wx/subscribe-send       subscribeMessage.send             [待接 1]
POST /api/wx/activity-create      updatableMessage 创建 activity_id [待接 2]
POST /api/wx/updatable-msg-send   updatableMessage 推状态变更        [待接 2]
POST /api/wx/urllink              generate_urllink H5 跳小程序       [待接 3]
POST /api/wx/quota-get            openapi/quota/get 查 API 额度      [运维]
POST /api/wx/quota-clear          clear_quota 清 API 额度            [运维]
```

实现细节看 `backend/src/routes/wx/<name>.rs`，每个文件顶部注释写了字段约束和坑点。
