# 75. 상담 AI 도우미 실시간 스트리밍 고도화

## 현황 진단

현재 AI 도우미는 **LLM을 호출하지 않는 규칙 기반 하드코딩**이다.

- `buildAssistantReply()` — if/else로 키워드 매칭 → 정적 문자열 반환
- `buildInitialAssistantMessages()` — 기록 선택 시 고정 안내 메시지 2개
- `getDefaultPromptChips()` — 고정 3개 프롬프트 칩
- 스트리밍 없음, 타이핑 효과 없음, 실제 분석 없음
- OpenAI API 키는 이미 `.env`에 있고, `openai-chat-test-service.ts`로 연동 테스트는 완료된 상태

**핵심 문제**: 사용자가 질문해도 원문을 실제로 읽지 않는 앵무새 응답이라 도우미 가치가 없다.

## 목표

1. 녹음 업로드 → 전사 완료 시, AI가 **자동으로 원문을 분석해 핵심 요약을 스트리밍**으로 채팅에 채움
2. 사용자 질문에 **원문 context를 넘겨 실제 LLM이 답변**하고, 토큰 단위로 스트리밍
3. ChatGPT 수준의 **거부감 없는 타이핑 UX** (토큰별 점진적 렌더링, 마크다운 지원)

## 차수별 계획

### 차수 1: 서버 — AI 채팅 스트리밍 API 엔드포인트

**작업내용**

- `apps/web/src/app/api/v1/counseling-records/[recordId]/chat/route.ts` 생성
- POST 요청: `{ messages: [{ role, content }] }`
- 서버에서 해당 기록의 transcript 전문을 DB에서 조회 → system prompt에 포함
- OpenAI Responses API (또는 Chat Completions API) 호출, `stream: true`
- SSE 형태로 클라이언트에 토큰 단위 스트리밍 응답 전달
- 인증 필수 (requireAuthenticatedUser), 기록 소유권 검증

**논의 필요**

- OpenAI Responses API vs Chat Completions API
  - Responses API: 이미 테스트 서비스에서 사용 중, 최신 모델 지원
  - Chat Completions API: 스트리밍이 더 성숙, 생태계 호환성
- 모델 선택: gpt-4.1-mini (비용 효율) vs gpt-4.1 (품질)
- system prompt에 transcript 전문을 넣을 때 토큰 한도 관리

**선택지**

- A) OpenAI Chat Completions API + stream — 스트리밍 안정적, 광범위한 레퍼런스
- B) OpenAI Responses API + stream — 이미 코드베이스에 패턴 존재

**추천**: A) Chat Completions API. 스트리밍 SSE 지원이 검증됐고 Next.js Route Handler에서 ReadableStream으로 파이핑이 직관적이다.

**사용자 방향**:

---

### 차수 2: 서버 — AI 시스템 프롬프트 설계

**작업내용**

- `apps/web/src/server/services/counseling-ai-service.ts` 생성
- system prompt 구성:
  - 역할 정의: "상담 기록 분석 전문 AI 도우미"
  - 원문 transcript 전체 (또는 요약)를 context로 포함
  - 기록 메타데이터 (학생명, 상담 유형, 날짜, 세션 제목)
  - 응답 가이드라인: 한국어, 실용적 포인트 중심, 마크다운 사용
- 자동 분석 프롬프트: 전사 완료 시 자동 실행될 초기 분석 프롬프트
  - "이 상담 내용을 분석하고 핵심 요약, 주요 포인트, 후속 조치 제안을 해주세요"

**논의 필요**

- transcript가 너무 길 때 (128k 토큰 초과) 처리 전략
  - 앞뒤 N개 세그먼트만 포함? 사전 요약 후 포함?
- 토큰 비용 관리: 매 질문마다 전체 transcript를 보내면 비용이 큼

**선택지**

- A) 매 요청마다 transcript 전문 포함 — 단순하지만 비용 높음
- B) 첫 요청에서 요약 생성 후 캐시, 이후 요약 기반 — 복잡하지만 비용 절감
- C) 전문 포함 + 모델을 gpt-4.1-mini로 고정 — 비용과 품질의 균형

**추천**: C) 초기에는 전문 포함 + gpt-4.1-mini. 비용 최적화는 사용량 데이터가 쌓인 뒤 판단해도 늦지 않다.

**사용자 방향**: gpt-5.4-medium 사용. 비용보다 품질 우선.

