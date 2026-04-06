# Server Boundary

Everything in this folder is server-only.

- `actions/`: web-only Server Actions
- `api/`: route-level helpers used by `src/app/api`
- `auth/`: auth/session helpers
- `db/`: database client and queries
- `repositories/`: persistence abstractions
- `services/`: business orchestration
- `validators/`: server-side validation not shared publicly

If mobile also needs the capability, expose it through `src/app/api` and define the contract in `packages/api-contract`.
