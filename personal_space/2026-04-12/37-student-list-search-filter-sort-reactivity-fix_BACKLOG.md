## 1차

### 작업내용

- 수강생 목록에서 이름검색, 전체상태, 전체위험도, 최근등록순 제어가 동작하지 않는 원인을 추적한다.
- 공통 경로인 list hook과 route-state 동기화에서 반응성이 끊긴 지점을 확인한다.
- 검색/필터/정렬 값이 변경 즉시 목록에 반영되도록 source of truth와 갱신 방식을 수정한다.
- 수정 후 포맷, lint, typecheck, build로 회귀 여부를 검증한다.

### 논의 필요

- 현재 문제는 `router.replace` 기반 읽기-쓰기인지, `history.replaceState` 기반 URL 갱신인지, `window.location.search` 직접 읽기인지 확인이 필요하다.
- list hook이 reactive source 대신 비반응형 브라우저 상태를 읽고 있으면 같은 유형의 제어가 한 번에 모두 죽을 수 있다.

### 선택지

1. list hook을 `useSearchParams` 기반 reactive 읽기로 전환
   - 장점: 검색/필터/정렬 제어를 가장 직접적으로 복구한다.
   - 단점: 기존 route-state helper와의 일관성을 다시 확인해야 한다.
2. 입력 컴포넌트에 별도 local state를 두고 디바운스/동기화 추가
   - 장점: 입력 체감은 빠르게 고칠 수 있다.
   - 단점: source of truth가 늘어나고 근본 원인을 가린다.

### 추천

- 선택지 1로 간다. 네 가지 제어가 동시에 죽은 건 공통 reactive source가 끊긴 신호라, hook의 읽기 경로를 바로잡는 편이 맞다.

### 사용자 방향
