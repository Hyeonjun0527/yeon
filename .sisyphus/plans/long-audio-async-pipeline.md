# Long Audio Async Pipeline Plan

## TL;DR

> **Quick Summary**: 현재 상담 녹음 처리 구조를 “웹 요청 안에서 끝내려는 동기식/인메모리 중심 흐름”에서 “비동기 job + chunked transcription + staged analysis + 복귀 가능한 UX”로 전환한다.
>
> **Deliverables**:
>
> - durable transcription/analysis job state
> - 1시간 녹음 대응 chunked pipeline
> - 유저가 기다리지 않는 background UX
> - resume/retry/progress tracking
>
> **Estimated Effort**: Large
> **Parallel Execution**: YES - 3 waves + final verification
> **Critical Path**: job model → durable scheduling → streaming/chunk transcription → staged analysis → async UX

---

## Context

### Original Request

현재 녹음 서비스는 3분 정도만 되어도 분석 안정성이 낮다. 목표는 1시간짜리 녹음 데이터도 처리 가능하게 만드는 것이다. 단, 사용자가 1시간 동안 화면에서 기다리게 해서는 안 된다.

### Interview Summary

**Key Discussions**:

- 사용자는 “대규모 파이프라인이 꼭 필요한지”를 질문했지만, 과도한 인프라보다 현재 구조 병목 제거와 비동기화가 우선이라는 방향에 동의했다.
- 사용자는 긴 처리 시간을 UX 문제로 인식하고 있으며, 업로드 후 떠났다가 나중에 돌아와도 상태를 확인할 수 있어야 한다고 요구했다.

**Research Findings**:

- `counseling-transcription-engine.ts`는 이미 24MB/8분 기준 chunking 로직을 가지고 있다.
- `counseling-record-audio-storage.ts`는 현재 오디오를 통째로 buffer로 읽는 경로가 있어 메모리 병목 가능성이 높다.
- `counseling-records-service.ts`는 transcription/analysis 스케줄링을 in-memory `Map`으로 관리한다.
- DB에는 transcript segment 저장 구조가 이미 있다.
- 장시간 오디오 대응 best practice는 async job, intermediate persistence, resumability, progress tracking, map-reduce style analysis다.

### Metis Review

**Identified Gaps** (addressed):

- 알림 방식은 미정이지만 MVP는 인앱 상태/목록 복귀로 충분하다고 기본값 적용
- 과도한 분산 시스템 도입은 scope creep이므로 우선 durable DB queue 또는 단일 worker 구조로 제한
- “전사 성공 후 분석”과 “전사/분석 동시 처리”를 혼동하지 않도록 상태머신을 분리

---

## Work Objectives

### Core Objective

1시간 녹음도 안정적으로 처리할 수 있도록, 업로드·전사·분석을 durable async pipeline으로 재구성하고 사용자가 결과를 기다리지 않도록 UX를 비동기 흐름으로 바꾼다.

### Concrete Deliverables

- transcription job / analysis job durable state model
- startup-safe rescheduler or durable queue executor
- audio full-buffer 제거 또는 축소
- chunk-level transcription progress persistence
- transcript-complete 후 staged analysis pipeline
- record list/detail에서 processing/progress/failed/done 상태 확인 UX
- 화면 이탈 후 복귀 가능한 async completion UX

### Definition of Done

- [ ] 1시간 녹음 업로드 후 웹 요청이 장시간 블로킹되지 않는다
- [ ] 서버 재시작 후에도 processing job을 이어서 처리할 수 있다
- [ ] chunk 단위 progress가 저장된다
- [ ] transcript 완료 후 analysis가 별도 단계로 안전하게 실행된다
- [ ] 사용자는 목록/상세에서 처리 상태를 확인하고 나중에 돌아올 수 있다

### Must Have

- durable job state
- chunked transcription
- resumable processing
- non-blocking UX
- analysis input size를 제어하는 staged analysis

### Must NOT Have (Guardrails)

- 웹 요청이 업로드 이후 전사/분석 완료까지 붙잡고 있는 구조 금지
- in-memory `Map`만으로 job 진실 원천을 관리하는 구조 금지
- transcript 전체를 한 번에 LLM에 던지는 구조 금지
- 대규모 메시지 버스/멀티서비스를 초기 단계에 강제 도입 금지

