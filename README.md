# Phantom Cipher · 怪盗密码

A browser-native, real-time multiplayer remake of the **Da Vinci Code** (a.k.a. *Coda*) tile-deduction board game, dressed in a **Persona 5**-inspired visual language. Open a link, share a 4-character room code, and four people deduce each other's hidden tiles in under a minute.

> **Live demo:** [cipher.gtio.work](https://cipher.gtio.work/) · 中文说明见 [README.zh-CN.md](./README.zh-CN.md)

![Phantom Cipher cover](public/og-image.png)

---

## What this is

**Phantom Cipher** is a single-page web app that hosts 2–4 player matches of Da Vinci Code. There is no native client, no account, no matchmaking lobby — the host creates a room, everyone else types the code, and the game starts. Game state lives in process memory on the server (with an embedded SQLite store mirroring snapshots for crash recovery and post-game stats); players connect over Server-Sent Events for sub-second updates without WebSockets.

Both languages share the UI: Chinese copy carries the storytelling, English carries the chrome (`TAKE THEIR CIPHER`, `JOKER`, `▶︎`). Every screen is the same on phone and desktop — the layout breakpoint pulls in extra magazine ornaments above 768 px (Roman numerals, vertical italic strips, halftone tape) without rearranging gameplay surfaces.

### How a round plays out

The 24-tile deck is **0–11 in black + 0–11 in white + two jokers (one per color)**. After deal, a player on their turn:

1. **Draws** one tile from either color pile and keeps it secret.
2. **Calls** a number against an opponent's still-hidden tile (e.g. *"your 3rd black is a 7"*; jokers are called as `-`).
3. On a hit, the called tile flips face-up; on a miss, the drawer's freshly-drawn tile is exposed instead.
4. After a hit, the player chooses to press on or pocket the draw and end the turn.

Tiles are kept in canonical order — black before white when numbers tie — so an opponent's positions leak ordering information. Drawing a joker pauses the round and asks the drawer to slot it anywhere in their hand; once anchored, that slot is fixed for the rest of the game.

The last player with at least one tile still hidden wins.

---

## Why it exists

Da Vinci Code is a perfect 5-minute deduction game, but every digital version I could find was either a paid mobile port, a bare-bones lobby UI, or buried inside a generic board-game platform. Phantom Cipher is the smallest, most opinionated build that just **opens, runs, and looks good** — close to how I'd want to play it on a couch with friends, with no setup beyond a shared link.

The Persona 5 aesthetic is intentional: the original game is mostly luck-mitigated bluffing, and the *jacking the heart* / *take their cipher* framing nudges the on-screen vocabulary toward a thief-vs-thief read of the same mechanics. It isn't a Persona fan project — it's a Da Vinci Code client that happens to dress in red and black.

---

## Stack

| Layer | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) | `output: 'standalone'`, React Compiler enabled |
| UI runtime | React 19 | `react-compiler` plugin removes most manual `memo`/`useCallback` |
| State | Jotai + jotai-immer | One derived `gameViewAtom` keeps render fan-out small |
| Styling | Panda CSS | Atomic, build-time-extracted; tokens in `panda.config.ts` |
| Motion | `motion` (Framer Motion successor) | Page/panel transitions, tile flips, sheet drawers |
| Icons | `@phosphor-icons/react` | Tree-shaken via `optimizePackageImports` |
| Realtime | Server-Sent Events | One stream per player; 15-second heartbeat keeps proxies open |
| Persistence | `node:sqlite` (built into Node 22+, stable in Node 24) | Active rooms snapshotted on every action; finished matches archived for stats |
| Identity | `sessionStorage` (Jotai `atomWithStorage`) | Survives reloads inside a tab, not across tabs |
| Container | Distroless `nodejs24-debian13:nonroot` | ~80 MB final image, no shell, runs as uid 65532 |

No external Redis, no Postgres, no message broker, no service worker. A single Node process holds the world; an embedded SQLite file (`data/phantom.db`) mirrors it just enough to survive a deploy. Because `node:sqlite` ships inside the Node binary, the distroless image gains zero new native dependencies — same ~80 MB footprint, same `nonroot` user.

### Notable engineering details

