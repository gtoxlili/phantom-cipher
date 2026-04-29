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

# bookworm/debian12 → trixie/debian13 升级。生产宿主已经在跑 trixie，
# 编译机和 runtime 镜像也跟着 13，避免一台机器上各自 glibc 版本错位
# 引发的奇怪问题。alpine 不动——node 用 alpine 比任何 slim 变种都
# 小一截（53 MB vs 77 MB），首层拉镜像更快。
ARG RUST_IMAGE=rust:1.95-slim-trixie
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

# --- backend-builder: cargo --release with bundled SQLite -----------
FROM ${RUST_IMAGE} AS backend-builder
WORKDIR /build
# build-essential gives us cc/make/ar for libsqlite3-sys's bundled
# SQLite compile; pkg-config and ca-certificates round out anything
# build.rs scripts might need at compile time.
RUN apt-get update \
    && apt-get install -y --no-install-recommends pkg-config build-essential ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy manifest first to seed the dep build layer; subsequent
# code-only changes reuse the cached compile of all dependencies.
COPY backend/Cargo.toml backend/Cargo.lock* ./backend/
RUN mkdir -p backend/src && echo 'fn main() {}' > backend/src/main.rs
WORKDIR /build/backend
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,id=cargo-git,target=/usr/local/cargo/git \
    --mount=type=cache,id=cargo-target,target=/build/backend/target \
    cargo build --release

# Real source: rebuild only the binary, deps stay cached.
COPY backend/src ./src
RUN --mount=type=cache,id=cargo-registry,target=/usr/local/cargo/registry \
    --mount=type=cache,id=cargo-git,target=/usr/local/cargo/git \
    --mount=type=cache,id=cargo-target,target=/build/backend/target \
    touch src/main.rs \
    && cargo build --release \
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

# distroless/cc's ENTRYPOINT is empty; CMD is the binary.
CMD ["/app/phantom-cipher"]
