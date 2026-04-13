## 작업 내용
- 초기 상태에서 실제 tutorial target이 없으면 상단 `튜토리얼` 버튼을 숨기도록 `TopNav` 노출 조건을 변경했습니다.
- 학생관리 no-space 상태에서 좌측 스페이스 사이드바와 모바일 스페이스 선택 바를 숨기고, 중앙 집중형 스페이스 생성 게이트를 노출하도록 바꿨습니다.
- 상담관리의 `HomeSpaceGate`를 variant 기반으로 확장해 학생관리용 문구와 버튼 구성을 재사용했습니다.

## 변경 이유
- 스페이스가 없거나 상담 기록이 없는 초기 상태에서는 튜토리얼 step target이 없어 버튼만 남고 아무 반응이 없는 UX가 발생했습니다.
- 학생관리 no-space 화면은 상담관리 초기 화면보다 진입 동선이 약했고, 좌측 사이드바가 비어 있는 상태로 남아 첫 화면 완성도가 떨어졌습니다.

## 검증 방법
- `pnpm --filter @yeon/web typecheck`
- `pnpm --filter @yeon/web lint`
- `pnpm --filter @yeon/web build`
- Playwright로 `/home` no-space 상태에서 `튜토리얼` 숨김 확인
- Playwright로 `/home/student-management` no-space 상태에서 `튜토리얼` 숨김, 중앙 게이트 노출, `도움말` 정상 동작 확인

## 브랜치 정보
- base: `develop`
- head: `web-home-student-no-space-gate-1`
- 순번: `1`