- **`Game` class as the source of truth** (`lib/game.ts`). All mutations flow through Server Actions; no client ever writes state directly. Re-running a `Game` method always produces the same broadcast snapshot, so reconciliation is trivial.
- **Public vs. private snapshots**. `toPublicState` strips face-down numbers; each subscriber additionally gets `toPrivateState(myId)` containing their own hand. Pending joker positions are *withheld* from the public stream during placement so opponents don't get a peek before you decide.
- **Persistence is a thin mirror, not a layer above the game** (`lib/db.ts`). Mutations stay on `Game`; the action layer (`lib/actions.ts`) calls `persistRoom(game.toSnapshot())` after each successful step and `archiveMatch(...)` on transition to `ended`. On boot, `gameStore` rehydrates every row from the `rooms` table back into memory (with `connected: false` until clients re-attach over SSE).
- **Idempotent archival.** The `matches` table has a `UNIQUE(code, started_at)` constraint and the insert is `ON CONFLICT DO NOTHING RETURNING id` — so a player rejoining a finished game (or a restart of the process) re-runs `archiveMatch` harmlessly. Player counters in `players` only bump on the canonical insert path.
- **PRAGMA tuning.** WAL journal mode + `synchronous = NORMAL` + 5-second busy timeout. Game-action throughput is microseconds in JS and well under SQLite's WAL ceiling for a single writer.
- **Idle-room sweeper** (`lib/sweeper.ts`, registered from `instrumentation.ts`). Every 5 minutes the server lists rooms whose `updated_at` is past a phase-aware TTL — 1 hour for `waiting`/`ended`, 6 hours for in-flight — and evicts them from both the in-memory store and the `rooms` table. Rooms with active SSE subscribers are skipped, so a connected (but idle) game keeps living. Without this, closing a tab without explicit leave would accumulate zombie rooms forever, since `markDisconnected` deliberately keeps the player in the `players` array.
- **PWA shortcuts** (`app/manifest.ts`). Long-press the home-screen icon on Android/Chrome OS for direct *Create* and *Join* actions; URL params are read once on mount in `app/page.tsx`.
- **Hydration-safe shell** (`components/room/RoomClient.tsx`). The "have I named myself yet?" branch reads from `sessionStorage`, which the server can't see — we mount-gate to avoid the predictable mismatch instead of paving over it with `suppressHydrationWarning`.
- **WeChat-tolerant share previews** (`app/layout.tsx`). 1200×1200 OG image with a solid background, plus the legacy `<meta name="image">` and `msapplication-TileImage` tags that some non-OG crawlers still rely on.
- **No service worker on purpose.** SSE plus pure server-state means there is nothing useful to cache offline; installability is enough for the home-screen affordance.

---

## Run it locally

Requirements: **Node 20+** (Node 24 used in CI/Docker), **pnpm**.

```bash
pnpm install
pnpm dev          # http://localhost:3477
```

The `dev`/`build` scripts run `panda codegen` first to regenerate `styled-system/`. If your editor screams about missing imports right after a fresh clone, run `pnpm prepare` once.

### Production build

```bash
pnpm build
pnpm start        # http://localhost:3477
```

### Docker

The `Dockerfile` is a three-stage distroless build with a BuildKit pnpm-store cache mount. Final image is ~80 MB and runs as a non-root user. Mount a volume at `/app/data` to persist the SQLite store across container replacements.

```bash
DOCKER_BUILDKIT=1 docker build -t phantom-cipher .
docker run -d --name phantom-cipher -p 3000:3000 \
  -v phantom-data:/app/data \
  phantom-cipher
```

Open <http://localhost:3000>.

### Environment variables

| Var | Default | Purpose |
| --- | --- | --- |
| `SITE_URL` | `http://localhost:3477` | Sets `metadataBase` so `og:image`, `twitter:image`, and other relative URLs resolve to the right origin. Set this in production. |
| `DB_PATH` | `data/phantom.db` (dev) / `/app/data/phantom.db` (Docker) | SQLite file path. Set to `:memory:` to opt out of persistence (tests, ephemeral demos). |
| `PORT` | `3000` (Docker) / `3477` (dev) | Standard Node port. |

No secrets, no third-party API keys.

### Stats endpoint

`GET /api/stats?leaderboard=20&recent=20` returns:

```jsonc
{
  "totals":      { "matches": 42, "players": 17, "in_flight": 1 },
  "leaderboard": [{ "id": "uuid", "display_name": "JOKER", "matches_played": 8, "matches_won": 5, "win_rate": 0.625 }, ...],
  "recent":      [{ "id": 42, "code": "AB12", "winner_name": "FOX", "player_count": 3, "ended_at": 1745700000000, "duration_ms": 312000 }, ...]
}
```

`Cache-Control` is set to a 10-second max-age so a stats page can refresh without hammering the DB. There is no UI shipped on top yet — that's the next layer of work, and consumers can build their own from this endpoint in the meantime.

---

## Project layout

