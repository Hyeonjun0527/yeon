## 차수 1

### 작업내용

- student-management 화면의 중복 fetch, cache 미사용, 과한 invalidation 지점을 우선순위 기준으로 줄인다.
- 상담기록 목록 query를 counseling/report 탭 사이에서 공유하도록 공용 hook/query key로 통합한다.
- dynamic member tabs를 local state fetch에서 TanStack Query 기반으로 전환한다.
- member detail direct 진입 시 member cache 재사용과 selected space 정렬 순서를 개선해 fanout을 줄인다.
- 단건 member 수정과 memo 추가 후 전체 refetch 대신 query cache patch 중심으로 갱신한다.

### 논의 필요

- check-board mutation 이후 전체 board 재조회까지 이번 차수에 포함할지 여부.
- direct detail 진입 시 `spaceId`가 없을 때 어떤 source of truth를 우선할지 (`member` 단건 결과 vs 현재 선택 스페이스).

### 선택지

1. 높은 체감도의 client fetch 중복만 우선 정리
2. client + server overfetch를 함께 정리
3. query key 통합만 먼저 하고 invalidation 축소는 후속 차수로 분리

### 추천

- 이번 차수는 사용자 체감이 큰 client-side fetch 리팩토링을 우선한다.
- server-side repeated fetch는 영향 범위를 다시 확인해야 하므로 후속 차수로 분리한다.

### 사용자 방향
