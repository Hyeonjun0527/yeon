# AI 화자 식별 및 상담 메타데이터 자동 추출 기획

## 목표

STT(음성→텍스트) 전사 결과로부터 AI가 **화자 이름, 역할, 상담 주제, 상담 내용 요약**을 자동 추출하는 서비스를 설계한다.
사용자가 직접 입력하는 것이 아니라, 자연어 대화 텍스트만으로 모든 메타데이터가 채워져야 한다.

---

## 서비스 흐름 (End-to-End)

```
[음성 파일 / 실시간 녹음]
        │
        ▼
  ① 음성 업로드 & 저장
        │
        ▼
  ② 화자 분리 (Speaker Diarization)
     └─ 화자별 음성 세그먼트 분리 (Speaker A, B, C...)
        │
        ▼
  ③ STT 전사 (Speech-to-Text)
     └─ 화자별 텍스트 생성
     └─ 타임스탬프 포함
        │
        ▼
  ④ AI 화자 식별 (본 기획의 핵심)
     └─ 대화 내용에서 이름 추출 ("민수야" → 김민수)
     └─ 말투·맥락으로 역할 추론 (교사/학생/학부모)
     └─ 신뢰도 점수 부여
     └─ 기존 학생 DB 매칭 (등록된 학생이면 자동 연결)
        │
        ▼
  ⑤ 상담 메타데이터 추출
     └─ 상담 주제 (예: "수학 과제 미제출")
     └─ 상담 요약 (3~5줄)
     └─ 핵심 키워드 태그
     └─ 후속 조치 항목 추출
     └─ 감정/분위기 분석 (선택)
        │
        ▼
  ⑥ 사용자 확인 & 수정
     └─ AI가 추론한 결과를 사용자에게 보여줌
     └─ 이름/역할이 틀리면 수정 가능
     └─ 확정 후 DB 저장
```

---

## ④ AI 화자 식별 — 상세 설계

### 입력

- 화자 분리된 전사 텍스트 (Speaker A, Speaker B, ...)
- (선택) 해당 기관의 등록 학생/교사 목록

### AI가 추론해야 하는 것

| 항목       | 추론 근거                         | 예시                                       |
| ---------- | --------------------------------- | ------------------------------------------ |
| **이름**   | 대화 중 호명 ("민수야", "선생님") | Speaker A → "최현준", Speaker B → "김민수" |
| **역할**   | 말투, 질문/응답 패턴, 존칭 사용   | "과제가 제출이 안 됐더라" → 교사           |
| **관계**   | 역할 간 관계                      | 교사 ↔ 학생, 교사 ↔ 학부모                 |
| **신뢰도** | 추론 근거의 명확성                | 이름 직접 호명 = 높음, 맥락 추론 = 중간    |

### 추론 규칙 (프롬프트 설계 기반)

1. **이름 추출**
   - 직접 호명: "민수야", "현준 선생님" → 높은 신뢰도
   - 간접 언급: "김민수 학생이..." → 높은 신뢰도
   - 맥락 추론: 학생 DB에 해당 반 학생이 1명이면 → 중간 신뢰도
   - 추론 불가: "화자 1", "화자 2"로 fallback

2. **역할 추론**
   - 질문 주도 + 조언/지시 → 교사
   - 응답 위주 + 존칭 사용 ("네", "감사합니다 선생님") → 학생
   - 자녀 언급 + 걱정 표현 → 학부모
   - "원장님", "선생님" 호칭 → 교사/원장
3. **기존 DB 매칭**
   - 추출된 이름 + 역할로 등록 학생/교사 검색
   - 매칭되면 학생 ID 연결 → 상담 이력에 자동 추가
   - 매칭 안 되면 새 학생 등록 제안

### 출력 구조

