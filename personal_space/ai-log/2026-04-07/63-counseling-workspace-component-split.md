# 상담 기록 워크스페이스 컴포넌트 책임 분리 설계

## 목적

- 현재 [counseling-record-workspace.tsx](/home/osuma/coding_stuffs/yeon/apps/web/src/features/counseling-record-workspace/counseling-record-workspace.tsx)는 데이터 로딩, 업로드/녹음, AI 보조, 원문 뷰어, 빈 상태, 상세 헤더를 한 파일에서 모두 처리한다.
- 6차 이후 실제 UI 개편을 안정적으로 진행하려면 먼저 책임 경계를 고정해야 한다.
- 이번 문서는 `지금 당장 파일을 쪼개지 않고`, 어떤 단위로 분리할지와 어떤 상태를 어디에 둘지 설계만 확정한다.

## 현재 파일에서 섞여 있는 책임

### 1. 순수 포맷팅/파생 계산

- 날짜, 시간, 파일 크기, 원문 매치, 하이라이트, summary/action/quick prompt 생성
- 근거
  - `counseling-record-workspace.tsx:104-681`

### 2. 워크스페이스 서버 데이터 orchestration

- 목록 로딩
- 상세 로딩
- 선택 기록 유지
- 재전사/새로고침
- 처리 중 자동 새로고침
- 근거
  - `counseling-record-workspace.tsx:684-1030`
  - `counseling-record-workspace.tsx:1240-1334`

### 3. 업로드/녹음 플로우

- 파일 선택
- 브라우저 녹음
- 선택 오디오 미리보기
- 생성 폼 상태
- 업로드 submit
- 근거
  - `counseling-record-workspace.tsx:701-745`
  - `counseling-record-workspace.tsx:1040-1479`

### 4. AI 보조 로컬 상태

- assistant draft
- record별 message store
- quick prompt 응답 생성
- 근거
  - `counseling-record-workspace.tsx:693-697`
  - `counseling-record-workspace.tsx:586-681`
  - `counseling-record-workspace.tsx:934-970`
  - `counseling-record-workspace.tsx:1454-1479`

### 5. 원문 오디오/뷰어 인터랙션

- current audio time
- seek
- transcript query
- 탭 전환
- 근거
  - `counseling-record-workspace.tsx:689-692`
  - `counseling-record-workspace.tsx:735-742`
  - `counseling-record-workspace.tsx:972-1028`
  - `counseling-record-workspace.tsx:1482-1500`

### 6. 화면 렌더링

- 상단 헤더
- 좌측 생성/탐색
- 중앙 상세/원문/요약/액션
- 우측 AI
- 근거
  - `counseling-record-workspace.tsx:1503-2499`

## 분리 원칙

### 1. 부모는 orchestration만 맡는다

- 최상위 `CounselingRecordWorkspace`는 상태 연결과 데이터 흐름 조합만 맡는다.
- 긴 JSX와 순수 렌더 로직은 자식 컴포넌트로 이동한다.

### 2. state source of truth는 부모 또는 훅 하나에만 둔다

- 리스트, 선택 기록, 상세 캐시는 각각 단일 source of truth를 갖는다.
- 하위 컴포넌트가 같은 상태를 복제해서 들고 있지 않는다.

### 3. presentational component는 fetch를 직접 하지 않는다

- `RecordList`, `WorkspaceHeader`, `AssistantPanel` 같은 컴포넌트는 props만 받고 렌더한다.
- fetch, retry, refresh는 훅 또는 부모 action으로만 처리한다.

### 4. 지금은 CSS를 쪼개지 않는다

- UI가 안정되기 전까지는 CSS module을 하나로 유지한다.
- 컴포넌트 분리와 스타일 파일 분리를 같은 차수에 하지 않는다.

### 5. packages로 올리지 않는다

- 이 구조는 `apps/web/src/features/counseling-record-workspace` 내부 문제다.
- 아직 공용 패키지 추출 근거가 없다.

