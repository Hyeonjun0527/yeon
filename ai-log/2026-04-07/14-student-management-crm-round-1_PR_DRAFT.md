## 작업 내용

- 교강사용 AI 학생관리 CRM 방향으로 공모전 문서 패키지와 웹 랜딩 기반을 추가했습니다.
- `수업 전 / 수업 중 / 수업 후` 하루 업무 흐름, 위험 신호 우선순위, 제출용 한 줄 설명/문제 정의를 source of truth와 UI에 반영했습니다.
- `packages/api-contract`와 `packages/api-client`에 공모전 개요 계약과 클라이언트 접근 경로를 추가했습니다.
- 웹 홈 화면을 공모전형 랜딩으로 교체하고 `/api/v1/contest/overview` JSON endpoint를 추가했습니다.
- 브랜치 공통 작업으로 lint, prettier, typecheck를 위한 스크립트와 설정 파일도 정리했습니다.

## 변경 이유

- 공모전 심사에서 `교강사가 학생을 실제로 더 잘 관리하게 만드는 서비스`로 보여야 하므로, 문제 정의와 UX 카피가 하나의 값으로 정렬될 필요가 있었습니다.
- 이후 학생함, 상세 관리 카드, 피드백 초안, 후속관리 인터랙션을 구현하기 전에 3차~5차 확정값을 먼저 고정해야 범위가 흔들리지 않습니다.
- 저장소 커밋 절차를 실제로 수행할 수 있게 lint / prettier / typecheck 실행 경로도 함께 정리해야 했습니다.

## 검증 방법

- `pnpm lint -- --fix`
- `pnpm prettier:fix`
- `pnpm typecheck`
- `pnpm build:web`
- `git diff --check`
- Playwright로 `http://localhost:3002` 접속 후 랜딩 렌더링 / 콘솔 오류 0건 확인
- `curl http://localhost:3002/api/v1/contest/overview` 응답 확인

## 브랜치 정보

- base: `develop`
- head: `student-management-crm-round-1`
- 순번: `1`
