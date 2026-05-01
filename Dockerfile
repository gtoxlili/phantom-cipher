# syntax=docker/dockerfile:1.7
#
# phantom-cipher (experimental) — Rust backend + Solid frontend.
# Single static binary serves /api/* (REST + WebSocket/msgpack)
# and falls back to the Vite-built SPA shell for everything else.
# The image is `gcr.io/distroless/cc:nonroot` (~8 MB base) plus
# the ~5 MB phantom-cipher binary plus the ~200 KB frontend dist
# — final image fits under 15 MB, vs ~80 MB for the Node version.
#
#   DOCKER_BUILDKIT=1 docker build -t phantom-cipher .
#   docker run -d --name phantom-cipher \
#     -p 3000:3000 \
#     -v phantom-cipher-data:/app/data \
#     phantom-cipher

# RUST_IMAGE 用 cargo-chef 官方 image——内置 cargo-chef binary，配合
# planner / cook 两段实现 "依赖变了才重编 deps" 的精确层缓存。
# slim-trixie 变种：base 跟 distroless-cc-debian13 都是 trixie/glibc
# 2.41，编译机和 runtime 镜像同代，避免 glibc 错位的奇怪问题；slim
# 比 full 小 ~700 MB，缓存命中时拉镜像快。-rust- (无版本号) 浮动到
# 当前 stable Rust，可复现性交给 Cargo.lock + GHA layer cache。
# alpine 不动——node 用 alpine 比任何 slim 变种都小一截（53 MB vs
# 77 MB），首层拉镜像更快。
ARG RUST_IMAGE=lukemathwalker/cargo-chef:latest-rust-slim-trixie
ARG NODE_IMAGE=node:24-alpine
ARG RUNTIME_IMAGE=gcr.io/distroless/cc-debian13:nonroot

# --- frontend-builder: pnpm + vite + panda --------------------------
FROM ${NODE_IMAGE} AS frontend-builder
WORKDIR /build
# libc6-compat is needed because esbuild ships glibc binaries that
# alpine's musl can't load without it.
RUN apk add --no-cache libc6-compat \
    && npm install -g pnpm@latest
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm-store-fe,target=/root/.pnpm-store \
    pnpm install --frozen-lockfile
COPY frontend/ ./
# inf-fingerprint 限流豁免 key——CI 走 GitHub Secret，本地构建不
# 传则为空（identify() 会 omit apiKey 字段，依然可工作）。Vite 检测
# 到 VITE_ 前缀环境变量自动 inline 进 import.meta.env
ARG INF_FP_API_KEY=""
ENV VITE_INF_FP_API_KEY=$INF_FP_API_KEY
RUN pnpm build

# --- chef base: 系统依赖装一次，给 planner / backend-builder 共用 ---
# build-essential 给 libsqlite3-sys bundled SQLite 编译用 (cc/make/ar)；
# pkg-config + ca-certificates 给 build.rs 脚本兜底；mold 给 rustc 当
# 链接器（.cargo/config.toml 里的 -fuse-ld=mold 调用它），链接耗时
# 从几秒砍到亚秒级
FROM ${RUST_IMAGE} AS chef
WORKDIR /build/backend
RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config build-essential ca-certificates mold \
    && rm -rf /var/lib/apt/lists/*
# CI 日志走 GHA web UI，强制带色让 cargo warn/error 一眼看到
ENV CARGO_TERM_COLOR=always

# --- planner: 提取依赖指纹 recipe.json ------------------------------
# recipe.json 内容只看 Cargo.toml/Cargo.lock，src 改不动它——这就是
# 比手写 echo 'fn main(){}' 占位强的地方：cooker 层缓存命中只看依赖
# 是否真的动过，src 一字一句的改动都不会触发依赖重编
FROM chef AS planner
COPY backend/Cargo.toml backend/Cargo.lock* ./
COPY backend/src ./src
RUN cargo chef prepare --recipe-path recipe.json

# --- backend-builder: 先 cook 依赖（独立 layer），再编业务代码 -----
# target/ 故意不挂 cache mount——cargo chef cook 的产物要进 docker
# layer，配合 GHA cache-from 跨 runner 复用；挂 cache mount 反而会
# 把 target 锁在 builder 本机，CI 冷启动每次都得重跑 cook。
# registry/git 还是 cache mount，下载源码包能复用就复用
FROM chef AS backend-builder
# .cargo/config.toml 必须在 cook 之前就位——里面的 rustflags
# (target-cpu=x86-64-v3) 会进入 rustc 调用指纹，cook 跟 build 必须用
# 同一份 rustflags，否则 cargo 把 cook 编好的 deps 当作过期产物重编，
# cargo-chef 的缓存就废了。.cargo 改动频率低于 Cargo.toml，放最前面
COPY backend/.cargo ./.cargo
COPY --from=planner /build/backend/recipe.json ./
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,id=cargo-git,target=/usr/local/cargo/git \
    cargo chef cook --release --recipe-path recipe.json

COPY backend/Cargo.toml backend/Cargo.lock* ./
COPY backend/src ./src
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,id=cargo-git,target=/usr/local/cargo/git \
    cargo build --release \
    && cp target/release/phantom-cipher /tmp/phantom-cipher \
    && mkdir -p /tmp/runtime-data

# --- runner: distroless cc (glibc + ca-certs, no shell) -------------
FROM ${RUNTIME_IMAGE} AS runner
WORKDIR /app

ENV PORT=3000 \
    RUST_LOG=info,phantom_cipher=info \
    DB_PATH=/app/data/phantom.db \
    FRONTEND_DIST=/app/public

COPY --from=backend-builder --chown=nonroot:nonroot /tmp/phantom-cipher /app/phantom-cipher
COPY --from=frontend-builder --chown=nonroot:nonroot /build/dist /app/public
# Empty data dir with nonroot ownership — SQLite needs the parent
# to exist before creating the .db file. Mount a volume at /app/data
# in production to persist across container replacements.
COPY --from=backend-builder --chown=nonroot:nonroot /tmp/runtime-data /app/data

USER nonroot
EXPOSE 3000
VOLUME ["/app/data"]

# distroless/cc 没 shell，没法靠 CMD 接 `docker run image --some-flag`
# 这种参数转发——ENTRYPOINT 直接把后续参数喂给 binary 才是惯用法
ENTRYPOINT ["/app/phantom-cipher"]
