# Architecture

## Decision

This repository is structured as a workspace monorepo from day one:

```txt
apps/web + apps/mobile + packages/*
```

That keeps the future mobile app explicit without forcing an early `frontend/ backend/` split.

## Boundaries

### `apps/web`

- Owns the Next.js application.
- Owns web-only UI and web-only orchestration.
- Owns public HTTP endpoints under `src/app/api`.
- May use `Server Actions`, but only for flows that are web-private.
- Keeps server-only implementation under `src/server`.

### `apps/mobile`

- Owns the Expo application.
- Never imports from `apps/web/src/server`.
- Talks to backend features through public HTTP APIs only.
- Can share contracts, pure domain logic, tokens, and utilities from `packages/*`.

### `packages/api-contract`

- Source of truth for request/response schemas and runtime validation contracts.
- Shared by web API handlers and mobile/web clients.

### `packages/api-client`

- Typed fetch/client wrapper for mobile and client-side web code.
- Should depend on `api-contract`, not on app-specific internals.

### `packages/domain`

- Pure business concepts only.
- No database, auth session, filesystem, or framework runtime code.
- Safe to import from both apps when the logic is actually runtime-agnostic.

### `packages/design-tokens`

- Cross-platform design constants such as color names, spacing scales, and semantic tokens.
- Do not place React components here yet.

### `packages/utils`

- Small pure helpers that do not pull in framework/runtime assumptions.

## Folder Rules

### Web

```txt
apps/web/src/
  app/                # routes, layouts, route handlers
  components/         # reusable web UI
  features/           # feature-oriented slices
  server/             # actions, services, repositories, validators, db
  lib/                # app-local helpers
  types/              # app-local web/server types
```

### Mobile

```txt
apps/mobile/
  app/                # Expo Router routes
  src/components/     # reusable native UI
  src/features/       # feature-oriented slices
  src/services/       # API consumption and mobile-specific orchestration
  src/providers/      # app providers
  src/theme/          # token-to-native mapping
```

## Explicit Non-Goals

- No shared `ui` package yet.
- No separate `apps/api` yet.
- No mobile app consuming `Server Actions`.

Those can be added later if the product proves the need.