## 목표 파일 구조

```text
apps/web/src/features/counseling-record-workspace/
  counseling-record-workspace.tsx          # 최상위 orchestrator
  counseling-record-workspace.module.css   # 당분간 단일 유지
  index.ts
  components/
    workspace-header.tsx
    workspace-sidebar.tsx
    create-record-panel.tsx
    record-list.tsx
    selected-record-shell.tsx
    record-detail-header.tsx
    record-viewer.tsx
    transcript-tab.tsx
    summary-tab.tsx
    actions-tab.tsx
    assistant-panel.tsx
    workspace-empty-state.tsx
  hooks/
    use-counseling-record-data.ts
    use-counseling-record-upload.ts
    use-counseling-record-assistant.ts
    use-audio-player-state.ts
  lib/
    workspace-formatters.ts
    workspace-derived-data.ts
```

## 컴포넌트 책임 정의

## 1. `CounselingRecordWorkspace`

### 책임

- feature 전체 orchestration
- 훅 조합
- 상태별 화면 분기
- 자식 컴포넌트에 필요한 props 전달

### 남겨둘 상태

- 없음이 이상적이지만, 초기 분리 단계에서는 최소 조합 상태만 유지 가능
- 궁극적으로는 훅 호출 결과를 조합하는 수준으로 축소

### 하지 말 것

- 300줄 이상의 JSX 보유
- fetch 로직 직접 포함
- summary/action 생성 로직 직접 포함

## 2. `WorkspaceHeader`

### 책임

- 상단 제목줄 렌더
- 페이지 제목
- 1줄 보조 문구
- 약한 보조 액션

### props

- `title`
- `description`
- `onLogout?`
- `secondaryActions?`

### 포함하지 말 것

- 메트릭 카드
- 기록 수 요약
- 상세 상태 배지 나열

## 3. `WorkspaceSidebar`

### 책임

- 좌측 전체 레이아웃 조합
- `CreateRecordPanel`
- `RecordList`
- 검색/필터 토글

### props

- 생성 영역용 props
- 탐색 영역용 props
- 현재 상태가 `첫 진입/생성 흐름/목록 탐색/선택 후` 중 무엇인지

### 포함하지 말 것

- fetch 직접 호출
- AI 관련 상태

## 4. `CreateRecordPanel`

### 책임

- 업로드/녹음 CTA
- 선택 오디오 카드
- 저장 액션
- `추가 정보` 접기/펼치기

### props

- `isOpen`
- `selectedAudioFile`
- `selectedAudioDurationMs`
- `selectedAudioPreviewUrl`
- `formState`
- `uploadState`
- `isRecording`
- `recordingElapsedMs`
- `recordingError`
- `onOpenChange`
- `onFilePick`
- `onStartRecording`
- `onStopRecording`
- `onFormChange`
- `onSubmit`

### 내부에 둘 수 있는 로컬 UI 상태

- `추가 정보` 디스클로저 open 여부

### 포함하지 말 것

- 실제 API submit
- media recorder ref 관리

## 5. `RecordList`

### 책임

- 검색 입력
- 필터 열기 버튼
- 목록 상태 렌더
- record item 반복 렌더

### props

- `records`
- `selectedRecordId`
- `searchTerm`
- `filter`
- `isLoading`
- `loadError`
- `onSearchTermChange`
- `onFilterChange`
- `onSelectRecord`
- `onCreateRecord`

### 분리 후보

- `RecordListItem`
- `RecordListState`

### 포함하지 말 것

- `filteredRecords` 계산 로직
- 선택된 상세 정보 조회

## 6. `WorkspaceEmptyState`

### 책임

- 첫 진입, 목록 탐색, 선택 전 중앙 상태를 공통 패턴으로 렌더
- 제목 1개
- 1줄 설명
- CTA 1~2개

### props

- `title`
- `description`
- `primaryAction`
- `secondaryAction?`
- `variant`