```json
{
  "speakers": [
    {
      "speakerId": "A",
      "name": "최현준",
      "role": "teacher",
      "confidence": 0.95,
      "matchedUserId": "teacher-001",
      "reasoning": "학생에게 과제 제출 여부를 확인하고 조언하는 말투"
    },
    {
      "speakerId": "B",
      "name": "김민수",
      "role": "student",
      "confidence": 0.92,
      "matchedStudentId": "kim",
      "reasoning": "'민수야'로 직접 호명됨, 존칭 사용하며 응답"
    }
  ],
  "transcript": [
    {
      "time": "00:00",
      "speakerId": "A",
      "name": "최현준",
      "role": "teacher",
      "text": "민수야, 오늘 수학 과제가 제출이 안 됐더라. 혹시 무슨 일 있었어?"
    }
  ]
}
```

---

## ⑤ 상담 메타데이터 추출 — 상세 설계

### AI가 추출해야 하는 것

| 항목               | 설명              | 예시                                                      |
| ------------------ | ----------------- | --------------------------------------------------------- |
| **상담 제목**      | 핵심 주제 한 줄   | "수학 과제 미제출 상담"                                   |
| **상담 주제 분류** | 카테고리 태그     | `과제관리`, `시간관리`                                    |
| **상담 요약**      | 3~5문장 요약      | "학원 일정으로 과제 시간 부족..."                         |
| **핵심 키워드**    | 검색용 태그       | `수학`, `과제`, `학원일정`, `기한조정`                    |
| **후속 조치**      | 다음에 해야 할 일 | "2주 뒤 학습 루틴 재점검", "과제 기한 익일 오전으로 변경" |
| **감정 톤**        | 상담 분위기       | `협조적`, `긴장`, `우호적`                                |

### 출력 구조

```json
{
  "title": "수학 과제 미제출 상담",
  "topics": ["과제관리", "시간관리"],
  "summary": "학원 일정(주 5회)으로 과제 시간 부족. 제출 기한을 익일 오전으로 조정하기로 합의. 2주 후 학습 루틴 재점검 예정.",
  "keywords": ["수학", "과제", "학원일정", "기한조정"],
  "followUps": [
    { "action": "과제 기한 익일 오전으로 변경", "dueDate": null },
    { "action": "학습 루틴 재점검", "dueDate": "2026-04-22" }
  ],
  "tone": "협조적",
  "student": {
    "id": "kim",
    "name": "김민수"
  }
}
```

---

## 처리 파이프라인 단계 (사용자에게 보이는 것)

| 순서 | 단계        | 설명                    | 예상 소요 |
| ---- | ----------- | ----------------------- | --------- |
| 1    | 파일 업로드 | 음성 파일 서버 전송     | ~1초      |
| 2    | 화자 분리   | Speaker Diarization     | ~10초     |
| 3    | AI 전사     | STT                     | ~30초     |
| 4    | 화자 식별   | 이름·역할 AI 추론       | ~5초      |
| 5    | 상담 분석   | 주제·요약·후속조치 추출 | ~5초      |

---

## API 명세 (향후 구현 시 참고)

### POST /api/recordings/upload

음성 파일 업로드 → 처리 시작

```
Request: multipart/form-data { file: audio/* }
Response: { recordingId: string, status: "processing" }
```

### GET /api/recordings/:id/status

처리 진행 상태 폴링

```
Response: {
  recordingId: string,
  status: "uploading" | "diarizing" | "transcribing" | "identifying" | "analyzing" | "ready" | "failed",
  currentStep: number,
  totalSteps: number
}
```

### GET /api/recordings/:id

완료된 녹음 결과 조회

```
Response: {
  recordingId: string,
  speakers: Speaker[],
  transcript: TranscriptSegment[],
  analysis: CounselingAnalysis,
  audioUrl: string,
  duration: number,
  createdAt: string
}
```

### PATCH /api/recordings/:id/speakers

사용자가 AI 추론 결과를 수정

