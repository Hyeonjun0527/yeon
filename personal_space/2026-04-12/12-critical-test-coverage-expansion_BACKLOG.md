## 차수 1

### 작업내용

- 현재 테스트가 비어 있거나 얕은 구간 중에서 실패 시 서비스 신뢰도에 직접 영향을 주는 critical path를 우선 선정한다.
- 우선 범위는 인증 보안 유틸(`auth/crypto`, `auth/constants`, `auth/oauth-state`, `auth/auth-errors`, `auth/auth-user`), 위험도 계산(`member-risk-service`), 운영 메모 저장(`activity-logs-service`), typed API 경계(`@yeon/api-client`)로 잡는다.
- 각 영역에서 정상 흐름보다 상태 정합성, tamper 방지, 권한 경계, fallback, schema parse 실패, 기본값/정규화 규칙을 중심으로 약 20개 이상의 테스트 케이스를 추가한다.
- 기존 `apps/web` Vitest 패턴을 그대로 따르고, 새 테스트는 `apps/web/src/**/__tests__` 또는 `apps/web/src/**/*.test.ts` 아래에 배치한다.
- 구현 후 변경 파일 diagnostics, `pnpm --filter @yeon/web test`, 필요 시 `pnpm --filter @yeon/web typecheck`까지 검증한다.

### 논의 필요

- `packages/api-contract`, `packages/api-client` 전용 test script가 아직 없어 이번 차수에서는 `apps/web` Vitest에서 workspace import 방식으로 검증한다.
- route handler 단까지 넓게 덮을 수도 있지만, 이번 차수에서는 먼저 순수/준순수 critical logic과 auth boundary를 우선한다.

### 선택지

1. 기존에 테스트가 전혀 없는 인증/경계 로직 위주로 빠르게 넓게 덮는다.
2. 일부 서비스만 깊게 파고들고 나머지는 다음 차수로 미룬다.

### 추천

- 1번. 현재는 인증, 쿠키 상태, 위험도 추론, typed client처럼 얇지만 치명적인 경계 코드의 무테스트 리스크가 더 크므로, 넓고 정확한 회귀망을 먼저 깔아두는 편이 효과가 크다.

### 사용자 방향
