# 홈 사이드바 튜토리얼 정책 effect 루프 수정 BACKLOG

## 1차

### 작업내용

- `HomeSidebarLayoutProvider`에서 노출하는 setter/toggle 함수의 참조를 안정화해 `useRegisterTutorialPolicy`, `useSidebarToggleVisibility`가 매 렌더 cleanup/setState 루프에 빠지지 않도록 수정한다.
- 학생관리 진입 시 발생한 `Maximum update depth exceeded` 런타임 오류를 제거한다.
- 관련 lint, typecheck, build와 가능하면 실제 페이지 재현 검증까지 수행한다.

### 논의 필요

- 추후 `policy registry`를 컨텍스트가 아닌 별도 reducer/store로 분리할지

### 선택지

- A. `useCallback`으로 컨텍스트 함수 참조를 안정화한다.
- B. effect dependency에서 setter 함수를 제거한다.

### 추천

- A. effect 규칙을 깨지 않고 원인인 함수 identity churn을 제거하는 정석적인 수정이다.

### 사용자 방향
