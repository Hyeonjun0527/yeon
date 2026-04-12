## 차수 1

### 작업내용

- 수강생 관리 화면의 `스페이스 만들기` 버튼 클릭 시 URL 쿼리는 바뀌지만 모달이 뜨지 않는 원인을 추적한다.
- `student-management` 사이드바의 create-space 라우트 상태와 실제 모달 렌더 조건 사이의 동기화 누락을 최소 수정으로 복구한다.
- 기존 URL 기반 모달 상태(`modal`, `mode`, `step`, `draftId`) 계약은 유지한다.
- 변경 후 관련 진단과 웹 검증으로 회귀 여부를 확인한다.

### 논의 필요

- SearchParamsContext re-render 회피 요구를 유지하면서도 모달 open/close만 국소적으로 반영해야 한다.
- 브라우저 뒤로가기/앞으로가기까지 같은 훅에서 동기화할지 여부.

### 선택지

1. `useSearchParams`로 되돌려 간단히 고친다.
2. 훅 내부에 로컬 search 상태를 두고 `router.replace` 결과를 국소 동기화한다.
3. 모달 open 상태를 URL과 분리해 완전 로컬 상태로 바꾼다.

### 추천

- 기존 성능 의도를 깨지 않도록 `useSearchParams`는 복원하지 않고, 훅 내부 로컬 search 상태 + history/popstate 동기화로 최소 수정한다.

### 사용자 방향