### 포함하지 말 것

- 큰 설명 카드
- 복수 패널 레이아웃

## 7. `SelectedRecordShell`

### 책임

- 기록 선택 후 중앙 영역의 큰 틀 조합
- `RecordDetailHeader`
- `RecordViewer`
- 선택 후 빈 상태/로딩 상태 전환

### props

- `record`
- `detail`
- `activeTab`
- `onTabChange`
- 관련 action handlers

### 포함하지 말 것

- 좌측 목록 UI
- AI 패널 UI

## 8. `RecordDetailHeader`

### 책임

- 선택 기록 제목
- 핵심 상태
- 최소 메타
- 오디오 패널
- 새로고침 / 재전사 액션

### props

- `record`
- `detail`
- `currentAudioTimeMs`
- `audioLoadError`
- `retryState`
- `onRefresh`
- `onRetry`
- `onAudioTimeUpdate`

### 포함하지 말 것

- 요약 카드
- 원문 탭
- AI 설명

## 9. `RecordViewer`

### 책임

- `원문 / 요약 / 액션` 탭 전환
- 탭별 서브컴포넌트 조합

### props

- `activeTab`
- `onTabChange`
- `transcriptProps`
- `summaryProps`
- `actionsProps`

### 서브컴포넌트

- `TranscriptTab`
- `SummaryTab`
- `ActionsTab`

## 10. `TranscriptTab`

### 책임

- 원문 검색
- 원문 세그먼트 렌더
- 원문 상태별 empty/loading 처리
- seek action 연결

### props

- `segments`
- `query`
- `matchCount`
- `isLoading`
- `status`
- `audioUrl`
- `currentAudioTimeMs`
- `onQueryChange`
- `onSeek`

### 포함하지 말 것

- 탭 헤더 외의 상세 메타 나열

## 11. `SummaryTab`

### 책임

- 구조화 요약 블록 렌더

### props

- `sections`
- `studentName`

### 포함하지 말 것

- summary 생성 규칙

## 12. `ActionsTab`

### 책임

- 후속 액션 리스트 렌더

### props

- `items`

### 포함하지 말 것

- 액션 item 생성 규칙

## 13. `AssistantPanel`

### 책임

- 선택 후 AI 패널 렌더
- 제목
- 퀵프롬프트 일부
- 대화 리스트
- 입력창

### props

- `record`
- `messages`
- `draft`
- `quickPrompts`
- `onDraftChange`
- `onPromptSubmit`
- `onQuickPromptSelect`
- `isVisible`

### 내부에 둘 수 있는 로컬 UI 상태

- `컨텍스트 보기` 접힘 여부
- `더 많은 프롬프트 보기` 접힘 여부

### 포함하지 말 것

- assistant reply 생성 로직
- record 선택 조건

## 훅 책임 정의

## 1. `useCounselingRecordData`

### 책임

- 목록 로딩
- 상세 로딩/캐시
- 선택 기록 관리
- 필터 적용 전 원본 records 유지
- refresh/retry action 제공

### 반환값

- `records`
- `filteredRecords`
- `selectedRecordId`
- `selectedRecord`
- `selectedRecordDetail`
- `isLoadingList`
- `isLoadingDetail`
- `loadError`
- `retryState`
- `readyRecordCount`
- `searchTerm`
- `recordFilter`
- `setSearchTerm`
- `setRecordFilter`
- `selectRecord`
- `refreshRecordDetail`
- `retryTranscription`
- `upsertCreatedRecord`

### source of truth

- `records`
- `recordDetails`
- `selectedRecordId`

## 2. `useCounselingRecordUpload`

### 책임

- 파일 선택/검증
- 미리보기 URL 생성/정리
- 녹음 시작/중지
- 업로드 form state
- 업로드 submit

### 반환값

