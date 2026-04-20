## 작업 내용

- 상담 서비스 경로 기준 API path helper를 추가하고 `AppRouteContext`에 `resolveApiHref`를 확장했습니다.
- 상담/학생관리/가져오기/시트연동 관련 클라이언트 fetch와 OAuth 링크를 서비스-aware 경로로 통일했습니다.
- 서비스 레지스트리 기준으로 pathname을 해석해 `auth-required` 서비스 페이지 접근 시 루트 로그인으로 보내는 proxy 정책을 추가했습니다.
- Google Drive, OneDrive 연동 OAuth callback URI와 callback 후 복귀 경로를 `/counseling-service` 기준으로 정리했습니다.
- 루트 auth와 `counseling-service` API ownership 규약을 `docs/platform-route-ownership.md`에 문서화했습니다.

## 변경 이유

- `/counseling-service`로 옮긴 뒤에도 클라이언트 요청이 루트 `/api`에 직접 묶여 있어 장기적인 멀티서비스 구조와 맞지 않았습니다.
- 서비스 접근 정책이 registry에만 선언돼 있고 실제 라우팅에는 반영되지 않아 플랫폼 규약이 반쪽 상태였습니다.
- 상담 전용 외부 연동 OAuth가 성공 후 여전히 `/home/student-management`로 복귀하고 있어 새 서비스 경계와 충돌하고 있었습니다.
- 카카오/구글 로그인과 상담 연동 OAuth의 소유권이 다르다는 운영 기준을 문서로 남겨야 이후 서비스 추가 시 같은 혼선을 줄일 수 있습니다.

## 검증 방법

- `pnpm --filter @yeon/web exec vitest run src/app/api/v1/integrations/__tests__/_shared.test.ts src/server/services/__tests__/cloud-oauth-service.test.ts`
- `pnpm lint`
- `pnpm prettier --write CLAUDE.local.md apps/web/src/app/api/v1/integrations/__tests__/_shared.test.ts apps/web/src/app/api/v1/integrations/_shared.ts apps/web/src/server/services/googledrive-service.ts apps/web/src/server/services/onedrive-service.ts apps/web/src/server/services/__tests__/cloud-oauth-service.test.ts docs/platform-route-ownership.md personal_space/2026-04-20/4-상담연동-oauth-경로-소유권정리_BACKLOG.md`
- `pnpm typecheck`
- `pnpm --filter @yeon/web build`

## 브랜치 정보

- base: `develop`
- head: `feat/platform-portal-counseling-path-2`
- 순번: `2`
