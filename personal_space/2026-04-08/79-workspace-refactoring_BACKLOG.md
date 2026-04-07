# 79. 상담 기록 워크스페이스 리팩토링 — Health 100 계획

## 현황 진단

### 파일별 규모

| 파일 | 줄 수 | 문제 |
|------|-------|------|
| `counseling-record-workspace.tsx` | 3,549 | useState 34개, useRef 12개, useEffect 16개, 함수 45개 |
| `counseling-record-workspace.module.css` | 2,671 | 클래스 231개, 섹션 구분 없이 나열 |
| `counseling-records-service.ts` | 1,430 | 서비스 하나가 모든 비즈니스 로직 담당 |

### Health 점수: 35/100

| 항목 | 현재 | 목표 |
|------|------|------|
| 단일 책임 원칙 (SRP) | 10/25 | 25/25 |
| 커스텀 훅 분리 | 0/20 | 20/20 |
| 컴포넌트 분리 | 5/20 | 20/20 |
| CSS 모듈 분리 | 5/15 | 15/15 |
| 타입/상수 정리 | 10/10 | 10/10 |
| 테스트 가능성 | 5/10 | 10/10 |
| **합계** | **35/100** | **100/100** |

---

## Phase 1: 타입·상수·유틸리티 추출 (기반 정리)

### 1차: 타입 및 상수 파일 분리

**작업내용**
- `counseling-record-workspace.tsx` 상단의 7개 타입을 `types.ts`로 이동
- `COUNSELING_TYPE_OPTIONS`, `STATUS_META` 상수를 `constants.ts`로 이동
- 기존 파일에서 import로 교체

**논의 필요**: 없음
**추천**: 기계적 이동, 충돌 위험 없음
**사용자 방향**:

---

### 2차: 순수 유틸리티 함수 분리

**작업내용**
- 17개 유틸리티 함수를 `utils.ts`로 이동
  - `formatDateTimeLabel`, `formatDurationLabel`, `formatCompactDuration`, `formatTranscriptTime`
  - `formatFileSize`, `isTranscriptSegmentActive`, `isTranscriptSegmentMatched`
  - `renderHighlightedText`, `getNextSpeaker`, `getSpeakerToneClass`
  - `readErrorMessage`, `readAudioDurationMs`, `buildClientRequestId`
- API 호출 래퍼 `fetchApi`를 `api.ts`로 이동
- `buildQuickPrompts`, `buildInitialAssistantMessages`를 `prompts.ts`로 이동

**논의 필요**: 없음
**추천**: 순수 함수이므로 이동만으로 완료
**사용자 방향**:

---

## Phase 2: 커스텀 훅 추출 (상태 + 로직 분리)

### 3차: useRecordingMachine 훅

**작업내용**
- 녹음 관련 상태 5개 + ref 4개 + effect 2개 + 함수 2개를 단일 훅으로 추출
  - 상태: `isRecording`, `isFinalizingRecording`, `recordingError`, `recordingElapsedMs` + cleanup용 `selectedAudioPreviewUrl` 연동
  - ref: `mediaRecorderRef`, `mediaStreamRef`, `recordedChunksRef`, `recordingStartedAtRef`
  - effect: 타이머(250ms), 언마운트 정리
  - 함수: `startRecording()`, `stopRecording()`
- 반환: `{ recordingPhase, recordingElapsedMs, recordingError, startRecording, stopRecording }`

**논의 필요**: 없음
**추천**: 가장 독립적인 상태 그룹, 먼저 추출하기 좋음
**사용자 방향**:

---

### 4차: useAudioPlayer 훅

**작업내용**
- 오디오 재생 관련 상태 + ref + effect 추출
  - 상태: `currentAudioTimeMs`, `audioLoadError`, `isAutoScrollEnabled`
  - ref: `audioPlayerRef`, `activeSegmentRef`
  - effect: 키보드 스페이스바 재생/일시정지, 오디오 시간 리셋, 자동 스크롤
  - 함수: `handleAudioTimeUpdate()`, `seekAudioToTime()`
- 반환: `{ currentAudioTimeMs, audioLoadError, isAutoScrollEnabled, setIsAutoScrollEnabled, audioPlayerRef, activeSegmentRef, handleAudioTimeUpdate, seekAudioToTime }`

**논의 필요**: 없음
**추천**: 재생 로직은 UI와 완전 분리 가능
**사용자 방향**:

---

### 5차: useRecordList 훅

