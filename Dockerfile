# syntax=docker/dockerfile:1.7
#
# 达芬奇密码 — Next.js 16 (App Router) + SSE multiplayer.
# In-flight rooms, finished matches, and player profiles are persisted
# via node:sqlite (the built-in SQLite shipped with Node 22+; stable
# in Node 24). DB file lives at /app/data/phantom.db — mount a volume
# there to keep data across container replacements.
#
#   DOCKER_BUILDKIT=1 docker build -t davinci-game .
#   docker run -d --name davinci-game -p 3000:3000 \
#     -v phantom-data:/app/data davinci-game
#
# Final image is distroless (gcr.io/distroless/nodejs24-debian13) —
# ~80 MB, no shell, no package manager, no apt, no extra binaries.
# All build-time tooling (pnpm, panda, ts) lives in the alpine builder
# stage and is discarded. node:sqlite is part of the Node binary, so
# no native module is added to the runtime image.

# Build image pinned to Node 24 alpine to match the runtime distroless
# image's Node major. Override at build time if needed:
#   docker build --build-arg BUILD_IMAGE=node:lts-alpine .
ARG BUILD_IMAGE=node:24-alpine
ARG RUNTIME_IMAGE=gcr.io/distroless/nodejs24-debian13:nonroot
ARG PNPM_VERSION=latest

# --- base (build-time only) ----------------------------------------
# pnpm is installed via npm rather than via corepack — the latest
# `node:alpine` images dropped corepack from the default bundle, so
# `corepack enable` blows up with "command not found". `npm i -g pnpm`
# is one extra layer but works on every Node Docker image.
FROM ${BUILD_IMAGE} AS base
ARG PNPM_VERSION
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH"
RUN npm install -g pnpm@${PNPM_VERSION}

# --- deps: install full dep tree (incl. devDeps) for the build -----
FROM base AS deps
WORKDIR /app
# panda.config.ts is needed alongside package files because the `prepare`
# script (panda codegen) runs after `pnpm install` and would otherwise
# fail with ERR_PANDA_CONFIG_NOT_FOUND. Codegen only reads the config
# itself (not the source it references in `include`), so this is enough
# to satisfy the hook and produces a complete styled-system/ folder.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml panda.config.ts ./
# devDeps (panda, types, ts) are needed at build time. Override
# NODE_ENV so any postinstall hook reading it doesn't decide it's
# production and skip them.
ENV NODE_ENV=development
# BuildKit cache mount for pnpm's content-addressable store — survives
# across `docker build` invocations, so unchanged deps don't redownload.
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# --- builder: panda codegen + next build ---------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js bakes `metadataBase` (used by og:image / twitter:image and
# friends) into statically-prerendered pages at build time. Without
# this, CI builds — which don't ship the gitignored .env.production
# — would emit share-card URLs against `localhost:3477` and every
# WeChat / Twitter / iMessage preview would be broken. Override at
# build time with `--build-arg SITE_URL=...` if you fork to a
# different domain.
ARG SITE_URL=https://cipher.gtio.work
ENV SITE_URL=${SITE_URL}
# Cache .next/cache across builds — Next.js' compiled module graph
# survives rebuilds when source hasn't changed. (BuildKit cache is
# NOT committed into the image; the standalone bundle handles what's
# needed at runtime.)
RUN --mount=type=cache,target=/app/.next/cache \
    pnpm build
# Empty placeholder dirs — copied into the runner so .next/cache and
# data/ exist with nonroot ownership before the app boots. distroless
# has no shell to mkdir at runtime, and SQLite needs the parent dir
# to exist before it'll create the .db file.
RUN mkdir -p /tmp/runtime-cache /tmp/runtime-data

# --- runner: distroless --------------------------------------------
# No shell, no apt, no package manager. Only the Node binary and the
# app. Final image ~80 MB (vs ~100 MB on alpine, ~180 MB on slim).
FROM ${RUNTIME_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DB_PATH=/app/data/phantom.db

# Standalone bundle: server.js + trimmed node_modules + .next/server.
# .next/static, public/, and .next/cache live outside standalone —
# copy by hand with --chown so the nonroot user (uid 65532) can
# read/write them. public/ holds the PWA icons + manifest assets.
# data/ is the SQLite directory; mount a volume there in production
# to survive container replacement.
COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static
COPY --from=builder --chown=nonroot:nonroot /app/public ./public
COPY --from=builder --chown=nonroot:nonroot /tmp/runtime-cache ./.next/cache
COPY --from=builder --chown=nonroot:nonroot /tmp/runtime-data ./data

VOLUME ["/app/data"]

USER nonroot

EXPOSE 3000

# No HEALTHCHECK on purpose. distroless has no shell / wget / curl, so
# the only option would be `node -e <http probe>` — that forks a fresh
# Node process every interval (~30-50 MB transient, ~150 ms startup)
# for very little signal on a single-process in-memory app. If the
# process dies, Docker sees the non-zero exit anyway, and any real
# orchestrator (k8s liveness, LB probe, uptime monitor) does this
# better from outside the container.

# distroless ENTRYPOINT is already ["/nodejs/bin/node"], so CMD just
# passes the script.
CMD ["server.js"]