---

### 차수 3: 클라이언트 — 스트리밍 채팅 UX

**작업내용**

- `appendAssistantExchange` 함수를 실제 API 호출 + 스트리밍 수신으로 교체
- 스트리밍 처리 흐름:
  1. 사용자 메시지 즉시 추가
  2. assistant 메시지를 빈 상태로 추가 (로딩 표시)
  3. SSE 토큰 수신할 때마다 assistant 메시지 content에 append
  4. 스트리밍 완료 시 상태 확정
- 스트리밍 중 UX:
  - 입력창 비활성화
  - 스크롤 자동 추적 (사용자가 스크롤 올리면 추적 중단)
  - "응답 중지" 버튼 (AbortController)
- `buildAssistantReply` 하드코딩 함수 제거

**논의 필요**

- 스트리밍 중 메시지 상태 관리 방식
  - useState로 직접 관리 vs useReducer

**선택지**

- A) useState + 콜백 패턴 — 현재 구조와 일관
- B) useReducer로 채팅 상태 분리 — 상태 전이가 명확

**추천**: A) 현재 구조 유지. 채팅 상태가 복잡해지면 그때 분리해도 됨.

**사용자 방향**:

---

### 차수 4: 마크다운 렌더링

**작업내용**

- AI 응답 메시지에 마크다운 렌더링 적용
- `react-markdown` + `remark-gfm` 설치
- 코드 블록, 리스트, 볼드, 헤딩 등 기본 마크다운 지원
- 다크 테마에 맞는 마크다운 스타일링 (CSS Modules)
- 사용자 메시지는 plain text 유지

**논의 필요**

- 없음. 마크다운 렌더링은 거의 표준.

**선택지**

- 없음

**추천**: `react-markdown` + `remark-gfm`

**사용자 방향**:

---

### 차수 5: 자동 초기 분석 — 전사 완료 시 AI 분석 자동 실행

**작업내용**

- 기록 선택 시 transcript가 ready 상태면:
  - 이전에 AI 분석을 받은 적 없으면 자동으로 초기 분석 프롬프트 실행
  - 스트리밍으로 채팅에 분석 결과가 채워짐
- 전사 완료 폴링 중 상태가 ready로 변하면 즉시 자동 분석 트리거
- 초기 분석 내용: 핵심 요약, 주요 포인트 3-5개, 후속 조치 제안

**논의 필요**

- 자동 분석 비용: 기록 열 때마다 vs 최초 1회만
- 분석 결과 DB 저장 여부

**선택지**

- A) 최초 1회 자동 분석, 결과는 메모리에만 (새로고침 시 재실행)
- B) 최초 1회 자동 분석, 결과를 DB에 저장 (재방문 시 캐시)
- C) 매번 새로 분석

**추천**: A) 초기에는 메모리만. DB 캐싱은 사용 패턴 보고 판단.

**사용자 방향**:

---

### 차수 6: 프롬프트 칩 고도화 + 대화 맥락 유지

**작업내용**

- 프롬프트 칩을 기록 내용 기반으로 동적 생성 (LLM이 제안)
- 대화 히스토리를 API에 함께 전송 → 맥락 이어가기
- "이전 답변 이어서" 같은 후속 질문 자연스럽게 지원

**논의 필요**

- 대화 히스토리 전송 시 토큰 한도

**선택지**

- 없음. 표준적인 multi-turn chat.

**추천**: 최근 N개 메시지만 전송 (예: 10개). 오래된 메시지는 잘라냄.

**사용자 방향**:

---

## 실행 순서

1 → 2 → 3 → 4 → 5 → 6

차수 1-2는 서버 기반, 3-4는 클라이언트 UX, 5-6은 자동화와 고도화.
차수 1-3까지 완료하면 "질문하면 진짜 AI가 스트리밍으로 답하는" 기본 가치가 바로 나온다.

## API 계약 추가 필요

`packages/api-contract/src/counseling-records.ts`에 채팅 요청/응답 스키마 추가 필요.
단, 스트리밍 응답은 SSE이므로 response schema는 이벤트 단위로 정의.

## 의존성 추가 예상

- `react-markdown` — 마크다운 렌더링 (차수 4)
- `remark-gfm` — GFM 테이블, 체크리스트 등 (차수 4)
- OpenAI SDK는 사용하지 않고 native fetch + ReadableStream으로 구현 (이미 패턴 존재)
