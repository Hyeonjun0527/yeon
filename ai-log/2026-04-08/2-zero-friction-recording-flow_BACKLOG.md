# 제로 프릭션 녹음 플로우 백로그

## 목표

녹음/업로드 → 메타데이터 폼 작성 → 저장 → 전사 대기 → 결과 확인이라는 5단계 흐름을
녹음/업로드 → 즉시 결과(원문 + AI 채팅 + 자동 요약)라는 2단계로 줄인다.
사용자가 건드릴 것: 녹음 버튼 하나. 나머지는 시스템이 처리한다.

---

## 현재 상태 분석

### 현재 흐름

```
EmptyLanding → [파일 선택 or 녹음] → 오디오 프리뷰 → "저장하러 가기" →
UploadPanel(학생이름*, 상담제목*, 상담유형) → "기록 저장" →
status=processing(폴링) → status=ready → 원문+AI채팅 사용 가능
```

### 현재 제약

- DB 스키마: `student_name VARCHAR(80) NOT NULL`, `session_title VARCHAR(160) NOT NULL`
- API Route: `sanitizeRequiredValue(input.studentName, ...)` — 빈 값이면 400 에러
- api-contract: `studentName: z.string()`, `sessionTitle: z.string()` — 빈 문자열 허용은 되지만 서비스 계층에서 차단
- 전사는 인메모리 Promise 기반 비동기 큐, 완료 후 DB status를 ready/error로 변경
- 전사 완료 후 별도 AI 분석/콜백 없음 — 사용자가 AI 채팅에서 수동 질문해야 함
- 프론트 폴링: 5초 간격으로 상세 조회하여 status 변경 감지

---

## 차수별 구현 계획

### 1차: 폼 제거 + 즉시 업로드 (프론트 + API + DB)

**작업 내용**

1. DB 마이그레이션: `student_name`, `session_title`에 기본값 추가
   - `student_name DEFAULT ''` (NOT NULL 유지, 빈 문자열 허용)
   - `session_title DEFAULT ''` (NOT NULL 유지, 빈 문자열 허용)
2. API 서비스 수정: `createCounselingRecordAndQueueTranscription`에서 studentName, sessionTitle 필수 검증 제거
   - 빈 값이면 빈 문자열로 저장, 에러 안 냄
   - `sessionTitle` 비어있으면 파일명 또는 `녹음 YYYY.MM.DD HH:mm`으로 자동 생성
3. 프론트 수정:
   - EmptyLanding: 녹음 완료 / 파일 선택 즉시 API 호출 (폼 스킵)
   - "저장하러 가기" 버튼 제거, 오디오 프리뷰 카드 제거
   - 업로드 성공 시 즉시 워크스페이스 레이아웃(원문+AI채팅) 진입
   - UploadPanel 컴포넌트는 records > 0인 상황의 "새 기록" 버튼용으로 유지하되, 동일하게 폼 없이 즉시 업로드
4. api-contract: 변경 없음 (빈 문자열은 이미 z.string()으로 허용)

**논의 필요**

- 학생 이름 빈 문자열일 때 사이드바 목록에서 어떻게 표시할지
  - 선택지 A: "이름 없음"으로 표시
  - 선택지 B: 상담 제목(자동생성)만 표시
  - 선택지 C: "녹음 2026.04.08" 같은 날짜 기반 라벨
- 추천: B — 제목만 표시, 학생 이름은 AI 추출 후 채워지면 그때 표시
- 사용자 방향:

**선행 조건**: 없음
**예상 변경 파일**:

- `apps/web/src/server/db/migrations/XXXX_*.sql` (새 마이그레이션)
- `apps/web/src/server/services/counseling-records-service.ts`
- `apps/web/src/features/counseling-record-workspace/counseling-record-workspace.tsx`
- `apps/web/src/features/counseling-record-workspace/components/empty-landing.tsx`
- `apps/web/src/features/counseling-record-workspace/components/upload-panel.tsx`
- `apps/web/src/features/counseling-record-workspace/hooks/use-upload-form.ts`
- `apps/web/src/features/counseling-record-workspace/hooks/use-recording-machine.ts`
- `apps/web/src/features/counseling-record-workspace/types.ts`

