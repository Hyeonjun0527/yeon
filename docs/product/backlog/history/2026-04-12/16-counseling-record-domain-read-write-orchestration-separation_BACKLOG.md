## 차수 3

### 작업내용

- `apps/web/src/server/services/counseling-records-service.ts` 안에서 read/write/orchestration 책임이 섞인 지점을 한 단계 더 분리한다.
- 이번 차수는 외부 route import를 흔들지 않고, service 내부 private helper를 추가해 read-side 조합 로직을 접어낸다.
- 우선 정리 대상은 목록 계열의 `filter -> schedule -> map` 흐름, 상세 다건 조회의 `segment group -> requested order mapping` 흐름, placeholder record 가드다.
- public export 이름, API contract, DB schema, background job 정책은 유지한다.

### 논의 필요

- 완전한 파일 분리(`read-service`, `write-service`)는 scheduler와 내부 상태 맵의 결합 때문에 순환 의존 위험이 있다.
- 그래서 이번 차수는 module split보다 helper seam 정리에 집중하고, 다음 차수에 파일 분리 가능성을 다시 본다.

### 선택지

1. 현재 파일 내부에 read-side helper를 먼저 세워 책임 경계를 선명하게 한다.
2. 곧바로 별도 파일로 쪼갠다.

### 추천

- 1번. 현재 가장 안전한 landing 단위는 public surface를 건드리지 않고 내부 조합 로직만 정리하는 것이다. scheduler와 orchestration이 강하게 결합된 상태라 무리한 파일 분리는 회귀 위험이 크다.

### 사용자 방향