```
app/
  api/room/[code]/stream/   SSE endpoint — one connection per player
  api/stats/                Read-only leaderboard / totals / recent matches
  room/[code]/              Room route (server component → RoomClient)
  layout.tsx                Metadata, fonts, OG/Twitter tags
  manifest.ts               PWA manifest with shortcuts
  page.tsx                  Landing — create / join / how-to
components/
  Sketch.tsx                P5-style background ornaments (halftone, tape, kanji)
  Tile.tsx                  Numbered tile + joker glyph + state animations
  room/                     Header, deck, action zone, opponents, log, joker sheet, etc.
lib/
  game.ts                   Core rule engine (the only place phase transitions live)
  game-store.ts             In-memory room registry on globalThis; rehydrates from db
  db.ts                     node:sqlite singleton + schema + read/write helpers
  sweeper.ts                Periodic idle-room eviction (5-min interval, phase-aware TTL)
  actions.ts                Server Actions (join, draw, guess, place, continue, reset, leave)
  atoms.ts                  Jotai atom graph + derived gameViewAtom
  hooks/                    useGameStream, useGameActions, useRoomBootstrap, usePlayerId
  codenames.ts              Shuffle pool (Phantom Thieves + 怪盗-themed names)
  types.ts                  Shared types (Tile, PublicGameState, GameSnapshot, etc.)
instrumentation.ts          Next.js server-start hook that boots the sweeper
panda.config.ts             Design tokens + keyframes
Dockerfile                  Three-stage distroless build (mounts /app/data volume)
```

---

## FAQ

**Is this a Persona 5 game?**
No. It is a Da Vinci Code (Coda) client with a P5-influenced visual treatment — typography, color palette, motion language. Mechanics are 1:1 with the boardgame.

**Why no accounts or matchmaking?**
Two-to-four player private games among friends don't benefit from accounts. A 4-character code is shorter than a username and disposable in 5 minutes.

**Why Server-Sent Events instead of WebSockets?**
The protocol is one-way (server → client) by design — every input is a Server Action POST. SSE tunnels through every CDN and corporate proxy on the planet without any sticky-session configuration, and reconnects without library code on the client.

**Does it work on iOS Safari / WeChat in-app browser?**
Yes. iOS Safari 16+ for installability and SSE; WeChat for joining via shared link. Share-card rendering inside WeChat is best-effort because WeChat's H5 link-preview behavior is undocumented and unstable for sites without an Official Account.

**Can I host my own instance?**
Yes — the only requirement is a Node 20+ environment that can speak HTTPS (otherwise `EventSource` won't connect from the field). The Dockerfile is the recommended deploy path.

**Does state persist?**
Yes — to a local SQLite file (`data/phantom.db`). Active rooms are snapshotted after every Server Action, so a deploy or crash mid-game rehydrates the round on the next boot. Finished matches are archived for stats. The DB is single-file, embedded (`node:sqlite`, no native module), and can be opted out with `DB_PATH=:memory:`.

**Why SQLite and not Postgres / Redis / a hosted DB?**
The single-Node-process design is load-bearing for the deploy story. SQLite — specifically the built-in `node:sqlite` shipped with Node 22+ — gives us crash recovery and historical data without adding a second service to run, a network hop on the hot path, or a native module to compile for the distroless image. WAL mode handles the read/write pattern of a single writer plus a handful of leaderboard readers without breaking a sweat.

**Can I scale this to multiple replicas?**
Not as-is. Game state is partitioned by Node process, and SQLite is single-writer per file. If you need horizontal scale, the smallest viable upgrade is to swap `lib/db.ts` for libSQL with embedded replicas (or move to Postgres) and put a sticky-session ingress in front of the SSE endpoint. None of that is wired up here.

---

## Contributing

PRs welcome — small, focused, with a clear gameplay or polish motivation. Two house rules:

1. **All phase transitions go through `lib/game.ts`.** If you find yourself mutating state from a route handler or component, you've taken a wrong turn.
2. **Don't reach for a service worker, a database, or a message broker** unless the multiplayer model genuinely changes shape. The single-process design is load-bearing for the deployment story.

---

## License

[GNU GPL v3.0](./LICENSE). The codebase contains no Persona, ATLUS, or Sega assets — colors, layouts, and typographic vocabulary are an homage, not a derivative work.

---

## Credits

- **Da Vinci Code / Coda** — base game design by *Eiji Wakasugi*, published by *Kosaido* (2002).
- **Visual language** — inspired by *Persona 5* (ATLUS, 2016). All trademarks belong to their respective owners.
- Codename pool draws on Phantom Thieves and 怪盗 fiction; substitute your crew's names freely in `lib/codenames.ts`.
