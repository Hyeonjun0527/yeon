## 작업 내용

- `users.email` 단일 유니크 인덱스를 제거하는 DB 마이그레이션을 추가했습니다.
- 소셜 로그인 업서트 로직을 수정해, 같은 이메일이라도 동일 공급자의 다른 `providerUserId`면 기존 user에 붙이지 않고 새 user를 생성하도록 바꿨습니다.
- 같은 이메일 user가 이미 여러 명일 때는 기존 user를 임의로 재사용하지 않고 새 user를 생성하도록 안전장치를 넣었습니다.
- 인증 테스트를 새 정책 기준으로 갱신했습니다.

## 변경 이유

- Kakao 앱을 `YEON`에서 `YEON-TEST`로 바꾸면 같은 사람이어도 앱별 `user_id`가 달라집니다.
- 기존 구조는 `users.email` 유니크와 `providerConflict` 정책 때문에 이 경우 로그인이 깨졌습니다.
- 요구사항은 앱이 바뀌면 같은 이메일이어도 별도 내부 계정으로 분리되는 것이므로, 이메일 단일성보다 외부 identity 분리를 우선하도록 정책을 조정했습니다.

## 검증 방법

- `pnpm --filter @yeon/web exec vitest run src/server/services/__tests__/auth-service.test.ts src/server/services/__tests__/users-service.test.ts`
- `pnpm --filter @yeon/web typecheck`
- `pnpm --filter @yeon/web lint`
- `pnpm --filter @yeon/web build`

## 브랜치 정보

- base: `develop`
- head: `feat/kakao-app-identity-split-1`
- 순번: `1`