**작업내용**
- 목록 조회·필터·검색 관련 상태 + effect 추출
  - 상태: `records`, `selectedRecordId`, `searchTerm`, `recordFilter`, `sidebarViewMode`, `expandedStudents`, `selectedStudentName`, `isFilterOpen`, `isLoadingList`, `loadError`
  - effect: 초기 목록 로드, 필터 변경 시 선택 보정
  - 파생값: `filteredRecords`, `studentGroups`, `selectedRecord`
  - 함수: `handleSelectRecord()`, `upsertRecordList()`
- 반환: `{ records, filteredRecords, studentGroups, selectedRecord, selectedRecordId, ... }`

**논의 필요**: 없음
**추천**: 목록 상태는 다른 훅에서 참조되므로 먼저 분리해야 후속 훅이 깔끔해짐
**사용자 방향**:

---

### 6차: useRecordDetail 훅

**작업내용**
- 상세 조회·폴링 관련 상태 + effect 추출
  - 상태: `recordDetails`, `isLoadingDetail`, `isDetailMetaOpen`
  - effect: 상세 로드, 처리 중 폴링(5초)
  - 파생값: `selectedRecordDetail`
  - 함수: `refreshRecordDetail()`, `retryTranscription()`

**논의 필요**: 없음
**추천**: `useRecordList`의 `selectedRecordId`를 인자로 받음
**사용자 방향**:

---

### 7차: useAssistantChat 훅

**작업내용**
- AI 채팅 관련 상태 + effect 추출
  - 상태: `assistantDraft`, `assistantMessagesByRecord`, `isAiStreaming`
  - ref: `aiAbortControllerRef`, `autoAnalysisTriggeredRef`, `messageListRef`
  - effect: 메시지 자동 스크롤, 초기 메시지 생성, 자동 분석 트리거
  - 함수: `streamAssistantResponse()`, `appendAssistantExchange()`, `handleStopStreaming()`
- 반환: `{ assistantDraft, setAssistantDraft, assistantMessages, isAiStreaming, appendAssistantExchange, handleStopStreaming, messageListRef }`

**논의 필요**: 없음
**추천**: 스트리밍 로직이 가장 복잡한 부분 — 훅으로 격리하면 디버깅이 쉬워짐
**사용자 방향**:

---

### 8차: useUploadForm 훅

**작업내용**
- 업로드 폼 관련 상태 추출
  - 상태: `isUploadPanelOpen`, `formState`, `uploadState`, `retryState`, `selectedAudioFile`, `selectedAudioDurationMs`, `selectedAudioPreviewUrl`, `isAdditionalInfoOpen`
  - ref: `fileInputRef`
  - effect: preview URL revoke
  - 함수: `updateFormState()`, `applySelectedAudioFile()`, `handleAudioFileChange()`, `handleUploadSubmit()`
- 반환: `{ isUploadPanelOpen, setIsUploadPanelOpen, formState, uploadState, selectedAudioFile, hasAudioReady, ... }`

**논의 필요**: 없음
**추천**: 녹음 훅(3차)과 연동 — `startRecording`이 `setIsUploadPanelOpen(true)` 호출
**사용자 방향**:

---

### 9차: useTranscriptEditor 훅

**작업내용**
- 세그먼트 편집 관련 상태 추출
  - 상태: `editingSegmentId`, `editingSegmentText`, `editingSegmentSaving`, `transcriptQuery`
  - 파생값: `normalizedTranscriptQuery`, `transcriptMatchCount`
  - 함수: `startEditingSegment()`, `cancelEditingSegment()`, `saveEditingSegment()`, `handleSpeakerLabelChange()`

**논의 필요**: 없음
**추천**: 편집 로직은 뷰어와 묶이지만 상태는 독립
**사용자 방향**:

---

### 10차: useExport 훅

**작업내용**
- 내보내기 관련 상태 + 함수 추출
  - 상태: `isAiExportOpen`
  - ref: `exportDropdownRef`
  - effect: 외부 클릭 닫기
  - 함수: `handleExportClipboard()`, `buildAiExportText()`, `buildComprehensiveReportMarkdown()`, `handleAiExportClipboard()`, `handleAiExportTextFile()`, `handleComprehensiveReportTextFile()`

**논의 필요**: 없음
**추천**: 내보내기 함수가 6개로 많지만 전부 순수 로직 — 깔끔하게 격리 가능
**사용자 방향**:

---

### 11차: useTrendAnalysis 훅

