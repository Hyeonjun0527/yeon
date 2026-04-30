## 작업 내용

- `apps/mobile`에 Expo Router 기반 chat-service 모바일 앱 셸과 5탭(`피드`, `에스크`, `친구`, `대화`, `프로필`)을 추가했습니다.
- 전화번호 OTP 인증, 세션 저장, 프로필 수정, 신고/차단, `100원` DM 오픈, 계정 삭제까지 chat-service MVP 흐름을 연결했습니다.
- `packages/api-contract`, `packages/api-client`, `apps/web/src/app/api/v1/chat-service`, `apps/web/src/server/services/chat-service`에 모바일용 공용 계약과 서버 경계를 추가했습니다.
- strict code-review 후속 수정으로 demo seed opt-in, profile source-of-truth, report target validation, block relation 전파를 보강했습니다.
- pre-commit SSOT 가드를 통과하도록 `ralph-strict` command/skill/wrapper를 동기화했습니다.

## 변경 이유

- 앱스토어/플레이스토어 출시 목표의 chat-service를 단일 backend 안에서 독립 auth flow를 가진 모바일 MVP로 실제 동작 가능한 상태까지 올리기 위해서입니다.
- 공개 커뮤니티와 친구 기반 DM을 함께 제공하면서도 신고/차단/계정삭제 같은 최소 안전 정책을 MVP에 포함해야 했습니다.
- strict review에서 드러난 seed 오염, stale profile, partial failure, block relation 누락 같은 상태 정합성 문제를 머지 전에 닫기 위해서입니다.

## 검증 방법

- `pnpm --filter @yeon/mobile lint`
- `pnpm --filter @yeon/mobile typecheck`
- `pnpm --filter @yeon/api-contract typecheck`
- `pnpm --filter @yeon/api-client typecheck`
- `pnpm --filter @yeon/web lint`
- `pnpm --filter @yeon/web typecheck`
- `pnpm --filter @yeon/web build`
- `pnpm lint`
- `pnpm typecheck`
- pre-commit hook: SSOT 점검, `pnpm lint`, `pnpm typecheck`, `pnpm db:check:drift`

## 브랜치 정보

- base: `develop`
- head: `feat/chat-service-mobile-mvp-1`
- 순번: `1`
