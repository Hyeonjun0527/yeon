## 작업 내용

- 상담 서비스 메인 워크스페이스와 학생관리 화면의 source of truth를 `app/home`에서 `app/counseling-service`로 이동했습니다.
- `CounselingNavShell`, `CounselingSidebarLayout`, `CounselingSpaceGate` 등 상담 서비스 공통 셸을 `features/counseling-service-shell`로 분리해 route shell 의존을 정리했습니다.
- `/home` 공개 경로와 proxy legacy redirect를 제거하고, 상담 서비스 canonical route를 `/counseling-service`로 고정했습니다.
- mockdata, student-management, tutorial, app-route helper, integration redirect 경로를 모두 `counseling-service` 기준으로 맞췄습니다.
- auth redirect normalization에서 legacy `/home` next 경로를 더 이상 허용하지 않도록 막고, 관련 테스트 기대값을 `/counseling-service` 기준으로 갱신했습니다.

## 변경 이유

- `yeon.world/counseling-service`를 장기 canonical 경로로 삼기로 결정했는데, 실제 소스 구조와 인증 redirect는 아직 `/home`를 기준으로 남아 있었습니다.
- route shell과 공통 셸이 `app/home`에 묶여 있으면 이후 서비스 경계 분리나 독립 배포 승격 시 다시 뜯어고쳐야 하므로 이번 차수에서 source of truth를 옮겼습니다.
- legacy `/home` nextPath가 auth flow에 남아 있으면 로그인 이후 dead route로 이동할 수 있어 공개 제거 결정과 충돌했습니다.

## 검증 방법

- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @yeon/web build`

## 브랜치 정보

- base: `develop`
- head: `feat/counseling-service-home-removal-1`
- 순번: `1`
