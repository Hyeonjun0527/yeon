## 차수 2

### 작업내용

- 4구간 상담 기록 서버 도메인에서 transcript 수정 계열의 stale-analysis reset 중복을 정리한다.
- 우선 범위는 `apps/web/src/server/services/counseling-records-service.ts`의 `updateTranscriptSegment`, `bulkUpdateSpeakerLabel` 두 함수로 한정한다.
- 두 경로에서 공통으로 수행하는 `analysisResult 초기화 -> analysisStatus queued 전환 -> transcript_ready/processingMessage 갱신 -> refreshedRecord 재조회 -> analysis scheduling` 흐름을 private helper로 모은다.
- route handler, API contract, DB schema, response shape는 변경하지 않는다.
- 관련 서비스 테스트를 추가해 transcript 수정/화자 일괄 변경의 회귀를 확인한다.

### 논의 필요

- 현재 서비스 테스트는 read-side 위주여서 이번 차수에서 DB mock을 조금 더 명시적으로 구성해야 한다.
- 전체 workspace typecheck/lint/build에는 이미 선행 이슈가 섞여 있어, 이번 차수도 변경 파일 기준 검증과 targeted test를 우선한다.

### 선택지

1. transcript mutation 2경로의 stale-analysis reset만 공통화한다.
2. transcript mutation뿐 아니라 retry/analyze/write-path 전반의 상태 전이 helper까지 넓힌다.

### 추천

- 1번. 현재 중복은 명확하지만 상태 전이는 민감하므로, 같은 의미의 reset 흐름만 묶고 다른 processing state 전이까지 합치지 않는 편이 안전하다.

### 사용자 방향
