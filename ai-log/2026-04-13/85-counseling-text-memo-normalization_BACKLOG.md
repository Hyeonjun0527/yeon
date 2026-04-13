# 85-counseling-text-memo-normalization BACKLOG

## 작업내용

### 1차

- `counseling_records`에 텍스트 메모/음성 업로드/demo placeholder를 분리하는 명시적 source 필드를 추가한다.
- 기존 `audioStoragePath` prefix 기반 placeholder 판정을 `record source` 기반으로 치환하되, 마이그레이션 이전/테스트 픽스처를 위한 fallback은 최소 범위로 유지한다.
- 텍스트 메모 생성 시 원문 본문을 단일 transcript segment 1개로 함께 저장한다.

### 2차

- 목록/상세/AI 분석/채팅/내보내기 흐름에서 텍스트 메모를 정상 상담 기록처럼 취급하도록 backend DTO와 frontend 상태를 정리한다.
- 오디오 재생/재전사만 텍스트 메모에서 차단하고, UI 문구를 “불러오는 중”이 아닌 텍스트 메모 전용 상태로 바꾼다.

### 3차

- repository/service/API contract/UI 테스트를 보강해 텍스트 메모 정상 경로와 demo placeholder 차단 경로를 함께 고정한다.

## 논의 필요

- `record source` 필드를 API contract에도 노출할지
- 텍스트 메모 생성 직후 AI 분석을 backend에서 queued로 바로 태울지, 기존 선택 기반 자동 분석 흐름을 유지할지
- 텍스트 메모의 오디오 메타 노출 문구를 어떤 수준까지 다듬을지

## 선택지

- 선택지 A: DB 필드만 추가하고 API에는 노출하지 않는다.
- 선택지 B: DB 필드 + API contract/UI까지 함께 노출해 재생 가능 여부와 문구 제어를 명시적으로 한다.
- 선택지 C: 텍스트 메모를 별도 엔티티/테이블로 분리한다.

## 추천

- 선택지 B
- 이유: source of truth를 backend에서 분리하는 것만으로는 UI가 여전히 `audioUrl === null`을 “로딩 중”으로 오인할 수 있다. 텍스트 메모를 정상 record로 열고 demo placeholder만 막으려면 API와 UI까지 같은 분류값을 공유하는 편이 가장 안전하다.
- AI 분석은 기존 선택 기반 자동 분석 흐름과 충돌하지 않도록 우선 `idle` 유지 후 segment 기반 자동 분석을 타게 한다.

## 사용자 방향
