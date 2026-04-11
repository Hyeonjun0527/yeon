# 2-remaining-fanout-query-paths-fix BACKLOG

## 차수 1

### 작업내용

- 학생관리 상세, 메모/활동로그, 탭/필드값, 상담 요약/추이 분석 경로의 남은 fan-out query를 정리한다.
- 중복 상세 fetch, 탭별 필드/값 중복 로드, 불필요한 활동로그 조회, 무제한 메모 스캔, 학생 요약/위험도 broad scan을 줄인다.
- 이미 최적화된 상담 기록 리스트, member risk batching, bulk field-value upsert는 유지하되 그 위의 잔여 병목만 수정한다.

### 논의 필요

- 학생 요약 API에서 현재 미사용인 records 배열을 유지할지, 요약 메타만 남길지 장기 계약을 정리할 필요가 있다.
- 메모 탭은 전체 무한 히스토리를 계속 보여줄지, 최신 N개 + 총 개수 구조로 운영할지 추후 UX 결정이 필요하다.

### 선택지

1. 개별 fetch들을 유지하고 client-side 캐시만 강화한다.
2. bulk detail route/서비스, selective field-value reload, bounded log fetch, aggregate summary로 직접 줄인다.
3. 일부만 고치고 나머지는 후속으로 미룬다.

### 추천

- 2번으로 간다. 이미 병목 위치가 구체적으로 식별됐고, 현재 구조 안에서 source of truth를 바꾸지 않고도 query 수와 broad scan 범위를 직접 줄일 수 있다.

### 사용자 방향
