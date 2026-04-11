## 차수 5

### 작업내용

- `getCounselingRecordDetail` 및 `getMultipleCounselingRecordDetailsInternal`에서 record/segment 조회 조합 책임을 repository로 한 단계 더 내린다.
- repository에 단건/다건 detail source 조회 helper를 추가하고, service는 placeholder 정책·scheduling·DTO 변환에 집중한다.
- 요청 순서 유지와 segment grouping 규칙은 기존과 동일하게 보존한다.

### 논의 필요

- 이번 차수는 data fetch composition만 옮기고, placeholder 필터링과 scheduling은 service에 남긴다.
- 테스트는 기존 `findOwnedRecord*`, `findTranscriptSegments*` mock 대신 새 repository helper mock을 병행하도록 보강한다.

### 선택지

1. detail source 조회 조합만 repository로 이관한다.
2. placeholder 정책과 mapRecordDetail까지 repository로 모두 내린다.

### 추천

- 1번. 아직 scheduling과 placeholder 정책은 service orchestration 성격이 강하므로, fetch composition만 먼저 이동하는 편이 경계가 깔끔하고 안전하다.

### 사용자 방향
