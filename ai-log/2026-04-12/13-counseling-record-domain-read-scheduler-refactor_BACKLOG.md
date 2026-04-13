## 차수 1

### 작업내용

- 4구간 상담 기록 서버 도메인 중 `apps/web/src/server/services/counseling-records-service.ts`의 read-side 중복을 먼저 줄인다.
- 우선 범위는 목록/상세 조회 계열에서 반복되는 `ensureCounselingRecordTranscriptionScheduled` + `ensureCounselingRecordAnalysisScheduled` 호출 정리로 한정한다.
- public API 계약, route handler 응답 shape, DB schema, AI/전사 동작 정책은 바꾸지 않는다.
- 구현은 private helper 추가 후 `listCounselingRecords`, `getMultipleCounselingRecordDetailsInternal`, `getCounselingRecordDetail`, `listCounselingRecordsBySpace`, `listUnlinkedCounselingRecords`, `listCounselingRecordsByMember`에만 적용한다.
- 관련 서비스 테스트에 read-side 동작 회귀 케이스를 추가하고, 이후 `@yeon/web` 기준 test / typecheck / lint / build 가능 범위를 검증한다.

### 논의 필요

- 현재 TypeScript LSP 서버가 로컬에 설치되어 있지 않아 LSP diagnostics 대신 테스트/타입체크/빌드로 검증해야 한다.
- stale analysis reset 중복(`updateTranscriptSegment`, `bulkUpdateSpeakerLabel`)은 상태 전이 리스크가 커서 이번 차수에서 건드리지 않는다.

### 선택지

1. read-side scheduling 중복만 먼저 줄여 작은 landing 단위로 마무리한다.
2. read-side와 write-side stale reset까지 한 번에 정리한다.

### 추천

- 1번. 현재 `counseling-records-service.ts`는 오케스트레이션과 상태 전이가 섞여 있어 한 번에 넓게 정리하면 회귀 위험이 커진다. 먼저 조회 경로의 반복만 줄여 안전한 분리 지점을 만든 뒤, 다음 차수에서 write-side 상태 reset을 별도로 다루는 편이 낫다.

### 사용자 방향
