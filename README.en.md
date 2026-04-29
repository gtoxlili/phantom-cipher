# Phantom Cipher

A browser-native real-time multiplayer remake of **Da Vinci Code** (a.k.a. *Coda*) — the tile-deduction board game where you try to crack the hidden numbers in your opponents' hands. 2-4 players, ~5-30 minutes per round, dressed in a **Persona 5 / 怪盗団** visual style.

> **Live demo**: [cipher.gtio.work](https://cipher.gtio.work) · [中文 README](./README.md)

![cover](frontend/public/og-image.png)

---

## Stack

- **Backend**: Rust 1.95 + axum + tokio + rusqlite (bundled SQLite)
- **Wire**: WebSocket carrying MessagePack-encoded state pushes
- **Frontend**: Solid.js + Vite + Panda CSS + solid-motionone
- **Image**: distroless/cc, ~5 MB binary inside ~40 MB final image

The architecture is intentionally small: a `Game` struct guarded by a `Mutex` is the entire rule engine; HTTP handlers, WebSocket fan-out, and SQLite persistence are thin layers around it. Public-state serialization happens **once** per state change and the resulting bytes are reference-counted across all subscribers.

For a full architectural walkthrough, deployment notes, dev setup, and the wire protocol, see the **Chinese README** ([README.md](./README.md)) — that's the primary documentation since the audience is mostly mainland China users. The structure below mirrors what's there.

---

## Quick start

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

Then open `http://localhost:33285` and share the 4-character room code.

## Resource footprint

- **Idle**: ~3 MB RSS, 0% CPU
- **100 active rooms**: ~60 MB RSS, single-digit CPU on one vCPU

A 1 vCPU + 96m memory VPS comfortably hosts 200-300 concurrent rooms.

## Local development

Requires **Rust 1.95+**, **Node 24+**, **pnpm 10+**.

```bash
cd backend  && cargo run                  # backend on :3000
cd frontend && pnpm install && pnpm dev   # frontend on :5173, /api proxied to :3000
cd backend  && cargo test                 # 21 game-rule + path-parsing tests
```

## License

GPL-3.0. Game rules from *Da Vinci Code* (designed by Eiji Wakasugi, published by Kanai Factory / Bansou); this repo is a software implementation only.

Visual language inspired by *Persona 5* (ATLUS) — the palette and typography are redrawn from scratch and don't reuse any source assets.
