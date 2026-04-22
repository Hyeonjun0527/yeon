# 13-student-management-selection-orchestration-refactor BACKLOG

## 차수 1

### 작업내용

- `student-list-screen.tsx`에 뭉쳐 있는 shift 범위 선택, anchor 유지, 전체 선택, bulk delete 흐름을 전용 훅/유틸로 분리한다.
- 현재 학생관리 리스트의 UI, 라우팅, API 엔드포인트, 선택 UX, 삭제 동작은 그대로 유지한다.
- 선택 계산 로직을 순수 함수로 빼서 단위 테스트 가능한 구조로 정리한다.

### 논의 필요

- 이 landing 단위에서 삭제 mutation까지 React Query mutation으로 승격할지, 기존 fetch 기반 동작을 유지할지 결정이 필요하다.
- 선택 상태를 이후 사이드바/테이블 뷰와 공용으로 확장할지 여부는 후속 차수로 남길지 판단이 필요하다.

### 선택지

1. 화면 컴포넌트 안에서 현재 로직을 유지하고 변수/함수명만 정리한다.
2. 선택 상태 계산과 bulk delete 실행을 별도 훅으로 추출하고, 화면은 조합만 담당하게 만든다.
3. section 2 전체에 공용 selection/store를 한 번에 도입한다.

### 추천

- 2번으로 간다. 현재 리스크는 `student-list-screen.tsx`가 선택 계산, 삭제 요청, 화면 렌더링을 동시에 들고 있어 회귀 범위가 넓다는 점이다. 먼저 행동 보존형 분리로 화면의 책임을 줄이고, 이후 공용화 여부는 실제 중복이 더 확인된 뒤 결정하는 것이 안전하다.

### 사용자 방향
