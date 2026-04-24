# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

# ── Stage 1: turbo prune (race-server 전용 workspace 추출) ──────────────────
FROM base AS pruner

WORKDIR /app

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm dlx turbo@^2 prune @yeon/race-server --docker

# ── Stage 2: install dependencies ───────────────────────────────────────────
FROM base AS deps

WORKDIR /app

COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── Stage 3: production runner ──────────────────────────────────────────────
FROM deps AS runner

WORKDIR /app

COPY --from=pruner /app/out/full/ .

ENV NODE_ENV=production
ENV PORT=2567

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs race

USER race

EXPOSE 2567

CMD ["pnpm", "--filter", "@yeon/race-server", "start"]