---

## Verification Strategy

> **ZERO HUMAN INTERVENTION** - ALL verification is agent-executed.

### Test Decision

- **Infrastructure exists**: YES
- **Automated tests**: Tests-after
- **Framework**: existing lint/typecheck/build + targeted service/integration verification

### QA Policy

- Backend/API: Bash + curl/seed script
- Long-running flow: tmux/background worker observation + DB status polling
- UI: Playwright for processing/revisit UX

---

## Execution Strategy

### Parallel Execution Waves

Wave 1 (foundation):
├── Task 1: 현재 status/job 모델 정리 및 durable state 설계
├── Task 2: in-memory scheduling 제거 전략 및 queue/worker 결정
├── Task 3: audio download/buffering 경로 개선 설계
├── Task 4: transcript/analysis 상태머신 정의
└── Task 5: async UX 상태 정의 (processing, queued, failed, done)

Wave 2 (pipeline implementation):
├── Task 6: durable transcription job persistence 구현
├── Task 7: startup-safe rescheduler 또는 worker loop 구현
├── Task 8: chunk progress persistence 및 retry/backoff 구현
├── Task 9: full-buffer audio path 제거 또는 temp streaming path 도입
└── Task 10: transcript 완료 후 analysis stage 분리

Wave 3 (product UX + hardening):
├── Task 11: 업로드 후 즉시 이탈 가능한 UI flow 구현
├── Task 12: record list/detail progress UI 구현
├── Task 13: 실패/재시도/부분완료 복구 UX 구현
├── Task 14: 긴 transcript 분석 map-reduce/sectional 분석 적용
└── Task 15: observability/metrics/logging 보강

Wave FINAL:
├── Task F1: pipeline durability audit
├── Task F2: 1-hour processing scenario QA
├── Task F3: non-blocking UX verification
└── Task F4: scope fidelity check

Critical Path: 1 → 2 → 6 → 7 → 8 → 10 → 11/12/13 → F1-F4

### Dependency Matrix

- **1**: - → 2,4,6,7,8,10
- **2**: 1 → 6,7,8
- **3**: 1 → 9
- **4**: 1 → 10,11,12,13
- **5**: 1 → 11,12,13
- **6**: 1,2 → 7,8,10
- **7**: 2,6 → F1,F2
- **8**: 2,6 → F1,F2
- **9**: 3 → F2
- **10**: 4,6 → 14,F2
- **11**: 5,10 → F3
- **12**: 5,10 → F3
- **13**: 4,5,8,10 → F3
- **14**: 10 → F2,F3
- **15**: 6,7,8,10 → F1,F2,F3

### Agent Dispatch Summary

- **Wave 1**: T1,T2,T4 → `deep`, T3 → `unspecified-high`, T5 → `visual-engineering`
- **Wave 2**: T6,T7,T8,T9,T10 → `deep` / `unspecified-high`
- **Wave 3**: T11,T12,T13 → `visual-engineering`, T14 → `deep`, T15 → `unspecified-high`
- **FINAL**: F1 → `oracle`, F2/F3 → `unspecified-high`, F4 → `deep`

---

## TODOs

- [ ] 1. Durable Job/Status 모델 설계

  **What to do**:
  - `counseling_records.status`의 현재 의미를 재정의한다
  - transcription job과 analysis job의 별도 상태를 설계한다
  - queued / processing / transcript_ready / analyzing / completed / failed / retryable 등을 정의한다

  **Must NOT do**:
  - 하나의 status에 모든 의미를 과적재하지 말 것

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 1
  - **Blocks**: 2,4,6,7,8,10
  - **Blocked By**: None

  **References**:
  - `apps/web/src/server/db/schema/counseling-records.ts` - current status and record fields
  - `apps/web/src/server/services/counseling-records-service.ts` - current scheduling semantics

  **Acceptance Criteria**:
  - [ ] transcription/analysis/job lifecycle가 문서화된다
  - [ ] 기존 status와 신규 durable state 책임이 분리된다

  **QA Scenarios**:

  ```
  Scenario: State model covers all phases
    Tool: Bash (grep/read)
    Steps:
      1. state enum/constant/schema 확인
      2. upload→transcribe→analyze→done/fail 경로 매핑
    Expected Result: 모든 전이 상태가 누락 없이 정의됨

  Scenario: Failure state is resumable
    Tool: Bash (grep/read)
    Steps:
      1. retryable/failed 상태와 재시도 조건 확인
    Expected Result: 영구 실패와 재시도 가능 실패가 구분됨
  ```

