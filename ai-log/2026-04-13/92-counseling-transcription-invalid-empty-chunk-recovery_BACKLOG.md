# 92. 상담 전사 invalid empty chunk 내부 복구

## 작업내용

- chunk 생성 직후 각 산출물의 실효 오디오 존재 여부를 검증하는 서버 측 필터를 추가한다.
- 실제 오디오 프레임이 없는 invalid empty chunk는 OpenAI 전사 요청 전에 자동 폐기한다.
- invalid empty chunk만 제거된 경우에는 사용자 상태를 `정상 전사 완료`로 유지하고, 실패 배지나 재시도 CTA를 노출하지 않는다.
- 실제 오디오가 있는 chunk 실패만 partial transcript / 누락 구간 재시도 흐름으로 남긴다.
- 관련 단위 테스트와 회귀 테스트를 추가해 tail invalid chunk 케이스를 고정한다.

## 논의 필요

- invalid chunk 판정을 `ffprobe duration 없음`으로 둘지, 더 강한 decode 검증까지 포함할지
- 내부 복구가 발생했을 때 운영 로그/메트릭에 어느 수준까지 남길지
- invalid chunk가 중간 index에서 발견될 때도 동일 규칙으로 자동 폐기할지, 구조적 손상으로 바로 실패시킬지

## 선택지

1. `ffprobe` 기반 경량 검증으로 duration 없는 chunk만 자동 폐기
2. `ffmpeg -f null -` 수준의 decode 검증까지 수행해 더 엄격하게 필터링
3. invalid chunk는 자동 폐기하지 않고 기존처럼 사용자 실패로 남김

## 추천

- 1번으로 시작한다. 현재 재현된 실패는 `헤더만 있고 실효 오디오가 없는 tail chunk`라서 duration/decodable 여부만 잡아도 사용자 문제는 해소된다.
- 다만 중간 chunk 손상까지 넓히는 순간 `진짜 누락 오디오를 숨기는` 위험이 생기므로, 이번 차수는 `실효 오디오가 없는 empty chunk`만 내부 복구 대상으로 제한한다.

## 사용자 방향

- 실제 오디오 프레임이 없는 chunk는 자동 폐기하고 사용자에게는 정상 전사로 보인다.
- 진짜 누락 구간만 partial transcript / 재시도 UX로 노출한다.

## 차수

### 1차

#### 작업내용

- `counseling-transcription-engine.ts`에 chunk 유효성 검사 헬퍼를 추가한다.
- invalid empty chunk를 `sources`에서 제외하는 규칙을 구현한다.
- filtered 결과가 0개가 되는 비정상 상황은 명시적 서버 오류로 처리한다.

#### 논의 필요

- 헬퍼 이름과 반환 계약을 `duration 기반`으로 둘지 `audio frame 기반`으로 둘지

#### 선택지

1. `probeChunkDurationMs`
2. `validateTranscriptionChunk`

#### 추천

- 2번. 나중에 duration 외의 decode 검증이 추가돼도 이름이 유지된다.

#### 사용자 방향

### 2차

#### 작업내용

- invalid empty chunk 제거 후에도 transcription progress와 offset 계산이 어긋나지 않게 점검한다.
- `failure-presentation` 분기가 이 내부 복구 케이스를 사용자 실패로 해석하지 않도록 서버 상태 전이를 검증한다.
- tail invalid chunk 회귀 테스트를 추가한다.

#### 논의 필요

- offsetMs는 원래 index 기준을 유지할지, 필터 후 재index할지

#### 선택지

1. 원래 segment index/offset 유지
2. 필터 후 재index

#### 추천

- 1번. 실제 오디오 타임라인과 정렬되는 기존 의미를 보존하는 편이 안전하다.

#### 사용자 방향

### 3차

#### 작업내용

- 실제 오디오가 있는 chunk 실패와 invalid empty chunk 자동 복구가 충돌하지 않는지 테스트한다.
- 필요하면 warning 로그를 정리하고, 디버그 시 어떤 chunk가 폐기됐는지 추적 가능하게 남긴다.

#### 논의 필요

- warning 로그에 파일명/recordId/index 중 어디까지 남길지

#### 선택지

1. recordId + chunk index만 남김
2. recordId + 파일명 + chunk index를 남김

#### 추천

- 1번. 디버깅에 필요한 최소 정보만 남기고 로그 노이즈를 줄인다.

#### 사용자 방향