**작업내용**
- 추이 분석 관련 상태 추출
  - 상태: `trendAnalysis`
  - ref: `trendAbortControllerRef`
  - 함수: `handleStartTrendAnalysis()`, `handleStopTrendAnalysis()`

**논의 필요**: 없음
**추천**: 가장 작은 훅 — 빠르게 추출
**사용자 방향**:

---

### 12차: useDeleteRecord 훅

**작업내용**
- 삭제 관련 상태 추출
  - 상태: `isDeleteConfirmOpen`, `isDeleting`
  - 함수: `handleDeleteRecord()`

**논의 필요**: 없음
**추천**: 3개 항목, 가장 간단
**사용자 방향**:

---

### 13차: useSaveToast 훅

**작업내용**
- 토스트 관련 상태 + effect 추출
  - 상태: `saveToast`, `recentlySavedId`
  - effect: 자동 dismiss 2개 (3초, 2초)
  - 함수: `showSaveToast(message)`, `markRecentlySaved(id)`

**논의 필요**: 없음
**추천**: 범용 토스트 훅으로 만들면 다른 곳에서도 재사용 가능
**사용자 방향**:

---

## Phase 3: 컴포넌트 분리 (UI 역할 분리)

### 14차: EmptyLanding 컴포넌트

**작업내용**
- 빈 상태 랜딩 UI를 `empty-landing.tsx`로 추출
- props: `{ onStartRecording, onFileUpload, recordingPhase, recordingElapsedMs, recordingError, hasAudioReady, selectedAudioFile, ... }`
- 녹음 상태 블록, 오디오 준비 카드 포함

**논의 필요**: 없음
**추천**: 방금 버그 수정한 영역 — 분리하면 다시는 안 깨짐
**사용자 방향**:

---

### 15차: RecordSidebar 컴포넌트

**작업내용**
- 좌측 사이드바 전체를 `record-sidebar.tsx`로 추출
- 하위 포함: 새 기록 버튼, 검색/필터, 레코드 리스트(전체/학생별), 삭제 확인 모달
- props: `useRecordList` 반환값 + `useDeleteRecord` 반환값

**논의 필요**: 없음
**추천**: 사이드바가 약 400줄 — 독립 컴포넌트로 적합
**사용자 방향**:

---

### 16차: RecordListItem 컴포넌트

**작업내용**
- 레코드 리스트 아이템 렌더링을 `record-list-item.tsx`로 추출
- 상태 배지, 날짜, 학생명, 상담유형 표시
- props: `{ record, isSelected, isRecentlySaved, onSelect }`

**논의 필요**: 없음
**추천**: 리스트 렌더 최적화(React.memo) 적용 가능
**사용자 방향**:

---

### 17차: UploadPanel 컴포넌트

**작업내용**
- 업로드 패널(새 기록 만들기 폼)을 `upload-panel.tsx`로 추출
- 파일 선택, 녹음, 폼 입력, 제출 버튼 포함
- props: `useUploadForm` 반환값 + `useRecordingMachine` 반환값

**논의 필요**: 없음
**추천**: 폼 + 녹음이 합쳐진 가장 복잡한 패널 — 분리 효과 큼
**사용자 방향**:

---

### 18차: RecordDetailHeader 컴포넌트

**작업내용**
- 상세 헤더(제목, 메타, 상태, 오디오 플레이어)를 `record-detail-header.tsx`로 추출
- props: `{ record, detail, audioPlayerRef, onTimeUpdate, onRetry, onRefresh }`

**논의 필요**: 없음
**추천**: 오디오 플레이어 제어와 메타데이터 표시를 한 단위로
**사용자 방향**:

---

### 19차: TranscriptViewer 컴포넌트

**작업내용**
- 원문 뷰어 패널을 `transcript-viewer.tsx`로 추출
- 검색 바, 세그먼트 목록, 인라인 편집 포함
- props: `useTranscriptEditor` 반환값 + `useAudioPlayer` 일부

**논의 필요**: 없음
**추천**: 가장 인터랙션이 많은 영역 — 단독 컴포넌트로 관리해야 함
**사용자 방향**:

---

### 20차: TranscriptSegment 컴포넌트

**작업내용**
- 개별 세그먼트 행을 `transcript-segment.tsx`로 추출
- 일반 모드 / 편집 모드 분기
- 화자 라벨 클릭 → 톤 변경, 텍스트 클릭 → 편집 전환
- React.memo로 불필요한 리렌더 방지

