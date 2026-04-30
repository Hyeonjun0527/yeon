## 작업 내용

- 수강생 카드 우클릭 시 현재 선택 상태를 해석해 `1명 삭제` 또는 `선택한 N명 삭제` 메뉴를 띄우도록 수정했습니다.
- `Ctrl/Cmd+클릭` 또는 우클릭으로만 선택 모드가 시작되도록 정리하고, 선택 모드일 때만 `Shift+좌클릭`이 범위 선택으로 동작하게 맞췄습니다.
- `Shift+좌클릭` 시 브라우저 기본 드래그/텍스트 선택이 끼어드는 문제를 카드 마우스다운 단계에서 차단했습니다.
- 선택/우클릭 규칙을 순수 유틸 함수로 분리하고 테스트를 추가했습니다.

## 변경 이유

- 수강생 카드에서 우클릭으로 바로 삭제하고 싶다는 요구가 있었지만, 기존 화면은 상단 bulk delete만 지원해 컨텍스트 기반 삭제가 불가능했습니다.
- `Shift+좌클릭`이 선택 모드 여부와 무관하게 선택 로직으로 들어가 브라우저 기본 드래그처럼 느껴지는 오작동이 있었습니다.
- 선택 상태 해석과 삭제 대상을 같은 source of truth로 묶어야 단건 삭제와 다중 삭제가 서로 다른 규칙으로 어긋나지 않습니다.

## 검증 방법

- `pnpm exec prettier --write personal_space/2026-04-13/7-수강생카드-우클릭삭제-시프트선택안정화_BACKLOG.md apps/web/src/features/student-management/member-selection-utils.ts apps/web/src/features/student-management/__tests__/member-selection-utils.test.ts apps/web/src/features/student-management/hooks/use-member-selection.ts apps/web/src/features/student-management/hooks/use-bulk-member-delete.ts apps/web/src/features/student-management/screens/student-list-screen.tsx`
- `pnpm --filter @yeon/web exec vitest run src/features/student-management/__tests__/member-selection-utils.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @yeon/web build`

## 브랜치 정보

- base: `develop`
- head: `fix/student-context-delete-shift-selection-2`
- 순번: `2`