- [ ] 2. In-memory Scheduling 제거 전략 결정

  **What to do**:
  - `scheduledTranscriptionJobs`, `runningAnalysisJobs`를 대체할 durable executor 전략을 구현 계획대로 구체화한다
  - 초기 단계는 DB queue 또는 startup-safe worker loop 중 하나로 제한한다

  **Must NOT do**:
  - 첫 단계부터 과한 분산 시스템 도입 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 6,7,8
  - **Blocked By**: 1

  **References**:
  - `apps/web/src/server/services/counseling-records-service.ts` - current in-memory maps and scheduling comment

  **Acceptance Criteria**:
  - [ ] worker/job ownership이 durable store 기준으로 결정된다
  - [ ] multi-instance에서도 duplicate processing 방지 기준이 생긴다

  **QA Scenarios**:

  ```
  Scenario: Duplicate scheduling guard
    Tool: Bash (service-level test or grep)
    Steps:
      1. same record enqueue twice
      2. 실제 실행 횟수 확인
    Expected Result: 하나의 active job만 유지됨
  ```

- [ ] 3. Audio Full-Buffer 병목 제거

  **What to do**:
  - storage download가 전체 Buffer를 잡지 않도록 수정한다
  - temp file streaming 또는 range-based staged download를 적용한다

  **Must NOT do**:
  - 1시간 오디오를 한 번에 메모리에 올리는 경로 유지 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 9
  - **Blocked By**: 1

  **References**:
  - `apps/web/src/server/services/counseling-record-audio-storage.ts` - bodyToBuffer / download path
  - `apps/web/src/server/services/counseling-transcription-engine.ts` - audio source construction path

  **Acceptance Criteria**:
  - [ ] long audio path에서 full-buffer 의존이 제거된다

  **QA Scenarios**:

  ```
  Scenario: Long audio download does not allocate full file buffer
    Tool: Bash / test
    Steps:
      1. large audio fixture 처리 실행
      2. memory-sensitive path 확인
    Expected Result: 스트리밍 또는 chunked temp-file path 사용
  ```

- [ ] 4. Transcript/Analysis 상태머신 분리

  **What to do**:
  - transcript completion과 analysis completion을 별도 단계로 분리한다
  - transcript_ready 시점부터 UI가 transcript 열람 또는 대기 상태를 표시할 수 있게 한다

  **Must NOT do**:
  - transcript와 analysis를 단일 done 상태로 뭉개지 말 것

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 10,11,12,13
  - **Blocked By**: 1

  **References**:
  - `apps/web/src/server/services/counseling-ai-service.ts`
  - `apps/web/src/server/services/counseling-records-service.ts`

  **Acceptance Criteria**:
  - [ ] transcript_ready 와 analysis_ready 가 별도 상태로 구분된다

  **QA Scenarios**:

  ```
  Scenario: Transcript ready before analysis complete
    Tool: Bash / integration test
    Steps:
      1. transcript 완료 후 analysis 인위 지연
      2. record 상태 조회
    Expected Result: transcript_ready 상태가 먼저 보임
  ```

