# 상담기록 목 → 실제 API 연결 BACKLOG

## 목표

`/home` 화면의 목 훅을 실제 API로 교체한다.  
`_components/` 디자인과 CSS는 **건드리지 않는다** (center-panel.tsx의 mock import 제거 제외).

---

## 차수 1 — 타입·유틸 정리

| 항목 | 내용 |
|---|---|
| 작업내용 | `_lib/types.ts`에서 mockdata `TranscriptSegment` import 제거, 실제 API 타입으로 교체 |
| | `_lib/utils.ts`에서 mockdata import 제거, `buildInitialRecords` 빈 배열 반환으로 변경 |
| | `fmtMs(ms)` 유틸 추가 (밀리초 → "M:SS" 포맷) |
| 논의 필요 | 기존 mock `{time, speaker, name, label, text}` → 실제 `{startMs, speakerTone, speakerLabel, text}` 매핑 방식 |
| 추천 | `TranscriptSegment`를 실제 API 타입(`CounselingTranscriptSegment`)에 맞춰 재정의 |
| 사용자 방향 | - |

## 차수 2 — center-panel.tsx mock import 제거

| 항목 | 내용 |
|---|---|
| 작업내용 | `PROCESSING_STEPS`를 mockdata에서 가져오지 않고 파일 내 로컬 상수로 정의 |
| | `seg.time/speaker/name/label` → `fmtMs(seg.startMs)/seg.speakerTone/seg.speakerLabel` 로 변경 |
| 논의 필요 | PROCESSING_STEPS 애니메이션 유지 여부 |
| 추천 | 시각 단계 표시는 유지하되 시간 기반 순수 애니메이션으로 동작, 실제 완료는 polling |
| 사용자 방향 | - |

## 차수 3 — use-records.ts 실제 API 연결

| 항목 | 내용 |
|---|---|
| 작업내용 | 마운트 시 `GET /api/v1/counseling-records` 호출, 목록 로드 |
| | `processing` 상태 레코드 있으면 3초 폴링 → `ready` 되면 detail fetch 후 transcript 업데이트 |
| | `addProcessingRecord(record)` — 이미 API가 생성한 RecordItem을 받아 state prepend |
| | `selectRecord(id)` — ready 상태인데 transcript 없으면 detail 자동 fetch |
| 논의 필요 | 빈 목록 phase를 "empty"로 유지할지 |
| 추천 | records.length === 0 이고 로딩 아닌 경우 "empty" 유지 |
| 사용자 방향 | - |

## 차수 4 — use-recording.ts 실제 녹음+업로드

| 항목 | 내용 |
|---|---|
| 작업내용 | `start()` → `getUserMedia + MediaRecorder` |
| | `stop()` → 청크 수집 → Blob → FormData → `POST /api/v1/counseling-records` |
| | 업로드 중 `uploading` 상태 관리 |
| | API 응답으로 받은 RecordItem을 `onRecordingStop`에 전달 |
| 논의 필요 | 마이크 권한 거부 시 에러 처리 방식 |
| 추천 | 에러 발생 시 recording phase 취소, 에러 메시지 상태 반환 |
| 사용자 방향 | - |

## 차수 5 — use-file-upload.ts 실제 업로드

| 항목 | 내용 |
|---|---|
| 작업내용 | `processFile(file)` → FormData POST → API 응답으로 RecordItem 생성 |
| | 업로드 중 `uploading` 플래그 |
| 추천 | 실패 시 에러 상태 설정 |
| 사용자 방향 | - |

## 차수 6 — use-ai-chat.ts 실제 스트리밍 API

| 항목 | 내용 |
|---|---|
| 작업내용 | `send()` → `POST /api/v1/counseling-records/[recordId]/chat` |
| | SSE 스트림 파싱 → 어시스턴트 메시지 실시간 업데이트 |
| | `{ messages: [{role, content}] }` 형식으로 전체 대화 이력 전송 |
| 논의 필요 | 이미지 첨부 처리 (API가 이미지 미지원) |
| 추천 | 이미지는 텍스트 설명으로 대체, 실제 이미지 분석은 추후 |
| 사용자 방향 | - |