---

### 2차: 전사 완료 후 AI 자동 메타데이터 추출

**작업 내용**

1. AI 메타데이터 추출 함수 신규 작성 (`counseling-ai-service.ts`)
   - 전사 원문을 AI에게 전달하여 학생 이름, 상담 제목(한줄 요약), 상담 유형, 간단 요약 추출
   - 프롬프트: "다음 상담 전사문에서 학생 이름, 상담 주제 한 줄 요약, 상담 유형(대면/전화/온라인/보호자통화), 핵심 내용 3줄 요약을 JSON으로 추출해주세요"
   - 응답 형식: `{ studentName, sessionTitle, counselingType, summary }`
2. 전사 완료 후처리에 AI 추출 단계 추가 (`runTranscriptionForRecord`)
   - 전사 성공 → AI 메타데이터 추출 호출 → DB 업데이트
   - AI 추출 실패 시: 전사 성공 상태는 유지, 메타데이터만 빈 값으로 남김 (전사 자체를 에러로 만들지 않음)
3. DB 칼럼 추가: `ai_summary TEXT DEFAULT ''`
   - 전사 완료 후 AI가 생성한 요약을 저장
4. api-contract 확장: `CounselingRecordDetail`에 `aiSummary: z.string()` 추가
5. PATCH API 신규: `PATCH /api/v1/counseling-records/[recordId]`
   - body: `{ studentName?, sessionTitle?, counselingType? }`
   - AI가 채운 값을 사용자가 수정할 수 있도록

**논의 필요**

- AI 추출에 사용할 모델
  - 선택지 A: 현재 AI 채팅과 같은 모델 (gpt-5.4-medium) — 정확도 높지만 비용/지연
  - 선택지 B: 경량 모델 (gpt-4o-mini) — 빠르고 저렴, 메타데이터 추출엔 충분
  - 추천: B
- AI 추출 타이밍
  - 선택지 A: 전사 완료 직후 동기적으로 (전사 파이프라인 안에서)
  - 선택지 B: 전사 완료 후 별도 비동기 작업으로
  - 추천: A — 전사 완료까지 이미 기다리는 중이라 추가 수 초는 체감 차이 없음
- 사용자 방향:

**선행 조건**: 1차 완료
**예상 변경 파일**:

- `apps/web/src/server/db/migrations/XXXX_*.sql`
- `apps/web/src/server/db/schema/counseling-records.ts`
- `apps/web/src/server/services/counseling-ai-service.ts`
- `apps/web/src/server/services/counseling-records-service.ts`
- `apps/web/src/app/api/v1/counseling-records/[recordId]/route.ts` (PATCH 추가)
- `packages/api-contract/src/counseling-records.ts`

---

### 3차: 워크스페이스 UX — 전사 중 실시간 느낌 + AI 자동 요약 표시

**작업 내용**

1. 전사 중 워크스페이스 개선
   - status=processing일 때 "원문" 영역에 로딩 애니메이션 + 진행 메시지
   - AI 채팅 영역은 비활성이 아닌 "전사가 완료되면 AI 분석을 시작합니다" 안내
   - 폴링 간격을 5초 → 3초로 줄여 체감 반응성 향상
2. 전사 완료 시 자동 AI 요약 표시
   - AI 어시스턴트 패널 상단에 자동 요약 카드 렌더링
   - 카드 내용: 학생 이름, 상담 주제, 핵심 내용 3줄, 후속 조치 제안
   - 사용자가 바로 후속 질문 가능
3. 사이드바 목록 표시 개선
   - 학생 이름 빈 값 → AI 추출 후 자동 갱신 (폴링 시 반영)
   - processing 상태 아이템에 펄스 애니메이션
