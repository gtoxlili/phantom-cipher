# syntax=docker/dockerfile:1.7
#
# 达芬奇密码 — Next.js 16 (App Router) + SSE multiplayer.
# Game state is purely in-memory (singleton on globalThis) — no
# persistent volume needed.
#
#   DOCKER_BUILDKIT=1 docker build -t davinci-game .
#   docker run -d --name davinci-game -p 3000:3000 davinci-game
#
# Final image is distroless (gcr.io/distroless/nodejs24-debian13) —
# ~80 MB, no shell, no package manager, no apt, no extra binaries.
# All build-time tooling (pnpm, panda, ts) lives in the alpine builder
# stage and is discarded.

ARG BUILD_IMAGE=node:alpine
ARG RUNTIME_IMAGE=gcr.io/distroless/nodejs24-debian13:nonroot
ARG PNPM_VERSION=latest

# --- base (build-time only) ----------------------------------------
FROM ${BUILD_IMAGE} AS base
ARG PNPM_VERSION
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PNPM_HOME=/pnpm \
    PATH="/pnpm:$PATH"
RUN corepack enable \
    && corepack prepare pnpm@${PNPM_VERSION} --activate

# --- deps: install full dep tree (incl. devDeps) for the build -----
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
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
# Cache .next/cache across builds — Next.js' compiled module graph
# survives rebuilds when source hasn't changed. (BuildKit cache is
# NOT committed into the image; the standalone bundle handles what's
# needed at runtime.)
RUN --mount=type=cache,target=/app/.next/cache \
    pnpm build
# Empty placeholder dir — copied into the runner so .next/cache exists
# with nonroot ownership for any runtime cache writes (no ISR is used,
# but Next can still touch it on startup).
RUN mkdir -p /tmp/runtime-cache

# --- runner: distroless --------------------------------------------
# No shell, no apt, no package manager. Only the Node binary and the
# app. Final image ~80 MB (vs ~100 MB on alpine, ~180 MB on slim).
FROM ${RUNTIME_IMAGE} AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Standalone bundle: server.js + trimmed node_modules + .next/server.
# .next/static and .next/cache live outside standalone — copy by hand
# with --chown so the nonroot user (uid 65532) can read/write them.
COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static
COPY --from=builder --chown=nonroot:nonroot /tmp/runtime-cache ./.next/cache

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