- [ ] 5. Async UX 상태 정의

  **What to do**:
  - 업로드 직후 사용자가 떠나도 되는 UX를 설계한다
  - 목록/상세에서 queued, processing, failed, completed 상태를 표시한다
  - MVP는 인앱 상태 갱신과 복귀 확인을 기본값으로 한다

  **Must NOT do**:
  - 완료까지 spinner 하나만 보여주며 붙잡는 UX 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1
  - **Blocks**: 11,12,13
  - **Blocked By**: 1

  **References**:
  - `apps/web/src/features/counseling-record-workspace/components/upload-panel.tsx`
  - `apps/web/src/features/counseling-record-workspace/counseling-record-workspace.tsx`
  - `apps/web/src/app/home/_hooks/use-records.ts`

  **Acceptance Criteria**:
  - [ ] 업로드 후 사용자는 다른 화면으로 이동 가능
  - [ ] 나중에 돌아와도 상태를 확인할 수 있음

  **QA Scenarios**:

  ```
  Scenario: User leaves during processing
    Tool: Playwright
    Steps:
      1. 녹음 업로드
      2. processing 상태 확인
      3. 다른 화면 이동 후 다시 record detail 복귀
    Expected Result: 처리 상태와 최신 결과가 유지됨
  ```

- [ ] 6. Durable Transcription Job Persistence 구현

  **What to do**:
  - transcription job 엔티티 또는 equivalent durable state를 추가한다
  - chunk index, attempt count, startedAt, completedAt, lastError 등을 저장한다

  **Must NOT do**:
  - process memory만 진실 원천으로 쓰지 말 것

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 2
  - **Blocks**: 7,8,10
  - **Blocked By**: 1,2

  **References**:
  - `apps/web/src/server/db/schema/counseling-records.ts`
  - `apps/web/src/server/services/counseling-records-service.ts`

  **Acceptance Criteria**:
  - [ ] job state가 DB 또는 durable store에 저장된다

  **QA Scenarios**:

  ```
  Scenario: Job survives process restart
    Tool: Bash / integration test
    Steps:
      1. processing job 생성
      2. worker restart simulation
      3. durable job state 재조회
    Expected Result: job state가 유실되지 않음
  ```

- [ ] 7. Startup-Safe Worker/Rescheduler 구현

  **What to do**:
  - 서버 시작 또는 worker 시작 시 processing/queued job을 회복한다
  - stuck job 감지와 재큐잉 규칙을 만든다

  **Must NOT do**:
  - 사용자가 목록을 열어줘야만 재스케줄되는 구조 유지 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: F1,F2
  - **Blocked By**: 2,6

  **References**:
  - `apps/web/src/server/services/counseling-records-service.ts` - current ensure/schedule logic

  **Acceptance Criteria**:
  - [ ] restart 후 queued/processing job이 자동 회복된다

  **QA Scenarios**:

  ```
  Scenario: Restart recovery
    Tool: Bash / tmux
    Steps:
      1. job 실행 중 worker 중단
      2. worker 재시작
      3. job 상태 전환 확인
    Expected Result: job이 재개되거나 재큐잉됨
  ```

- [ ] 8. Chunk Progress Persistence + Retry/Backoff 구현

  **What to do**:
  - chunk별 성공/실패/재시도 횟수를 저장한다
  - 실패 chunk만 재시도 가능하게 한다

  **Must NOT do**:
  - 한 chunk 실패 시 전체 1시간 작업을 처음부터 재실행하는 구조 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 13,F1,F2
  - **Blocked By**: 2,6

  **References**:
  - `apps/web/src/server/services/counseling-transcription-engine.ts`

  **Acceptance Criteria**:
  - [ ] chunk 진행률이 durable하게 저장된다
  - [ ] transient failure는 chunk 단위 재시도된다

  **QA Scenarios**:

  ```
  Scenario: Mid-chunk failure recovery
    Tool: Bash / integration test
    Steps:
      1. 특정 chunk에서 실패 주입
      2. retry/backoff 확인
      3. 성공 후 다음 chunk 진행 확인
    Expected Result: 부분 재시도 후 전체 job 계속 진행
  ```

