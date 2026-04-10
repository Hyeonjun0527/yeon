# PIPELINES.md — Yeon 핵심 파이프라인 정리

이 문서는 Yeon 플랫폼의 핵심 서비스·구현 파이프라인을 설명한다.
다이어그램과 서술식 설명을 함께 읽으면 코드를 열지 않아도 전체 흐름을 파악할 수 있다.

---

## 목차

1. [음성 업로드 → 전사 파이프라인](#1-음성-업로드--전사-파이프라인)
2. [AI 분석 파이프라인](#2-ai-분석-파이프라인)
3. [AI 채팅 스트림 파이프라인](#3-ai-채팅-스트림-파이프라인)
4. [추이 분석 파이프라인](#4-추이-분석-파이프라인)
5. [파일 분석 → 수강생 추출 파이프라인](#5-파일-분석--수강생-추출-파이프라인)
6. [클라이언트 폴링 → UI 전환 파이프라인](#6-클라이언트-폴링--ui-전환-파이프라인)

---

## 1. 음성 업로드 → 전사 파이프라인

```
사용자: 녹음 종료 또는 파일 드롭
  │
  ├─ [즉시] addProcessingRecord()
  │    └─ temp-{timestamp} ID로 임시 레코드 생성 → phase='processing'
  │
  ▼
POST /api/v1/counseling-records (FormData)
  │ audio, sessionTitle, audioDurationMs, studentName, counselingType
  │
  ├─ persistAudioFile()
  │    ├─ MIME 타입 + 파일 크기 검증
  │    ├─ SHA256 계산 (중복 감지용)
  │    └─ Cloudflare R2 업로드
  │
  ├─ INSERT counseling_records (status='processing')
  │
  └─ scheduleCounselingRecordTranscription()  ← 메모리 큐에 등록, 즉시 반환
       │
       ▼ [비동기 실행]
  runTranscriptionForRecord()
       │
       ├─ buildTranscriptionSources()
       │    ├─ R2에서 오디오 다운로드
       │    ├─ 파일 크기 > 24MB  →  ffmpeg으로 청크 분할
       │    └─ 청크 길이 > 8분   →  추가 분할
       │
       ├─ transcribeStoredAudio()  [OpenAI STT]
       │    ├─ 모델: gpt-4o-transcribe-diarize (화자 분리)
       │    ├─ known_speaker_names: ["멘토", studentName] 전달
       │    ├─ 404/400/403 에러 → gpt-4o-transcribe 폴백 재시도
       │    └─ 청크 병합 → PersistedTranscriptSegment[]
       │
       ├─ resolveSpeakerNames()  [화자 식별 AI]
       │    ├─ 호칭·질문/응답 패턴·존댓말로 화자 역할 추론
       │    └─ { mapping: {"화자 A": "멘토", ...}, studentName } 반환
       │
       └─ DB Transaction
            ├─ UPDATE counseling_records  status='ready', transcriptText, sttModel
            ├─ INSERT counseling_transcript_segments  (모든 세그먼트)
            └─ 수강생명 자동완성 업데이트

       실패 시:
            UPDATE counseling_records  status='error', errorMessage
```

### 논리 설명

녹음이 끝나는 순간, 클라이언트는 서버 응답을 기다리지 않고 **temp- 접두사 임시 레코드를 즉시 목록에 추가**한다. 사용자 눈에는 업로드가 시작된 순간부터 레코드가 보이기 때문에 빈 화면이 없다.

서버에서 파일을 받으면 첫 번째로 하는 일은 R2 저장이다. DB에 레코드를 먼저 만들고 나서 전사를 예약하는 방식이라, 저장은 되었지만 전사가 아직 안 된 `processing` 상태가 정상적인 중간 상태다.

전사 예약(`scheduleCounselingRecordTranscription`)은 **메모리 맵 기반**이다. 싱글 인스턴스 서버에서는 문제가 없지만, 다중 인스턴스 배포 시에는 DB 기반 락이나 외부 큐(BullMQ 등)로 교체해야 한다.

실제 전사(`runTranscriptionForRecord`)는 파일 크기와 길이 기준으로 청크를 나눈다. OpenAI의 음성 파일 한도가 24MB, 화자 분리 모델의 정확도 한계가 약 8분이기 때문이다. 청크를 나눠서 각각 전사한 뒤 결과를 순서대로 합친다.

화자 분리 모델이 반환하는 라벨은 "speaker_0", "speaker_1" 같은 임의 식별자다. 이걸 "멘토", "수강생 이름" 같은 실제 이름으로 바꾸기 위해 **두 번째 AI 호출(`resolveSpeakerNames`)**을 한다. 이 AI는 대화 맥락(호칭, 질문하는 쪽이 멘토, 존댓말 방향 등)을 보고 각 화자 라벨에 실제 역할을 매핑한 JSON을 반환한다.

마지막으로 세그먼트 저장, 상태 갱신, 수강생명 자동완성을 하나의 트랜잭션으로 처리한다. 트랜잭션이 실패하면 `status='error'`로 롤백되어 재시도가 가능한 상태로 남는다.

---

## 2. AI 분석 파이프라인

```
레코드 status='ready' 감지 (클라이언트 폴링 또는 직접 요청)
  │
  ▼
POST /api/v1/counseling-records/{recordId}/analyze
  │
  ├─ 상태 검증
  │    ├─ status !== 'ready'          → 400 에러
  │    └─ transcriptSegmentCount < 1  → 400 에러
  │
  ├─ 캐시 확인
  │    └─ analysisResult 이미 존재    → 즉시 반환 (재분석 없음)
  │
  └─ analyzeCounselingRecord()  [OpenAI]
       │
       ├─ 시스템 프롬프트: "부트캠프/교육 상담 전문가" 역할 정의
       ├─ 화자 분리 여부에 따라 프롬프트 분기
       │    ├─ 분리됨: 멘토/수강생 발화 구분하여 분석
       │    └─ 미분리: 전체 맥락으로 역할 추론
       │
       ├─ JSON 응답 파싱 → AnalysisResult
       │    ├─ summary    : 핵심 요약 (3~4문장)
       │    ├─ member     : 수강생 이름, 성격/학습 특성, 감정 변화
       │    ├─ issues[]   : 제목, 상세 설명(원문 인용), 타임스탬프
       │    ├─ actions    : 멘토 조치 / 수강생 권장사항 / 후속 확인사항
       │    └─ keywords[] : 핵심 키워드 3~5개
       │
       └─ UPDATE counseling_records  analysis_result = JSON
            └─ 이후 조회 시 캐시된 결과 즉시 반환
```

### 논리 설명

분석은 **한 번만 실행하고 결과를 DB에 캐싱**한다. 같은 레코드를 여러 번 분석 요청해도 OpenAI를 다시 호출하지 않는다. 분석이 비싸고 결과가 결정적이기 때문이다(수강생이 같은 대화를 다시 한 게 아니라면 결과가 달라질 이유가 없다).

분석 프롬프트의 핵심은 **역할 부여**다. "부트캠프 교육 상담 전문가" 역할로 지시하면 일반 대화 요약과 달리, 수강생의 학습 상태·감정·위험신호를 중심으로 읽는다. 화자 분리가 되어 있으면 멘토와 수강생 발화를 구분해서 더 정밀하게 분석한다.

반환 구조(`AnalysisResult`)는 API 계약(`packages/api-contract`)에 정의되어 있어서, 클라이언트가 구조를 예측하고 렌더링할 수 있다. 특히 `issues[].timestamp`는 세그먼트 타임스탬프와 연결해서 "이 이슈가 언제 나온 대화인지" UI에서 바로 점프할 수 있게 설계되어 있다.

---

## 3. AI 채팅 스트림 파이프라인

```
사용자: 메시지 입력 + 전송
  │
  ├─ [즉시] 사용자 메시지 낙관적 추가 → UI 즉시 반영
  │
  ▼
POST /api/v1/counseling-records/{recordId}/chat
  │ body: { messages: [{ role, content }, ...] }  ← 전체 히스토리
  │
  ├─ getCounselingRecordDetail()  레코드 + 세그먼트 로드
  │
  ├─ streamCounselingAiChat()
  │    ├─ 시스템 프롬프트 구성
  │    │    ├─ 세션 메타데이터 (제목, 날짜, 수강생명)
  │    │    ├─ 전체 트랜스크립트 텍스트
  │    │    ├─ 화자 분리 가이드 (speaker_label → 역할 해설)
  │    │    └─ 분석 결과 요약 (있으면 포함)
  │    │
  │    └─ OpenAI /chat/completions  stream=true
  │
  └─ transformOpenAiStream()  SSE 변환
       ├─ OpenAI delta → "data: {\"content\": \"...\"}\n\n"
       └─ 완료 시 "data: [DONE]\n\n"

  ▼ 클라이언트 readSseStream()
  ├─ "data: " 접두사 제거
  ├─ "[DONE]" 감지 시 스트림 종료
  └─ 청크마다 onUpdateMessages() → 텍스트가 실시간으로 화면에 추가
```

### 논리 설명

채팅은 **매 요청마다 전체 대화 히스토리를 함께 전송**하는 stateless 방식이다. 서버가 대화 세션 상태를 유지하지 않아도 되고, 클라이언트가 히스토리를 관리한다.

핵심은 시스템 프롬프트에 **전체 트랜스크립트를 컨텍스트로 포함**하는 것이다. AI는 단순한 Q&A 봇이 아니라, 해당 상담 내용을 이미 읽은 전문가처럼 동작한다. 멘토가 "아까 수강생이 진로 얘기 했을 때 어떤 감정이었나요?"라고 물으면, AI가 실제 세그먼트를 기반으로 답한다.

스트림은 OpenAI SSE → 서버 변환 레이어 → 클라이언트 SSE 파이프로 구성된다. 중간 변환 레이어(`transformOpenAiStream`)가 필요한 이유는 OpenAI 응답 포맷을 클라이언트가 직접 파싱하지 않아도 되도록 단순화하기 위해서다. 클라이언트는 `data: {"content": "..."}` 포맷만 기대하면 된다.

텍스트가 청크 단위로 도착할 때마다 화면에 즉시 추가되기 때문에, 사용자는 AI가 "타이핑"하는 것처럼 느낀다.

---

## 4. 추이 분석 파이프라인

```
사용자: 같은 수강생의 여러 기록 선택 → 추이 분석 요청
  │
  ▼
POST /api/v1/counseling-records/analyze-trend
  │ body: { recordIds: [id1, id2, ...] }
  │
  ├─ 검증
  │    ├─ 최대 5개 제한
  │    └─ 모든 레코드가 동일 수강생 소속인지 확인
  │
  ├─ getMultipleRecordsWithSegments()
  │    └─ 각 기록의 세그먼트 포함 상세 정보 일괄 로드
  │
  ├─ streamTrendAnalysis()
  │    ├─ 기록을 날짜순으로 정렬
  │    ├─ 시스템 프롬프트 구성
  │    │    ├─ 각 세션을 날짜·제목과 함께 타임라인으로 나열
  │    │    ├─ 분석 요청: 변화 추이, 반복 이슈, 개선점, 위험신호
  │    │    └─ 마지막 세션 기준으로 다음 멘토링 권장사항
  │    │
  │    └─ OpenAI stream=true
  │
  └─ transformOpenAiStream()  SSE 변환
       └─ 클라이언트로 실시간 스트리밍
```

### 논리 설명

단일 기록 분석이 "지금 이 상담에서 무슨 일이 있었나"를 보는 것이라면, 추이 분석은 **"이 수강생이 시간이 지나면서 어떻게 변하고 있나"**를 보는 것이다.

동일 수강생 검증이 중요하다. 다른 수강생의 기록이 섞이면 AI가 한 사람의 성장 궤적이 아니라 여러 사람의 기록을 엉뚱하게 비교하게 된다. 이 검증은 API 레이어에서 강제한다.

기록을 날짜순으로 정렬해서 타임라인 형태로 프롬프트를 만든다. AI는 "1회차 상담 → 2회차 상담 → 3회차 상담"의 흐름에서 수강생의 감정 변화, 반복되는 문제, 해결된 이슈, 새로 등장한 위험신호를 읽는다. 최대 5개로 제한하는 이유는 프롬프트 컨텍스트 크기 한계와 분석 질의 균형 때문이다.

---

## 5. 파일 분석 → 수강생 추출 파이프라인

```
파일 입력 (Excel, CSV, PDF, 이미지)
  │
  ├─ 파일 형식별 전처리
  │    ├─ Excel   → parseExcelToRows()  시트별 행 배열
  │    ├─ CSV     → parseCsvToRows()    행 배열
  │    ├─ PDF     → parsePdfToText()    텍스트 추출
  │    └─ 이미지  → analyzeImageWithAI()  Vision API 직접 분석
  │
  ├─ 행 수 판단
  │    └─ ≤ 100행 → 기존 방식 (전체 텍스트 AI 분석, Phase 1~3 스킵)
  │
  └─ > 100행 → 3단계 파이프라인:
       │
       Phase 1: 샘플 분석 (컬럼 식별)
       │  ├─ buildSampleText()  상위 20행만 추출
       │  └─ identifyColumnsWithAI()  [AI → JSON]
       │       ├─ extractable      : true / false (정형 데이터 여부)
       │       ├─ nameColumn       : 이름 컬럼 인덱스
       │       ├─ emailColumn      : 이메일 컬럼 인덱스 (없으면 null)
       │       ├─ phoneColumn      : 전화번호 컬럼 인덱스 (없으면 null)
       │       ├─ statusColumn     : 수강 상태 컬럼 인덱스 (없으면 null)
       │       ├─ cohortStrategy   : "by_sheet" | "by_column" | "single"
       │       └─ dirtyColumns[]   : AI 후처리가 필요한 컬럼 인덱스들
       │
       ├─ extractable: false (비정형 데이터)
       │    └─ 컬럼 수를 최대한 줄인 뒤 AI가 전체 텍스트 직접 분석
       │
       └─ extractable: true (정형 데이터)
            │
            Phase 2: 코드 기반 추출 (즉시, AI 호출 없음)
            │  ├─ 헤더 행 건너뜀
            │  ├─ 각 행: nameColumn 필수 / email, phone, status 선택
            │  └─ cohortStrategy에 따라 그룹화
            │       ├─ by_sheet  : 시트 이름 = 기수명
            │       ├─ by_column : 특정 컬럼 값 = 기수명
            │       └─ single    : 전체가 하나의 기수
            │
            ├─ dirtyColumns 없음 → 완료
            │
            └─ dirtyColumns 있음
                 │
                 Phase 3: AI 후처리 (dirty 컬럼만 대상)
                 └─ 추출 결과 + dirty 컬럼 원본값 → AI 정제
                      └─ 애매한 값 해석 (예: "수료 예정" → "active")

  ▼
ImportPreview
  └─ { cohorts: [{ name: "백엔드 3기", students: [...] }] }
```

### 논리 설명

수강생 명단 파일은 기관마다 형식이 천차만별이다. 어떤 곳은 엑셀에 열 제목이 있고 깔끔하게 정리되어 있지만, 어떤 곳은 병합 셀에 메모가 섞인 비정형 파일을 보낸다. 이 파이프라인은 **어떤 형태의 파일이든 수강생 목록을 뽑아낼 수 있도록** 설계된 적응형 추출 시스템이다.

**100행 기준점**이 중요하다. 소규모 파일은 전체를 AI에게 넘겨도 비용·지연이 감당되지만, 수백 명이 담긴 파일을 통째로 AI에 보내면 느리고 비싸다. 그래서 큰 파일은 3단계로 나눈다.

**Phase 1(샘플 분석)**의 목적은 "이 파일을 코드로 파싱할 수 있는가"를 AI에게 물어보는 것이다. 상위 20행과 헤더만 보면 컬럼 구조를 파악할 수 있기 때문에, 전체 파일을 보낼 필요가 없다. AI는 `extractable: true/false`와 각 컬럼의 인덱스를 JSON으로 반환한다.

`extractable: true`면 **Phase 2는 순수 코드**로 실행된다. AI 없이 인덱스 매핑만으로 모든 행을 처리하기 때문에 수백 행도 즉시 처리된다.

`dirtyColumns`는 "컬럼 자체는 찾았지만 값이 자유형식이라 코드로 해석하기 어려운 컬럼"을 뜻한다. 예를 들어 수강 상태 컬럼에 "수료", "수료예정", "중도탈락", "완료" 같은 다양한 표현이 섞여 있다면, Phase 2에서 raw 값을 그냥 담고 Phase 3에서 AI가 표준화한다. 이렇게 하면 전체 AI 호출 없이도 ambiguous한 부분만 정밀하게 처리할 수 있다.

---

## 6. 클라이언트 폴링 → UI 전환 파이프라인

```
레코드 업로드 직후 상태: records 배열에 temp-{ts} 레코드 존재
  │
  ├─ [즉시] phase='processing' → 로딩 UI + processingStep 애니메이션
  │
  ├─ onUploadComplete(tempId, realRecord) 콜백
  │    └─ temp-{ts} → 실제 서버 recordId로 교체 (replaceRecord)
  │
  └─ 3초마다 폴링 시작 (processing 레코드가 있는 동안)
       │
       ▼
  syncFromServer()  GET /api/v1/counseling-records
       │
       ├─ 서버 레코드와 로컬 레코드 병합
       │    ├─ aiMessages, transcript → 로컬 값 보존 (서버에는 없는 클라이언트 상태)
       │    └─ status, preview 등 → 서버 값으로 갱신
       │
       ├─ processing → ready 전환 감지?
       │    │
       │    └─ Yes:
       │         ├─ [즉시] fetchDetail(recordId)
       │         │    └─ 세그먼트 + analysisResult 포함 상세 로드
       │         │
       │         └─ MIN_PROCESSING_DISPLAY_MS (13초) 대기 후 UI 전환
       │              └─ 애니메이션이 자연스럽게 완료될 시간 보장
       │
       └─ 모든 레코드 ready → 폴링 중단

  ▼ ready 상태 레코드 선택 시
  useAiChat 자동 분석 트리거
       │
       └─ analysisResult 없으면 → POST .../analyze 자동 호출
            └─ 완료 후 updateAnalysisResult() → UI 갱신
```

### 논리 설명

클라이언트의 가장 큰 과제는 **"서버가 언제 전사를 끝낼지 모르는 상황에서 어떻게 사용자에게 자연스러운 경험을 줄 것인가"**다.

해답은 두 가지다. 첫째, 낙관적 UI다. 업로드가 시작되는 순간 임시 레코드를 목록에 추가하고 로딩 상태를 보여준다. 서버가 완료되기를 기다리는 동안 사용자는 빈 화면을 보지 않는다.

둘째, 폴링이다. WebSocket이나 SSE로 서버 푸시를 받는 대신, 3초마다 목록 API를 호출한다. 전사 중에만 폴링이 활성화되고, 모든 레코드가 `ready`가 되면 폴링이 멈춘다. 구현이 단순하고 서버 부담도 크지 않다.

병합 로직이 중요하다. 폴링으로 받아온 서버 데이터에는 클라이언트 전용 상태(`aiMessages`, `transcript`)가 없다. 그래서 서버 응답으로 로컬 상태를 그냥 덮어쓰면 안 된다. 병합 함수는 서버 값(status, preview 등)은 갱신하고 클라이언트 값(aiMessages 등)은 보존한다.

`MIN_PROCESSING_DISPLAY_MS`(13초)는 순수하게 UX를 위한 값이다. 실제 전사가 5초 만에 끝나더라도 13초 동안은 로딩 애니메이션을 보여준다. "너무 빠르게 끝났다"는 느낌이 오히려 "제대로 처리했나?"라는 불신을 유발하기 때문이다. 충분한 처리 시간을 보여주는 것이 신뢰감을 준다.

---

## 핵심 설계 결정 요약

| 결정 사항 | 선택 | 이유 |
|---|---|---|
| 전사 스케줄링 방식 | 메모리 맵 (인메모리 큐) | 단순함. 다중 인스턴스 배포 시 DB 락으로 교체 필요 |
| 오디오 청크 분할 기준 | 24MB / 8분 | OpenAI 파일 한도 + 화자 분리 정확도 |
| 화자 식별 | 전사 후 2차 AI 호출 | STT 모델이 반환하는 speaker_label을 실제 이름으로 의미화 |
| 분석 결과 캐싱 | DB JSONB 컬럼 | 재분석 불필요, 조회 시 즉시 반환 |
| 채팅 세션 상태 | 클라이언트 보관 (stateless API) | 서버가 세션 메모리를 유지할 필요 없음 |
| 폴링 전략 | 3초 간격 + 최소 13초 표시 | WebSocket 없이 단순 구현, UX 자연스러움 보장 |
| 파일 분석 임계값 | 100행 기준 2트랙 | 소규모는 전체 AI, 대규모는 샘플+코드+후처리 |
| dirty 컬럼 처리 | Phase 3 선택적 AI 호출 | 전체 AI 비용 없이 ambiguous 값만 정제 |
| 오디오 저장소 | Cloudflare R2 | 확장 가능, 서버 로컬 스토리지 의존 없음 |
| 권한 검증 방식 | 모든 쿼리에 userId 조건 | 테넌트 격리. DB 레벨에서 타 사용자 데이터 접근 차단 |