**논의 필요**: 없음
**추천**: 세그먼트가 수십~수백 개 렌더링되므로 memo 효과가 큼
**사용자 방향**:

---

### 21차: AssistantPanel 컴포넌트

**작업내용**
- AI 채팅 패널을 `assistant-panel.tsx`로 추출
- 퀵 프롬프트, 메시지 리스트, 입력 폼, 내보내기 드롭다운 포함
- props: `useAssistantChat` 반환값 + `useExport` 반환값

**논의 필요**: 없음
**추천**: 채팅 UI는 독립적이므로 분리가 자연스러움
**사용자 방향**:

---

### 22차: TrendAnalysisPanel 컴포넌트

**작업내용**
- 추이 분석 영역을 `trend-analysis-panel.tsx`로 추출
- props: `useTrendAnalysis` 반환값

**논의 필요**: 없음
**추천**: 작은 컴포넌트, 빠르게 분리
**사용자 방향**:

---

### 23차: DeleteConfirmModal 컴포넌트

**작업내용**
- 삭제 확인 모달을 `delete-confirm-modal.tsx`로 추출
- props: `{ isOpen, isDeleting, recordTitle, onConfirm, onCancel }`

**논의 필요**: 없음
**추천**: 모달은 항상 분리하는 게 표준
**사용자 방향**:

---

## Phase 4: CSS 모듈 분리

### 24차: CSS 모듈 컴포넌트 단위 분할

**작업내용**
- `counseling-record-workspace.module.css` (2,671줄)를 컴포넌트별로 분할
  - `record-sidebar.module.css` — 사이드바, 리스트, 필터, 검색
  - `upload-panel.module.css` — 업로드 폼, 녹음 상태
  - `record-detail-header.module.css` — 상세 헤더, 오디오 플레이어
  - `transcript-viewer.module.css` — 뷰어, 세그먼트
  - `assistant-panel.module.css` — AI 채팅, 내보내기
  - `empty-landing.module.css` — 빈 상태
  - `workspace-layout.module.css` — 페이지 셸, 그리드, 토스트, 공통
- 각 컴포넌트가 자기 CSS만 import

**논의 필요**: 없음
**추천**: 컴포넌트 분리 후 한 번에 CSS도 분리
**사용자 방향**:

---

### 25차: 공유 CSS 변수 및 공통 스타일 정리

**작업내용**
- 반복되는 CSS 패턴(버튼, 인라인 메시지, 폼 인풋)을 공통 클래스로 추출
- `_shared.module.css` 또는 Tailwind 유틸리티로 통합
- 색상 변수 정리: 현재 인라인으로 산재된 `var(--*)` 변수 목록화

**논의 필요**: 없음
**추천**: 중복 클래스 제거 → CSS 총량 30% 감소 예상
**사용자 방향**:

---

## Phase 5: 서버 코드 정리

### 26차: counseling-records-service.ts 분리

**작업내용**
- 1,430줄 서비스를 역할별로 분리
  - `counseling-records-service.ts` — CRUD 핵심 (생성, 조회, 수정, 삭제)
  - `counseling-transcription-service.ts` — STT 전사 처리, 재시도
  - `counseling-analysis-service.ts` — AI 분석, 스트리밍 요약
- 공통 DB 쿼리는 repository 패턴으로 이동

**논의 필요**: 없음
**추천**: 서비스가 커지면 트랜잭션 경계가 흐려짐 — 역할별 분리가 안전
**사용자 방향**:

---

### 27차: Repository 패턴 정리

**작업내용**
- `counseling-records-repository.ts` 생성
- 서비스에서 직접 호출하던 DB 쿼리를 repository로 이동
- 서비스 → repository → DB 계층 확립

**논의 필요**: 없음
**추천**: 현재 서비스가 직접 drizzle 쿼리를 실행 — 테스트/교체가 어려움
**사용자 방향**:

---

## Phase 6: 통합 정리 및 문서화

### 28차: 배럴 익스포트 및 디렉토리 구조 최종 정리

