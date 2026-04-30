## 1차

### 작업내용

- 수강생 관리에서 카드 클릭 후 상세 진입 시 발생하는 추가 commit의 원인을 `spaceId` URL-로컬 상태 동기화 기준으로 정리한다.
- `useStudentManagementApiState`에서 query에 이미 있는 `spaceId`를 다시 local state로 복제하는 흐름을 줄인다.
- URL에 있는 `spaceId`를 우선 source of truth로 사용하고, 사용자 상호작용용 local state는 보조 역할로 제한한다.
- 변경 후 lint, format, typecheck, build로 회귀 여부를 검증한다.

### 논의 필요

- `window.history.replaceState`를 유지하면서도 query 기반 선택값을 안정적으로 읽을 수 있는지 확인이 필요하다.
- 상세 화면 진입 시 `spaceId` query가 없는 예외 흐름은 기존 defer 정책을 그대로 유지해야 한다.

### 선택지

1. `useStudentManagementApiState`만 리팩토링해 query 우선 파생값으로 전환
   - 장점: 가장 작은 수정으로 URL→state 복제 commit을 줄일 수 있다.
   - 단점: 큰 context fan-out 자체는 남는다.
2. StudentManagement context를 다중 context로 쪼개기
   - 장점: 장기적으로 리렌더 범위를 더 크게 줄일 수 있다.
   - 단점: 영향 범위가 크고 현재 문제에 비해 diff가 커진다.

### 추천

- 우선 선택지 1로 진행해 클릭 후 follow-up commit 하나를 줄이는 것을 목표로 한다.
- 이후에도 병목이 남으면 context 분리 리팩토링을 별도 차수로 진행한다.

### 사용자 방향