- [ ] 9. Audio Download/Chunk Source Path 개선

  **What to do**:
  - 긴 오디오를 temp file/stream 기반으로 ffmpeg와 연결한다
  - chunk source 생성 시 불필요한 copy/buffer를 줄인다

  **Must NOT do**:
  - 메모리 사용량을 duration에 정비례하게 키우는 경로 유지 금지

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: F2
  - **Blocked By**: 3

  **References**:
  - `apps/web/src/server/services/counseling-record-audio-storage.ts`
  - `apps/web/src/server/services/counseling-transcription-engine.ts`

  **Acceptance Criteria**:
  - [ ] 1시간 오디오 처리 시 memory spike가 크게 줄어든다

  **QA Scenarios**:

  ```
  Scenario: Large audio uses temp-file/stream path
    Tool: Bash / integration test
    Steps:
      1. large audio 처리 실행
      2. temp artifact 생성과 cleanup 확인
    Expected Result: full-buffer 없이 chunk source 생성
  ```

- [ ] 10. Analysis Stage 분리 및 Long Transcript 분석 최적화

  **What to do**:
  - transcript 완료 후 analysis를 별도 stage로 실행한다
  - 전체 transcript를 한 번에 보내지 않고 section/chunk summary → final synthesis 흐름으로 바꾼다

  **Must NOT do**:
  - 1시간 transcript를 single prompt로 처리 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2
  - **Blocks**: 11,12,14,F2
  - **Blocked By**: 4,6

  **References**:
  - `apps/web/src/server/services/counseling-ai-service.ts`
  - `apps/web/src/server/services/counseling-records-service.ts`

  **Acceptance Criteria**:
  - [ ] analysis 입력 길이가 bounded 된다
  - [ ] long transcript도 안정적으로 구조화 분석된다

  **QA Scenarios**:

  ```
  Scenario: Long transcript analysis stays bounded
    Tool: Bash / integration test
    Steps:
      1. large transcript fixture 실행
      2. analysis stage input chunking/log 확인
    Expected Result: sectional analysis 후 final synthesis 수행
  ```

- [ ] 11. 업로드 후 즉시 이탈 가능한 Flow 구현

  **What to do**:
  - 업로드 성공 즉시 “처리 중” 상태와 함께 사용자가 떠날 수 있도록 UI를 바꾼다
  - blocking modal/spinner를 제거한다

  **Must NOT do**:
  - 업로드 후 current page에 사용자를 강제 고정시키지 말 것

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F3
  - **Blocked By**: 5,10

  **References**:
  - `apps/web/src/features/counseling-record-workspace/components/upload-panel.tsx`

  **Acceptance Criteria**:
  - [ ] 업로드 직후 다른 화면 이동이 가능하다
  - [ ] processing badge 또는 toast로 상태가 남는다

  **QA Scenarios**:

  ```
  Scenario: Leave immediately after upload
    Tool: Playwright
    Steps:
      1. audio 업로드 제출
      2. 즉시 목록 화면 이동
    Expected Result: 요청이 백그라운드 처리되고 UI가 막히지 않음
  ```

- [ ] 12. Record List/Detail Progress UI 구현

  **What to do**:
  - queued / transcribing / analyzing / failed / done 상태를 목록과 상세에서 표시한다
  - progress ratio 또는 현재 단계 텍스트를 제공한다

  **Must NOT do**:
  - processing 중인지 failed인지 모호한 상태 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F3
  - **Blocked By**: 5,10

  **References**:
  - `apps/web/src/app/home/_hooks/use-records.ts`
  - `apps/web/src/features/counseling-record-workspace/hooks/use-record-detail.ts`

  **Acceptance Criteria**:
  - [ ] 사용자에게 현재 단계가 분명히 보인다

  **QA Scenarios**:

  ```
  Scenario: Progress shown after revisit
    Tool: Playwright
    Steps:
      1. processing 중 record detail 재진입
      2. stage/progress 표시 확인
    Expected Result: 현재 단계와 다음 기대 상태가 보임
  ```

- [ ] 13. 실패/재시도/부분완료 복구 UX 구현

  **What to do**:
  - 실패 원인을 사용자에게 표시한다
  - retryable failure는 재시도 버튼 또는 자동 재시도 표시를 제공한다
  - transcript만 완료되고 analysis만 실패한 경우 separate recovery를 제공한다

  **Must NOT do**:
  - 실패 후 처음부터 다시 업로드만 강제하는 UX 금지

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F3
  - **Blocked By**: 4,5,8,10

  **References**:
  - `apps/web/src/server/services/counseling-records-service.ts`
  - relevant record detail UI files

  **Acceptance Criteria**:
  - [ ] retryable error와 terminal error가 구분된다
  - [ ] transcript만 있는 partial completion을 복구할 수 있다

  **QA Scenarios**:

  ```
  Scenario: Analysis-only failure recovery
    Tool: Playwright + Bash
    Steps:
      1. transcript 완료 후 analysis 실패 주입
      2. detail 화면 상태 확인
      3. analysis만 재시도
    Expected Result: transcript 재전사 없이 analysis만 복구
  ```

