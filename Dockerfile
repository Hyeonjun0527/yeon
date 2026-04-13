# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

# ── Stage 1: turbo prune ──────────────────────────────────────────────────────
# @yeon/web에 필요한 workspace 패키지만 추출한다.
# 새 packages/* 가 생겨도 이 단계가 자동으로 포함하므로 Dockerfile을 수정하지 않아도 된다.
FROM base AS pruner

WORKDIR /app

COPY . .

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm dlx turbo@^2 prune @yeon/web --docker

# ── Stage 2: install dependencies ────────────────────────────────────────────
FROM base AS deps

WORKDIR /app

# turbo prune 결과의 json/ 에는 필요한 package.json 파일만 포함된다.
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile

# ── Stage 3: build ───────────────────────────────────────────────────────────
FROM deps AS builder

WORKDIR /app

COPY --from=pruner /app/out/full/ .
COPY voice-test-data/test-counseling.mp3 ./voice-test-data/test-counseling.mp3
COPY "voice-test-data/상담기록_테스트음성_20분.mp3" "./voice-test-data/상담기록_테스트음성_20분.mp3"
COPY voice-test-data/test-bootcamp-counseling-1hour.mp3 ./voice-test-data/test-bootcamp-counseling-1hour.mp3

ENV NEXT_TELEMETRY_DISABLED=1

# 플랫폼에 따라 워크플로우에서 --build-arg NODE_MEMORY=<value> 로 조정한다.
ARG NODE_MEMORY=4096

RUN mkdir -p apps/web/public/test-data \
    && rm -f apps/web/public/test-data/test-counseling.mp3 \
      "apps/web/public/test-data/상담기록_테스트음성_20분.mp3" \
      apps/web/public/test-data/test-bootcamp-counseling-1hour.mp3 \
    && cp voice-test-data/test-counseling.mp3 apps/web/public/test-data/test-counseling.mp3 \
    && cp "voice-test-data/상담기록_테스트음성_20분.mp3" "apps/web/public/test-data/상담기록_테스트음성_20분.mp3" \
    && cp voice-test-data/test-bootcamp-counseling-1hour.mp3 apps/web/public/test-data/test-bootcamp-counseling-1hour.mp3

RUN NODE_OPTIONS="--max-old-space-size=${NODE_MEMORY}" \
    pnpm --filter @yeon/web build

# ── Stage 4: production runner ───────────────────────────────────────────────
FROM node:22-bookworm-slim AS runner

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
