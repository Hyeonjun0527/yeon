## 차수 1

### 작업내용

- 수강생 관리 화면에서 `스페이스 만들기` 모달 오픈 직후 반복 commit/rerender가 발생하는 경로를 추적한다.
- create-space route state 동기화가 동일 URL에도 계속 실행되는지 확인하고, 같은 상태 재기록을 차단한다.
- 기존 모달 URL 계약(`modal`, `mode`, `step`, `draftId`)은 유지한 채 최소 수정으로 루프를 끊는다.
- 변경 후 브라우저 재현과 typecheck/build로 회귀를 검증한다.

### 논의 필요

- route-sync를 완전히 제거할지, 아니면 동일 href no-op guard만 둘지.
- 추후 뒤로가기/앞으로가기 동작까지 같은 훅에서 더 엄격하게 다룰 필요가 있는지.

### 선택지

1. 모달 내부 `onRouteStateChange` effect를 제거한다.
2. 동일 href일 때 `router.replace`/state 갱신을 건너뛴다.
3. URL 기반 모달 상태를 포기하고 local state로 되돌린다.

### 추천

- 기존 URL 계약과 복구성은 유지하고, 동일 href no-op guard로 반복 업데이트만 차단하는 최소 수정이 가장 안전하다.

### 사용자 방향
