# yeon

Monorepo scaffold for a Next.js web app and a future Expo mobile app.

## Why this shape

- `frontend/ backend/` is not the default split here.
- `apps/web` owns the Next.js app, including web-only UI and the first HTTP/API layer.
- `apps/mobile` is reserved for Expo and consumes public APIs only.
- Shared code lives in `packages/*`, but only code that is safe to share across runtimes.

## Workspace Layout

```txt
apps/
  web/                # Next.js app
  mobile/             # Expo app
packages/
  api-contract/       # request/response schema, DTO, validation contract
  api-client/         # typed HTTP client used by web client/mobile
  design-tokens/      # colors, spacing, typography tokens
  domain/             # pure business rules with no DB/network/runtime coupling
  utils/              # shared pure helpers
  config/             # shared TypeScript/ESLint config
docs/
  architecture.md     # boundary rules and ownership
  deployment/         # deployment guides
```

## Deployment Docs

- [Raspberry Pi Docker Compose Guide](./docs/deployment/raspberry-pi-docker-compose.md)
- [GitHub Actions + GHCR Guide](./docs/deployment/github-actions-ghcr.md)

브랜치별 배포 기준:

- `develop` -> develop 서버 -> `dev.yeon.world`
- `main` -> 운영 서버 -> `yeon.world`

## Contest Docs

- [Contest Docs Overview](./docs/contest/README.md)
- [100 Round Roadmap](./docs/hyeonjun/2026-04-07/12-student-management-crm-100round-plan_BACKLOG.md)
- [Round 1 Interactive MVP Backlog](./docs/hyeonjun/2026-04-07/11-contest-interactive-mvp-implementation_BACKLOG.md)

## Key Rule

Use `Server Actions` only for web-private mutations. Anything mobile also needs must be exposed through a public HTTP API in `apps/web/src/app/api` and described in `packages/api-contract`.

## Current Backend Scaffold

- `apps/web` now runs as a Next.js App Router application.
- `apps/web/src/server/db` owns the PostgreSQL + Drizzle schema and migrations.
- `packages/api-contract` owns request/response schema source of truth.
- `packages/api-client` exposes typed fetch wrappers for the public API.

## Available Endpoints

- `GET /api/health`
- `GET /api/v1/contest/overview`
- `GET /api/v1/instructor-dashboard`
- `GET /api/v1/users`
- `POST /api/v1/users`

## Run Web

1. Copy `apps/web/.env.example` values into your local env.
2. Start PostgreSQL and point `DATABASE_URL` at it.
3. Generate or apply migrations as needed:
   - `pnpm --filter @yeon/web db:generate`
   - `pnpm --filter @yeon/web db:migrate`
4. Start the app with `pnpm dev:web`.
