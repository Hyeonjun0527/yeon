# 4-student-management-shift-multi-select-delete BACKLOG

## 차수 1

### 작업내용

- 학생관리 리스트에서 shift 기반 범위 선택이 가능하도록 다중 선택 UX를 추가한다.
- 선택된 수강생을 한 번에 삭제할 수 있는 bulk delete 흐름을 만든다.
- member 기반 API 경계와 기존 mock fallback이 충돌하지 않도록 정리한다.

### 논의 필요

- 다중 선택 시작 트리거를 체크박스로 할지, 행 클릭 자체로 할지 UX 기준이 필요하다.
- bulk delete를 개별 DELETE 반복으로 처리할지, 전용 bulk API를 둘지 판단이 필요하다.

### 선택지

1. 클라이언트에서 선택된 memberId들에 대해 개별 DELETE를 순차/병렬 호출한다.
2. 전용 bulk delete API를 추가한다.
3. mock 학생만 먼저 지원하고 API는 후속으로 미룬다.

### 추천

- 2번으로 간다. shift 다중 선택은 결국 bulk action UX와 같이 가야 하고, member 기준 삭제를 한 요청 경계로 묶는 것이 상태 정합성과 재조회 비용 면에서 낫다.

### 사용자 방향

## 차수 2

### 작업내용

- 체크박스 없이 카드 자체에서 shift / ctrl(cmd) 기반 다중 선택이 동작하도록 UX를 다듬는다.
- 선택 상태는 카드 강조와 상단 bulk action bar로만 드러내고, old-style checkbox affordance는 제거한다.

### 논의 필요

- 선택 모드에서 일반 클릭을 탐색으로 유지할지, 토글로 바꿀지 UX 기준이 필요하다.

### 선택지

1. 선택 모드가 아닐 때는 클릭=상세 이동, shift/ctrl(cmd) 클릭만 선택으로 사용한다.
2. 선택 모드가 시작된 뒤에는 일반 클릭도 토글로 바꾼다.

### 추천

- 2번으로 간다. 체크박스가 없어진 상태에서는 선택 모드 진입 이후 plain click도 토글이어야 연속 작업이 자연스럽다. 상세 이동은 선택 해제 후 다시 진입하도록 단순화한다.

### 사용자 방향