- [ ] 14. Long Transcript Sectional Analysis 적용

  **What to do**:
  - 긴 transcript를 section/chunk 단위로 분석한다
  - intermediate summaries를 저장 또는 재사용한다
  - final synthesis를 별도로 수행한다

  **Must NOT do**:
  - 토큰 초과 가능성이 높은 monolithic prompt 금지

  **Recommended Agent Profile**:
  - **Category**: `deep`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F2,F3
  - **Blocked By**: 10

  **References**:
  - `apps/web/src/server/services/counseling-ai-service.ts`

  **Acceptance Criteria**:
  - [ ] long transcript analysis가 bounded chunk strategy를 사용한다

  **QA Scenarios**:

  ```
  Scenario: 1-hour transcript summary generation
    Tool: Bash / integration test
    Steps:
      1. long transcript fixture 주입
      2. sectional summary + final synthesis 결과 확인
    Expected Result: 토큰 한계 없이 최종 분석 결과 산출
  ```

- [ ] 15. Observability/Monitoring 보강

  **What to do**:
  - job duration, chunk count, retries, failure reason, analysis duration metrics를 남긴다
  - stuck job 감지 기준을 만든다

  **Must NOT do**:
  - 장애 원인을 로그 없이 추측하게 만들지 말 것

  **Recommended Agent Profile**:
  - **Category**: `unspecified-high`

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3
  - **Blocks**: F1,F2,F3
  - **Blocked By**: 6,7,8,10

  **References**:
  - services around transcription and analysis pipeline

  **Acceptance Criteria**:
  - [ ] job/chunk/error 단위 observability가 생긴다

  **QA Scenarios**:

  ```
  Scenario: Failure emits diagnostic evidence
    Tool: Bash / log inspection
    Steps:
      1. failure injection
      2. logs/metrics 확인
    Expected Result: root cause와 retry context가 기록됨
  ```

---

## Final Verification Wave

- [ ] F1. **Pipeline Durability Audit** — `oracle`
      DB 상태, worker/queue, restart recovery, duplicate prevention, resumability를 검증한다.

- [ ] F2. **1-Hour Processing Scenario QA** — `unspecified-high`
      1시간 fixture 또는 equivalent long-audio simulation으로 chunked transcription + staged analysis가 끝까지 동작하는지 검증한다.

- [ ] F3. **Non-Blocking UX Verification** — `unspecified-high`
      업로드 후 사용자가 떠났다가 돌아오는 흐름, progress 표시, 실패/재시도 UX를 검증한다.

- [ ] F4. **Scope Fidelity Check** — `deep`
      목표가 “대규모 분산 시스템 구축”이 아니라 “1시간 대응 가능한 durable async pipeline”에 맞게 구현됐는지 확인한다.

---

## Commit Strategy

- `feat(recording): 장시간 녹음 비동기 전사/분석 파이프라인과 복귀형 처리 상태를 도입`

---

## Success Criteria

### Verification Commands

```bash
pnpm --filter @yeon/web exec eslint <changed-files>
pnpm --filter @yeon/web exec prettier --check <changed-files>
pnpm --filter @yeon/web typecheck
pnpm --filter @yeon/web build
```

### Final Checklist

- [ ] 1시간 녹음이 동기 요청 안에서 처리되지 않는다
- [ ] in-memory scheduling 단독 의존이 제거된다
- [ ] chunk 단위 재시도/재개가 가능하다
- [ ] transcript와 analysis 상태가 분리된다
- [ ] 사용자가 화면을 떠났다 돌아와도 진행 상태를 확인할 수 있다