```
Request: {
  speakers: [
    { speakerId: "A", name: "수정된 이름", role: "teacher" }
  ]
}
```

### POST /api/recordings/:id/confirm

수정 확정 → 학생 상담 이력에 연결

```
Request: { studentId: string }
Response: { counselingId: string }
```

---

## DB 테이블 구조 (향후 구현 시 참고)

### recordings

| 컬럼             | 타입      | 설명                                                                      |
| ---------------- | --------- | ------------------------------------------------------------------------- |
| id               | UUID      | PK                                                                        |
| organization_id  | UUID      | 소속 기관                                                                 |
| uploaded_by      | UUID      | 업로드한 교사                                                             |
| audio_url        | TEXT      | 저장된 음성 파일 경로                                                     |
| duration_seconds | INT       | 녹음 길이                                                                 |
| status           | ENUM      | uploading, diarizing, transcribing, identifying, analyzing, ready, failed |
| created_at       | TIMESTAMP |                                                                           |

### recording_speakers

| 컬럼            | 타입    | 설명                                |
| --------------- | ------- | ----------------------------------- |
| id              | UUID    | PK                                  |
| recording_id    | UUID    | FK → recordings                     |
| speaker_label   | VARCHAR | AI가 부여한 라벨 (A, B, ...)        |
| name            | VARCHAR | AI 추론 또는 사용자 수정 이름       |
| role            | ENUM    | teacher, student, guardian, unknown |
| confidence      | FLOAT   | AI 추론 신뢰도 (0~1)                |
| matched_user_id | UUID    | FK → users (매칭된 경우)            |
| is_confirmed    | BOOLEAN | 사용자가 확정했는지                 |

### transcript_segments

| 컬럼         | 타입  | 설명                    |
| ------------ | ----- | ----------------------- |
| id           | UUID  | PK                      |
| recording_id | UUID  | FK → recordings         |
| speaker_id   | UUID  | FK → recording_speakers |
| start_time   | FLOAT | 시작 시간 (초)          |
| end_time     | FLOAT | 종료 시간 (초)          |
| text         | TEXT  | 전사 텍스트             |
| order_index  | INT   | 순서                    |

### counseling_analyses

| 컬럼         | 타입    | 설명                    |
| ------------ | ------- | ----------------------- |
| id           | UUID    | PK                      |
| recording_id | UUID    | FK → recordings         |
| title        | VARCHAR | AI 생성 상담 제목       |
| summary      | TEXT    | AI 생성 요약            |
| topics       | JSONB   | 주제 분류 배열          |
| keywords     | JSONB   | 키워드 배열             |
| follow_ups   | JSONB   | 후속 조치 배열          |
| tone         | VARCHAR | 감정 톤                 |
| student_id   | UUID    | FK → students (확정 후) |

---

## Mock 반영 사항

mockdata-v2 시뮬레이션에 위 설계를 반영한다:

1. **전사 텍스트 표시 변경**: `교사` → `최현준 (교사)`, `학생` → `김민수 (학생)`
2. **처리 단계 추가**: 기존 4단계 → 5단계 (화자 식별 단계 삽입)
3. **AI 요약에 구조화된 메타데이터 표시**: 주제, 키워드, 후속 조치 분리 표시
4. **화자 식별 결과 편집 가능 UI 힌트** (editable 표시)

---

## 기술 스택 고려사항 (향후)

| 기능                        | 후보 기술                                             |
| --------------------------- | ----------------------------------------------------- |
| Speaker Diarization         | pyannote.audio, AWS Transcribe, Google Speech-to-Text |
| STT                         | Whisper (OpenAI), Google STT, Clova Speech            |
| 화자 식별 & 메타데이터 추출 | Claude API (프롬프트 기반)                            |
| 실시간 상태 전달            | SSE 또는 WebSocket                                    |
| 음성 저장                   | S3 / R2                                               |

---

## 사용자 방향

- 추천 기준으로 진행