**작업내용**
- `counseling-record-workspace/` 디렉토리 최종 구조:
  ```
  counseling-record-workspace/
  ├── index.ts                         # 배럴 익스포트
  ├── counseling-record-workspace.tsx   # 조합 컴포넌트 (~200줄)
  ├── workspace-layout.module.css      # 레이아웃 전용
  ├── types.ts                         # 타입
  ├── constants.ts                     # 상수
  ├── utils.ts                         # 순수 유틸
  ├── api.ts                           # API 호출 래퍼
  ├── prompts.ts                       # 프롬프트 빌더
  ├── hooks/
  │   ├── use-recording-machine.ts
  │   ├── use-audio-player.ts
  │   ├── use-record-list.ts
  │   ├── use-record-detail.ts
  │   ├── use-assistant-chat.ts
  │   ├── use-upload-form.ts
  │   ├── use-transcript-editor.ts
  │   ├── use-export.ts
  │   ├── use-trend-analysis.ts
  │   ├── use-delete-record.ts
  │   └── use-save-toast.ts
  └── components/
      ├── empty-landing.tsx
      ├── empty-landing.module.css
      ├── record-sidebar.tsx
      ├── record-sidebar.module.css
      ├── record-list-item.tsx
      ├── upload-panel.tsx
      ├── upload-panel.module.css
      ├── record-detail-header.tsx
      ├── record-detail-header.module.css
      ├── transcript-viewer.tsx
      ├── transcript-viewer.module.css
      ├── transcript-segment.tsx
      ├── assistant-panel.tsx
      ├── assistant-panel.module.css
      ├── trend-analysis-panel.tsx
      └── delete-confirm-modal.tsx
  ```
- 루트 `counseling-record-workspace.tsx`는 훅 조합 + 컴포넌트 배치만 (~200줄)

**논의 필요**: 없음
**추천**: 이 구조가 되면 어떤 기능을 수정해도 관련 파일 1~2개만 열면 됨
**사용자 방향**:

---

### 29차: CLAUDE.md 리팩토링 컨벤션 추가

**작업내용**
- `CLAUDE.md`에 컴포넌트 분리 기준, 훅 작성 규칙, CSS 모듈 분리 규칙 추가
  - feature 디렉토리 구조 표준
  - 훅 네이밍 및 반환값 규칙
  - 컴포넌트 단위 CSS 모듈 규칙
  - 서비스 역할 분리 기준
  - 파일 크기 경고 기준 (컴포넌트 300줄, 서비스 500줄, CSS 400줄)

**논의 필요**: 없음
**추천**: 리팩토링 결과를 규칙으로 고정해야 다시 안 커짐
**사용자 방향**:

---

### 30차: 전체 빌드·린트·타입체크 통과 확인 및 최종 검증

**작업내용**
- `pnpm --filter @yeon/web build` 통과
- 모든 import 경로 정합성 확인
- CSS 클래스 미사용/누락 확인
- 브라우저 수동 테스트: 녹음, 업로드, 목록, 상세, AI 채팅, 내보내기, 삭제
- Playwright 자동 테스트 실행 (세션 주입 → 주요 플로우)

**논의 필요**: 없음
**추천**: 30차까지 완료 후 develop 머지
**사용자 방향**:

---

## 실행 순서 및 의존성

```
Phase 1 (기반)    : 1 → 2
Phase 2 (훅)     : 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13
Phase 3 (컴포넌트) : 14 → 15 → 16 → 17 → 18 → 19 → 20 → 21 → 22 → 23
Phase 4 (CSS)     : 24 → 25
Phase 5 (서버)    : 26 → 27  (Phase 1~4와 병렬 가능)
Phase 6 (통합)    : 28 → 29 → 30
```

## 예상 프롬프트 수

| Phase | 차수 | 예상 프롬프트 | 이유 |
|-------|------|-------------|------|
| 1 | 1~2 | 2회 | 기계적 이동 |
| 2 | 3~13 | 11회 | 훅당 1회, 상태 연동 주의 |
| 3 | 14~23 | 10회 | 컴포넌트당 1회, JSX 이동 |
| 4 | 24~25 | 2회 | CSS 분할 + 정리 |
| 5 | 26~27 | 2회 | 서비스 분리 |
| 6 | 28~30 | 3회 | 구조 정리 + 문서 + 검증 |
| **합계** | **30** | **~30회** | |

## 목표 결과

| Before | After |
|--------|-------|
| 컴포넌트 1개 (3,549줄) | 루트 컴포넌트 ~200줄 + 하위 10개 |
| CSS 1개 (2,671줄) | CSS 7개 (각 ~300줄) |
| 커스텀 훅 0개 | 11개 (각 ~80줄) |
| 서비스 1개 (1,430줄) | 서비스 3개 + repo 1개 |
| 수정 시 3,549줄 전체 파악 필요 | 관련 파일 1~2개만 열면 됨 |
