## 차수 4

### 작업내용

- `listCounselingRecords`가 직접 들고 있는 DB select/query 책임을 repository로 내린다.
- `counseling-records-repository.ts`에 사용자 기준 목록 조회 함수를 추가하고, service는 결과 후처리와 scheduling만 담당하게 만든다.
- 기존 `listCounselingRecordsBySpace`, `listUnlinkedCounselingRecords`, `listCounselingRecordsByMember`와 같은 수준의 책임 분리로 맞춘다.
- public export, route 응답 shape, 정렬/커서 정책은 유지한다.

### 논의 필요

- 현재 service 테스트는 repository mock 기반이라, 새 repository 함수 추가에 맞춰 mock과 테스트를 보강해야 한다.
- 이번 차수는 list query 1개만 이관하고, 나머지 create/update/delete/write path는 그대로 둔다.

### 선택지

1. `listCounselingRecords`의 query만 repository로 이관한다.
2. list/detail 계열 query를 한 번에 전부 repository로 더 내린다.

### 추천

- 1번. 이미 안전한 helper seam이 만들어졌기 때문에 가장 큰 잔여 read-side DB 책임 하나만 내려도 service가 눈에 띄게 가벼워진다. 한 번에 더 넓히면 검증 범위가 다시 커진다.

### 사용자 방향
