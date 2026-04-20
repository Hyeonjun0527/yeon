## 작업 내용

- 상담 서비스 경로 기준 API path helper를 추가하고 `AppRouteContext`에 `resolveApiHref`를 확장했습니다.
- 상담/학생관리/가져오기/시트연동 관련 클라이언트 fetch와 OAuth 링크를 서비스-aware 경로로 통일했습니다.
- 서비스 레지스트리 기준으로 pathname을 해석해 `auth-required` 서비스 페이지 접근 시 루트 로그인으로 보내는 proxy 정책을 추가했습니다.

## 변경 이유

- `/counseling-service`로 옮긴 뒤에도 클라이언트 요청이 루트 `/api`에 직접 묶여 있어 장기적인 멀티서비스 구조와 맞지 않았습니다.
- 서비스 접근 정책이 registry에만 선언돼 있고 실제 라우팅에는 반영되지 않아 플랫폼 규약이 반쪽 상태였습니다.

## 검증 방법

- `pnpm lint`
- `git status --porcelain | awk '{print substr($0,4)}' | tr '\n' '\0' | xargs -0 pnpm exec prettier --write`
- `pnpm typecheck`
- `pnpm --filter @yeon/web build`

## 브랜치 정보

- base: `develop`
- head: `feat/platform-portal-counseling-path-2`
- 순번: `2`