- `isUploadPanelOpen`
- `setIsUploadPanelOpen`
- `formState`
- `updateFormState`
- `selectedAudioFile`
- `selectedAudioDurationMs`
- `selectedAudioPreviewUrl`
- `uploadState`
- `isRecording`
- `recordingElapsedMs`
- `recordingError`
- `handleAudioFileChange`
- `startRecording`
- `stopRecording`
- `submitUpload`
- `resetUploadState`

### source of truth

- 업로드/녹음 관련 모든 상태

## 3. `useCounselingRecordAssistant`

### 책임

- record별 message store
- quick prompt 파생
- initial assistant message 세팅
- prompt submit

### 반환값

- `assistantDraft`
- `setAssistantDraft`
- `assistantMessages`
- `quickPrompts`
- `appendAssistantExchange`

### source of truth

- `assistantMessagesByRecord`
- `assistantDraft`

## 4. `useAudioPlayerState`

### 책임

- 현재 재생 시간
- seek
- 로딩 에러
- selected record/audio url 변경 시 초기화

### 반환값

- `audioPlayerRef`
- `currentAudioTimeMs`
- `audioLoadError`
- `setAudioLoadError`
- `handleAudioTimeUpdate`
- `seekAudioToTime`

### source of truth

- `currentAudioTimeMs`
- `audioLoadError`

## lib 분리 대상

## `workspace-formatters.ts`

- 날짜/길이/파일 크기 포맷
- transcript time
- error message reader
- request id builder

## `workspace-derived-data.ts`

- `buildSummaryCards`
- `buildSummarySections`
- `buildActionItems`
- `buildQuickPrompts`
- `buildInitialAssistantMessages`
- `buildAssistantReply`
- `isTranscriptSegmentMatched`
- `renderHighlightedText`
- `isTranscriptSegmentActive`

## 부모에 남길 상태 vs 자식 로컬 상태

## 부모 또는 훅에 남길 것

- records / recordDetails / selectedRecordId
- activeTab
- searchTerm / recordFilter
- transcriptQuery
- upload/recording state
- assistant draft / messages
- audio current time

## 자식 로컬 상태로 허용할 것

- `추가 정보` 접힘
- `필터 열기` 토글
- AI 패널 `컨텍스트 보기`
- AI 패널 `프롬프트 더보기`

## 자식 로컬 상태로 두면 안 되는 것

- selectedRecordId
- filteredRecords
- retryState
- uploadState
- assistant message store

## 권장 분리 순서

### 1단계

- 순수 함수들을 `lib/`로 이동
- 렌더 결과 변화 없음

### 2단계

- `WorkspaceHeader`
- `WorkspaceEmptyState`
- `RecordList`
- `AssistantPanel`
- 가장 큰 JSX 블록부터 presentational 분리

### 3단계

- `useCounselingRecordData`
- `useCounselingRecordUpload`
- `useCounselingRecordAssistant`
- `useAudioPlayerState`

### 4단계

- `SelectedRecordShell`
- `RecordViewer`
- `TranscriptTab / SummaryTab / ActionsTab`

## 하지 말아야 할 분리

- 상태 변경과 fetch를 각 하위 컴포넌트에 흩뿌리기
- 컴포넌트마다 별도 CSS module을 동시에 도입하기
- 지금 단계에서 `packages/*`로 추출하기
- AI 패널/원문 뷰어/업로드 패널에 중복 summary logic 두기
- `selectedRecord`와 `selectedRecordDetail`을 자식에서 다시 계산하기

## 완료 기준

- 최상위 파일은 `orchestrator`처럼 읽혀야 한다.
- 각 하위 컴포넌트 이름만 보면 역할이 바로 보여야 한다.
- 훅은 `데이터`, `업로드`, `AI`, `오디오` 네 덩어리로만 이해돼야 한다.
- 다음 차수부터 레이아웃 수정이 컴포넌트 단위로 안전하게 가능해야 한다.

## 차수 6 입력값

- 차수 6에서는 이 문서를 기준으로 상단 헤더 슬림화를 실제 UI 변경 계획으로 구체화한다.
