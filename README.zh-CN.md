# Phantom Cipher · 怪盗密码

浏览器原生、实时多人版的 **达芬奇密码**（《Da Vinci Code》/《Coda》）数字推理桌游，配上一身 **女神异闻录 5（Persona 5）** 风的视觉。打开链接、共享一个 4 字符房间码，2–4 人就能在一两分钟里互相破译对方的密码。

> **在线试玩：** [cipher.gtio.work](https://cipher.gtio.work/) · English README: [README.md](./README.md)

![Phantom Cipher 封面](public/og-image.png)

---

## 这是什么

**怪盗密码**是一个单页 Web 应用，承载 2–4 位玩家的达芬奇密码对局。没有原生客户端、没有账号体系、没有匹配大厅 —— 房主开局生成 4 字符密码，其他人输入密码即可入局。游戏状态保存在服务器进程内存里，玩家通过 Server-Sent Events（SSE）拿到实时更新，整套通讯不依赖 WebSocket。

界面同时上中英双语：中文负责叙事氛围（"持密码入局"、"赖子"、"亮明示众"），英文承担装饰排版（`TAKE THEIR CIPHER`、`JOKER`、`▶︎`）。手机和桌面用同一份布局，超过 768 px 时会额外加载一层"杂志装饰"——罗马数字、垂直斜体条、半调色调胶带等等，但不会改变任何对局区。

### 一回合是怎么打的

整副 24 张牌：**黑色 0–11、白色 0–11、加上两张赖子（黑白各一）**。发完牌之后，轮到的玩家：

1. **抽牌**：从黑/白牌堆任选一堆抽一张，先藏起来不亮。
2. **猜数**：宣告对手某张未亮的牌的数字（例如"你左数第三张黑牌是 7"，赖子用 `-` 来宣告）。
3. **命中**：被猜中的牌翻明亮出。
4. **失手**：你刚抽的那张牌反而要翻明示众，回合结束。
5. 命中之后可继续猜，也可以收手把暂置牌藏入手中、保留这一手信息差。

所有数字牌按"数字升序、同数黑前白后"维持牌序，所以每张牌的位置本身就是一条信息。如果抽到赖子，回合会暂停一下，由抽牌人决定把赖子塞到手里哪个位置；一旦定下来，这一格就被锁定到对局结束。

最后还有牌没被全部翻明的玩家，胜出。

---

## 为什么写这个

达芬奇密码本身是个完美的 5 分钟推理小品，但市面上能找到的数字版要么是付费手游、要么是只剩功能没有美术的简陋大厅、要么被埋在某个综合桌游平台里。**怪盗密码**做的事很简单：尽量小、尽量"打开就能玩"、尽量像和朋友坐在沙发上随手开一局，除了发个链接以外不需要任何前置准备。

P5 风格是有意为之的。原桌游本质上是带运气调和的诈唬游戏，"换上心" / "拿走他们的密码" 这层叙述刚好把整套机制读成"怪盗 vs 怪盗"的对峙。它不是一个 P5 的同人游戏，**它是一个穿着红黑配色出门的达芬奇密码客户端**。

---

## 技术栈

| 分层 | 选型 | 备注 |
| --- | --- | --- |
| 框架 | Next.js 16（App Router、Turbopack）| `output: 'standalone'`，开启 React Compiler |
| UI 运行时 | React 19 | `react-compiler` 插件接管大部分 `memo`/`useCallback` |
| 状态 | Jotai + jotai-immer | 一个派生 `gameViewAtom` 收敛重渲染范围 |
| 样式 | Panda CSS | 编译期原子化抽取，design token 在 `panda.config.ts` |
| 动效 | `motion`（Framer Motion 后续版本）| 页面切换、面板抽屉、卡牌翻面 |
| 图标 | `@phosphor-icons/react` | 通过 `optimizePackageImports` 摇树 |
| 实时 | Server-Sent Events | 每个玩家一条流，15 秒心跳保活反向代理 |
| 持久化 | 无 | 状态全部存在 `globalThis`，房间空了就回收 |
| 身份 | `sessionStorage`（Jotai `atomWithStorage`）| 同一标签页内刷新保留，跨标签不保留 |
| 容器 | Distroless `nodejs24-debian13:nonroot` | 镜像约 80 MB、无 shell、以 uid 65532 运行 |

没有数据库、没有 Redis、没有消息队列、没有 Service Worker。一个 Node 进程承载整个世界。**重启服务器 = 所有进行中的房间重置**——这是为了换"一个文件就能部署"刻意接受的代价。

### 一些值得展开的工程细节

- **`Game` 类是唯一的真相源**（`lib/game.ts`）。所有状态变更都走 Server Action，前端永远不直接写状态。一次方法调用对应一次广播快照，调和（reconciliation）几乎不存在。
- **公开/私有快照分离**。`toPublicState` 会把所有未亮明的数字剥掉；每个订阅者另外拿到一份 `toPrivateState(myId)`，只包含自己的手牌。处于 *placing* 阶段的赖子，**位置不会**写进公共流——避免对手在你按下确定前就偷看到你打算插哪。
- **PWA 快捷方式**（`app/manifest.ts`）。Android / Chrome OS 上长按主屏图标会出现"创建棋局"和"持密码入局"两个直达入口，URL 参数在 `app/page.tsx` 挂载时一次性消费。
- **Hydration 安全壳**（`components/room/RoomClient.tsx`）。"是否已设过昵称"的分支需要读 `sessionStorage`，服务器看不到——通过 `mounted` 门把这块逻辑卡到客户端，避免用 `suppressHydrationWarning` 糊过去带来的隐性偏差。
- **微信链接卡片兼容**（`app/layout.tsx`）。1200×1200 实底背景的 OG 图，外加旧的 `<meta name="image">` 与 `msapplication-TileImage`——一些不读 OG 的爬虫只认这两个。
- **故意不写 Service Worker**。SSE + 纯服务端状态意味着没有任何"离线可用"的内容值得缓存；只要 manifest + HTTPS 就足够装到主屏。

---

## 本地运行

需要：**Node 20+**（CI / Docker 用 Node 24），**pnpm**。

```bash
pnpm install
pnpm dev          # http://localhost:3477
```

`dev` / `build` 都会先跑一遍 `panda codegen` 生成 `styled-system/`。如果 clone 完编辑器立刻报缺依赖，单独跑一次 `pnpm prepare` 即可。

### 生产构建

```bash
pnpm build
pnpm start        # http://localhost:3477
```

### Docker 部署

`Dockerfile` 是三段式 distroless 构建，BuildKit 缓存挂载 pnpm-store。最终镜像约 80 MB，以非 root 用户运行：

```bash
DOCKER_BUILDKIT=1 docker build -t phantom-cipher .
docker run -d --name phantom-cipher -p 3000:3000 phantom-cipher
```

打开 <http://localhost:3000> 即可。

### 环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `SITE_URL` | `http://localhost:3477` | 给 `metadataBase` 设源站，决定 `og:image` / `twitter:image` 等相对路径解析到哪个域名。生产记得设。 |
| `PORT` | `3000`（Docker）/ `3477`（dev） | 标准 Node 端口。 |

没有任何密钥、第三方 API key。

---

## 目录结构

```
app/
  api/room/[code]/stream/   SSE 接入点 — 每位玩家一路连接
  room/[code]/              房间路由（服务端组件 → RoomClient）
  layout.tsx                元数据、字体、OG / Twitter 标签
  manifest.ts               PWA manifest，含 shortcuts 快捷动作
  page.tsx                  首页 — 创建 / 加入 / 玩法说明
components/
  Sketch.tsx                P5 风背景装饰（半调、胶带、漢字）
  Tile.tsx                  数字牌 + 赖子图形 + 状态动效
  room/                     Header、牌堆、动作区、对手列、日志、赖子放置等
lib/
  game.ts                   核心规则引擎（唯一的状态机）
  game-store.ts             基于 globalThis 的房间注册表
  actions.ts                Server Actions（join / draw / guess / place / continue / reset / leave）
  atoms.ts                  Jotai 原子图 + 派生 gameViewAtom
  hooks/                    useGameStream / useGameActions / useRoomBootstrap / usePlayerId
  codenames.ts              SHUFFLE 名单（Phantom Thieves + 怪盗主题别名）
  types.ts                  共享类型（Tile、PublicGameState、Phase 等）
panda.config.ts             Design tokens + 关键帧
Dockerfile                  三段式 distroless 构建
```

---

## 常见疑问

**这是 Persona 5 的衍生作品吗？**
不是。这是一个达芬奇密码（Coda）客户端，在排版、色板、动效语言上致敬了 P5。游戏机制和原桌游 1:1 对齐。

**为什么没有账号 / 匹配？**
2–4 人朋友局根本不需要账号。4 字符密码比用户名更短，5 分钟一局打完即弃就好。

**为什么用 SSE 而不是 WebSocket？**
通讯本身就是单向的（服务器 → 客户端），所有玩家输入都是 Server Action POST。SSE 在所有 CDN 和企业代理上都是"普通 HTTP 长连接"，不需要 sticky session、客户端断线自动重连、零库存。

**iOS Safari / 微信内置浏览器能用吗？**
能。iOS Safari 16+ 支持 SSE 和"添加到主屏幕"；微信里走分享链接进入正常。微信里的卡片渲染只能尽力而为——没有公众号 + JS-SDK 的站点，微信的 H5 卡片策略未文档化、不稳定，这跟页面本身没有关系。

**能自己部署一份吗？**
能，唯一的要求是有一个能开 HTTPS 的 Node 20+ 环境（不然 `EventSource` 在公网上连不上）。推荐直接用 Dockerfile。

**状态会持久化吗？**
不会。房间状态故意只活在进程内存里，重启即丢。一局通常活不过 5 分钟，加持久化只会带来与玩法不成比例的运维成本。

---

## 参与贡献

欢迎小而专注的 PR，附一句"为什么改"的动机即可。两条家规：

1. **所有阶段切换都必须经过 `lib/game.ts`**。如果你正在路由处理函数或组件里直接改状态，那你已经走错门了。
2. **不要轻易引入 Service Worker、数据库或消息队列**——除非多人模型本身彻底变形。单进程设计是部署故事的承重墙。

---

## 许可

[GNU GPL v3.0](./LICENSE)。仓库内不包含任何 Persona、ATLUS、Sega 的官方素材；色板、版式与排印只是致敬而非衍生。

---

## 致谢

- **达芬奇密码 / Coda**：原桌游设计 *若杉荣二*（Eiji Wakasugi），由 *Kosaido* 于 2002 年出版。
- **视觉语言**：受 *Persona 5*（ATLUS, 2016）启发。所有商标归原权利人所有。
- 代号池取自 Phantom Thieves 与"怪盗"主题词，欢迎在 `lib/codenames.ts` 中替换成你战队自己的称号。
