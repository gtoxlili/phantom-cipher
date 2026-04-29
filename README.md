# 怪盗密码 · Phantom Cipher

浏览器即开即玩的多人**达芬奇密码**（*Da Vinci Code* / *Coda*）在线版。开局生成 4 字符房间码，分享给朋友就能开战；2-4 人对局，单局 5-30 分钟。

视觉走 **Persona 5 / 怪盗团**风格——红黑骨架 + 倾斜衬线 + 半调网点 + 漢字标语。

> **在线试玩**: [cipher.gtio.work](https://cipher.gtio.work) · [English version](./README.en.md)

![cover](frontend/public/og-image.png)

---

## 玩什么

24 块木牌：**黑色 0-11 + 白色 0-11 + 一对赖子**（黑白各一）。

发牌后每人手里 3-4 张，按从小到大排好（同数字时黑色在前），扣着面对所有人。每回合：

1. **抽**——从两堆牌堆挑一堆抽一张（如果是赖子还要选个位置塞进手里）
2. **猜**——指定某个对手的某张牌，报一个数字
   - 猜中 → 这张牌翻开摆在桌上，**继续**或**收手**自己选
   - 猜错 → 你刚抽的那张被强制亮明，回合结束让位
3. 谁的手牌全被翻明就出局。最后只剩一个人 = 胜利。

赖子不带数字，你猜的时候报"-"代表"我赌它就是赖子"。

---

## 技术栈

| 层 | 实现 |
| --- | --- |
| 后端 | Rust + axum + tokio + rusqlite (bundled) |
| 协议 | WebSocket，二进制帧用 MessagePack 编码 |
| 持久化 | 嵌入式 SQLite，WAL 模式，schema 见 `backend/src/db.rs` |
| 前端 | Solid.js + Vite + Panda CSS + solid-motionone |
| 字体 | @fontsource 自托管（Bebas Neue / Inter / Oswald），中文走系统字体（PingFang / 微软雅黑 / 思源黑体） |
| 部署 | distroless/cc 单二进制 ~5 MB，整镜像 ~40 MB |

### 关键架构选择

- **状态机就是一个 `Game` struct + `Mutex`**——`backend/src/game.rs` 是纯同步的 Rust，没有 actor、没有 channel；动作 / WS / 持久化分别是它外层的几个薄壳。
- **广播去重**：每次状态变更只 msgpack 序列化一次，结果包成 `Arc<Bytes>` 扇出给所有订阅者；私有手牌按人单独编码。
- **断线宽限**：WebSocket 关闭后服务端不立即 forfeit，给 30 秒等重连。同 pid 重新连进来取消定时器；超时则走 `Game::leave` 的同一条退出路径。
- **闲置房间清扫**：每 5 分钟扫一次，按相位 TTL（`waiting`/`ended` 1h，进行中 6h），有订阅者的房间自动跳过。
- **WS 自动重连**：客户端指数回退（800ms → 30s）+ ±25% jitter。1000/1001 干净关闭跳过；其他 close code 一律重连。
- **应用层心跳**：客户端 25s 一次空文本帧，扛 NAT / 反代 idle 超时。
- **SPA fallback 注入**：Rust 端按请求 Host 把 `og:image` 改写成绝对 URL，按 URL 把 `<title>` 写成"入局 · {房间码}"，让分享链接的卡片预览能看出哪个房间。

---

## 快速试玩

```bash
docker run -d --name phantom-cipher \
  --restart unless-stopped \
  --init \
  -p 33285:3000 \
  --memory 96m \
  --ulimit nofile=65535:65535 \
  -v phantom-cipher-data:/app/data \
  ghcr.io/gtoxlili/phantom-cipher:latest
```

打开 `http://localhost:33285`，开局，把 4 字符码丢给朋友。

### 环境变量

| 变量 | 默认 | 用途 |
| --- | --- | --- |
| `PORT` | 3000 | 容器内监听端口 |
| `DB_PATH` | `/app/data/phantom.db` | SQLite 文件路径 |
| `FRONTEND_DIST` | `/app/public` | 静态前端 dist |
| `RUST_LOG` | `info,phantom_cipher=info` | tracing 过滤 |

### 资源占用参考

- **空载**：~3 MB RSS / 0% CPU
- **100 房间在玩**：~60 MB RSS / <10% 单核
- 1 vCPU + 96m 内存的小机器能稳定承载 200-300 并发房间

---

## 部署到自己的机器

镜像已经构建好双架构（linux/amd64 + linux/arm64），CI 自动产出 `:latest` 和 `:sha-<short>` 两个 tag。

如果前面挂 nginx 反代（推荐），关键 location 块：

```nginx
# WebSocket 升级 + 不缓冲 + 长超时
location ~ ^/api/room/[A-Z0-9]+/ws$ {
    proxy_pass http://localhost:33285;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_buffering off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
}

# 其他全部透传，让 Rust 端自己决定 Cache-Control
location / {
    proxy_pass http://localhost:33285;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    # nginx 出口压缩，让上游不要再压一遍
    proxy_set_header Accept-Encoding "";
}
```

需要 `map $http_upgrade $connection_upgrade { default upgrade; '' close; }` 在 `http { }` 里定义好。

---

## 本地开发

需要 **Rust 1.95+**、**Node 24+**、**pnpm 10+**。

```bash
# 后端
cd backend
cargo run            # 监听 0.0.0.0:3000

# 前端（另开一个终端）
cd frontend
pnpm install
pnpm dev             # 监听 5173，/api 反代到 :3000

# 跑测试
cd backend && cargo test
```

前端 dev server 内置了 Vite 代理，把 `/api/*` 转发到后端 :3000；浏览器打开 `http://localhost:5173` 即可。生产构建：

```bash
cd frontend && pnpm build      # → frontend/dist/
cd backend && cargo build --release
FRONTEND_DIST=../frontend/dist ./backend/target/release/phantom-cipher
```

---

## 仓库结构

```
phantom-cipher/
├── backend/               Rust + axum
│   ├── src/
│   │   ├── main.rs        启动入口（env 配置 + 路由组装）
│   │   ├── game.rs        规则引擎（21 个单测覆盖）
│   │   ├── store.rs       房间注册表 + 广播 + Store::mutate
│   │   ├── db.rs          SQLite 持久化 + 归档
│   │   ├── routes/
│   │   │   ├── actions.rs REST 动作（join/start/draw/...）
│   │   │   ├── ws.rs      WebSocket 升级 + 读写循环
│   │   │   └── stats.rs   /api/stats
│   │   ├── spa.rs         SPA fallback + HTML 注入
│   │   ├── sweeper.rs     闲置房间清扫
│   │   ├── disconnect.rs  AFK forfeit 定时器
│   │   └── types.rs       wire 协议类型
│   └── Cargo.toml
├── frontend/              Solid.js + Vite
│   ├── src/
│   │   ├── main.tsx       入口 + 路由 + ErrorBoundary
│   │   ├── routes/        Home + Room
│   │   ├── components/    Sketch / Tile / room/*
│   │   ├── stores/        session / game / notifications
│   │   └── lib/           api（REST 客户端） + ws（WS+msgpack）
│   ├── public/            PWA 图标 / og-image / manifest
│   └── package.json
├── Dockerfile             三段式构建（Node + Rust + distroless/cc）
└── .github/workflows/
    └── docker-publish.yml CI（main 推送 → 双架构镜像）
```

---

## 协议字段

WebSocket 帧 = MessagePack 编码的 `{ t, d }` 对象，`t` 是单字符 tag：

| `t` | `d` 类型 | 含义 |
| --- | --- | --- |
| `p` | `PublicGameState` | 公共状态（所有人手牌的位置 + 显隐 + 当前回合） |
| `v` | `PrivateState` | 你自己的手牌（含未亮明的数字） |
| `r` | `RevealInfo` | 翻牌结果（猜测的目标 + 命中与否） |

REST 动作信封：`{ ok: true }` / `{ ok: false, error: "..." }`。错误信息直接是中文，前端 toast 出来。

详细类型见 `backend/src/types.rs` 和 `frontend/src/types.ts`。

---

## 玩家数据

`/api/stats` 返回 `{ totals, leaderboard, recent }`：累计对局数 / 累计玩家数 / 进行中房间数、按胜场排序的前 N、最近 N 局的简略信息。`Cache-Control: max-age=10`，前端做排行榜时直接拉这一个就够。

玩家身份用 **FingerprintJS** 算的浏览器指纹（visitorId），首次算完后 cache 在 **localStorage** 里。同一台机器同一个浏览器里——不管开几个标签页、关多少次 tab、清不清 cookie——排行榜上记的都是同一个玩家。

老实说几个边界：

- **共享设备会撞**——网吧 / 家里两个人轮流玩一台机器的话指纹相同
- **反指纹浏览器拒绝**——Brave / Firefox RFP / 部分 Safari 模式会让指纹库拿到一个退化结果，这种情况会自动 fallback 成 `crypto.randomUUID()` + localStorage（行为退化成"会跟踪当前浏览器，但浏览器之间各自独立"）
- **跨浏览器 / 跨设备认不出来**——指纹库不可能解决这个，要严格的多设备身份得做账号系统

**没有 cookie，没有账号**，整个鉴权信任就靠这个 visitorId——服务端拿到啥就认啥。Server-Action 安全模型仍然是"拿到 pid 的人 = 这个 pid 对应的玩家"，跟原版同。

---

## License

GPL-3.0。游戏规则借自 *Da Vinci Code*（若杉栄治 / バンソウ），本仓库只是软件实现。

视觉灵感来自 *Persona 5*（ATLUS）的 UI 语言；色板和排版自己重画的，不直接复用任何素材。