4. 메타데이터 인라인 수정
   - 기록 상세 헤더에서 학생 이름, 상담 제목 클릭 → 인라인 편집
   - PATCH API 호출로 저장

**논의 필요**

- AI 자동 요약을 별도 카드로 보여줄지, 첫 번째 AI 메시지로 보여줄지
  - 선택지 A: 요약 카드 (고정 UI, 채팅과 분리)
  - 선택지 B: 시스템 메시지 (채팅 히스토리에 자동 추가)
  - 추천: A — 요약은 항상 보여야 하고, 채팅은 사용자 질문부터 시작하는 게 자연스러움
- 사용자 방향:

**선행 조건**: 2차 완료
**예상 변경 파일**:

- `apps/web/src/features/counseling-record-workspace/counseling-record-workspace.tsx`
- `apps/web/src/features/counseling-record-workspace/components/record-detail-header.tsx`
- `apps/web/src/features/counseling-record-workspace/components/assistant-panel.tsx`
- `apps/web/src/features/counseling-record-workspace/components/record-sidebar.tsx`
- `apps/web/src/features/counseling-record-workspace/hooks/use-record-detail.ts`
- `apps/web/src/features/counseling-record-workspace/counseling-record-workspace.module.css`

---

### 4차 (선택): 실시간 전사 스트리밍

**작업 내용**

1. 전사 진행 상황을 SSE로 프론트에 실시간 전달
   - 새 API: `GET /api/v1/counseling-records/[recordId]/transcribe-stream`
   - 이벤트: `segment-added`, `progress`, `completed`, `error`
2. 프론트에서 세그먼트가 하나씩 추가되는 UX
   - 전사 진행 중에도 원문 영역에 실시간으로 텍스트가 쌓임
   - 타자기 효과 같은 느낌
3. 폴링 제거, SSE 기반으로 전환

**논의 필요**

- 현재 전사 엔진이 OpenAI API를 한번에 호출하고 결과를 통으로 받는 구조라 세그먼트 단위 스트리밍이 어려움
  - 선택지 A: 청킹된 파트별로 완료 시 이벤트 전송 (파트 단위 스트리밍)
  - 선택지 B: OpenAI streaming transcription API 사용 (세그먼트 단위)
  - 선택지 C: 이 차수는 보류하고, 폴링 간격만 줄여서 대응
  - 추천: C — ROI 대비 복잡도가 높음. 3차까지로 충분한 UX 개선 가능
- 사용자 방향:

**선행 조건**: 3차 완료
**예상 변경 파일**: 전사 엔진, API route, 프론트 훅 전면 수정

---

## 차수 요약

| 차수 | 핵심                    | 사용자 체감 변화                                 | 난이도         |
| ---- | ----------------------- | ------------------------------------------------ | -------------- |
| 1차  | 폼 제거 + 즉시 업로드   | 녹음 끝나면 바로 워크스페이스 진입               | 중             |
| 2차  | AI 자동 메타데이터 추출 | 학생 이름·제목·유형·요약 자동 생성               | 중             |
| 3차  | 워크스페이스 UX 개선    | 전사 중 실시간 느낌 + AI 요약 카드 + 인라인 수정 | 중             |
| 4차  | 실시간 전사 스트리밍    | 텍스트가 실시간으로 쌓이는 느낌                  | 상 (보류 추천) |

## 전체 완료 후 사용자 경험

```
[🎙 녹음] → 녹음 중지 →
  즉시 워크스페이스 진입 (전사 처리 중 표시) →
  3~30초 후 전사 완료 →
  AI가 자동으로 학생 이름·제목·요약 채움 →
  AI 채팅 바로 사용 가능 →
  필요하면 메타데이터 인라인 수정
```

폼 0개, 버튼 클릭 1번 (녹음 시작 + 녹음 종료).
