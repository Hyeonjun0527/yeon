# 상담 도메인 집중 전환 기획서

> 작성일: 2026-04-11  
> 배경: 실무자 토크 결과, 출결/과제 연동은 부트캠프마다 너무 다르므로 추후 기능으로 미룸.  
> 상담 기록 전문 관리 시스템으로 방향 전환.

---

## 핵심 전략

> "부트캠프 모든 수강생의 상담 기록을 AI로 분석하고, 스페이스(기수) 단위로 완벽하게 관리한다"

### 왜 상담 도메인인가

- 부트캠프마다 출결/과제 도구가 제각각이지만, **1:1 상담은 어느 부트캠프나 한다**
- 상담 기록은 우리 AI 분석의 핵심 자산
- 상담 기록이 쌓일수록 → 수강생 패턴 감지 → 위험 신호 선제 대응 가능
- 관리자가 월 요금을 낼 이유: "시스템이 위험 수강생을 먼저 알려줬다"

---

## 현재 구조의 문제

```
홈 화면 상담 기록
├── 기록 1 (수강생 미지정)
├── 기록 2 (홍길동 연결됨)
├── 기록 3 (수강생 미지정)
└── ...
```

- 플랫 리스트, 어느 기수 것인지 컨텍스트 없음
- 수강생 A가 올해 상담을 몇 번 받았는지 한 눈에 안 보임
- 상담 기록 없는 수강생이 누구인지 모름
- 녹음/업로드할 때 "어느 스페이스 수강생"인지 모름

---

## 새 아키텍처

### 계층 구조

```
Space (기수, 예: "백엔드 3기")
  기간: 2026-03 ~ 2026-10 (7개월)
  ├── 수강생 A (홍길동)
  │   ├── 상담 기록 #1 — 2026-04-02 | AI 분석 완료
  │   ├── 상담 기록 #2 — 2026-04-09 | AI 분석 완료
  │   └── 텍스트 메모  — 2026-04-10 | 복도에서 잠깐 얘기함
  ├── 수강생 B (김영희)
  │   └── 상담 기록 #1 — 2026-03-28
  └── 수강생 C (이민준)
      └── (상담 기록 없음) ← 빨간 신호로 표시
```

### Current Space 개념

- 사용자가 "지금 내가 관리 중인 기수"를 하나 선택
- **홈 화면, 녹음, 파일 업로드 전부 Current Space 기준으로 동작**
- Current Space가 설정되면 → 상담 기록 생성 시 해당 스페이스 수강생만 연결 선택지에 뜸
- 스페이스를 바꿀 수 있지만 기본값은 현재 진행 중인 기수

```
[Current Space: 백엔드 3기 ▼]  ← 헤더에 항상 표시
```

---

## 스페이스 만들기 플로우

### 진입점

```
[스페이스 만들기] 클릭
        ↓
┌─────────────────────────────────────┐
│  어떻게 시작할까요?                  │
│                                     │
│  ○ 직접 만들기                       │
│    수강생을 직접 등록합니다           │
│                                     │
│  ○ Google Drive에서 가져오기         │
│    기존 수강생 명단 파일 사용         │
│                                     │
│  ○ OneDrive에서 가져오기             │
│    기존 수강생 명단 파일 사용         │
└─────────────────────────────────────┘
```

### Drive 연동 시 파일 가이드라인 (팝업/사이드패널)

```
어떤 파일이면 좋나요?

✓ 형식: Excel (.xlsx) 또는 CSV (.csv)
✓ 첫 번째 행에 항목명(헤더) 있음
✓ 한 행 = 한 명

권장 항목
─────────────────────────────────────
필수  이름        홍길동
권장  전화번호    010-1234-5678
권장  이메일      hong@gmail.com
선택  트랙/과정   백엔드
선택  상태        수강중

예시 구조:
이름   | 전화번호       | 이메일          | 트랙
홍길동 | 010-1234-5678 | hong@gmail.com  | 백엔드
김영희 | 010-9876-5432 | kim@naver.com   | 프론트엔드
─────────────────────────────────────
이름 컬럼만 있어도 시작할 수 있습니다.
나머지 정보는 나중에 채울 수 있습니다.

[예시 파일 다운로드]
```

### Drive 연동 플로우

```
Drive 선택
  ↓
OAuth 인증 (이미 연동된 경우 스킵)
  ↓
파일 선택 (Drive 파일 피커)
  ↓
AI가 컬럼 자동 매핑 시도
  "이름" 컬럼 → name ✓
  "연락처" 컬럼 → phone ✓
  "메일" 컬럼 → email ✓
  ↓
미리보기: N명 수강생 등록 예정
  [확인 후 스페이스 만들기]
```

---

## 홈 화면 개편 방향

### 현재

- 상담 기록 플랫 리스트
- 좌측: 기록 목록 / 중앙: 선택된 기록 내용 / 우측: AI 채팅

### 변경 후

- **Current Space 내 수강생 목록 + 각자 최근 상담 현황**이 좌측 기본 뷰
- 수강생 클릭 → 해당 수강생의 상담 타임라인
- 녹음/업로드 플로우는 기존 유지 — 먼저 녹음하고 나중에 수강생 연결

#### UX 결정: 녹음 우선, 연결 나중

녹음할 때마다 스페이스/수강생을 먼저 선택하면 흐름이 끊긴다.  
→ **녹음 먼저 → 수강생 연결은 나중에** 기존 플로우 유지.  
→ 연결 안 된 기록은 좌측 패널 하단 **"미분류 기록"** 섹션으로 모아둠.

```
좌측 패널 (Current Space: 백엔드 3기)
─────────────────────────────
수강생
─────────────────────────────
홍길동    마지막 상담 3일 전  ●
김영희    마지막 상담 2주 전  ⚠
이민준    상담 기록 없음       ✕
박수연    마지막 상담 오늘    ●
...

─────────────────────────────
미분류 기록 (3)              ← 수강생 연결 안 된 기록들
─────────────────────────────
2026-04-10  면담 녹음_01
2026-04-09  상담녹음
2026-04-08  홍길동_4월
─────────────────────────────
[+ 새 상담 기록]
```

미분류 기록을 클릭하면 → 기존 뷰 (전사, AI 분석) + 수강생 연결 버튼

---

## 새로 만들 핵심 기능

### 1차 — Current Space + 수강생별 상담 타임라인

- Current Space 선택/전환 UI
- 홈 화면 좌측 패널 → 수강생 목록 + 상담 현황으로 개편
- 수강생 클릭 → 해당 수강생의 모든 상담 기록 타임라인

### 2차 — 빠른 텍스트 상담 메모

- 녹음 없이 텍스트로 빠르게 상담 내용 기록
- 제목, 날짜, 본문만 있으면 저장 가능
- 선택: 수강생 연결, 태그, 다음 액션 메모

### 3차 — 스페이스 만들기 플로우 개편

- 직접 만들기 / Google Drive / OneDrive 선택지
- Drive 연동 시 파일 가이드라인 + AI 컬럼 매핑
- 수강생 일괄 등록

### 4차 — 상담 인사이트

- 수강생별: 상담 횟수, 반복 키워드, 마지막 상담 N일 전
- 스페이스 단위: 상담 안 한 수강생, 이번 주 상담 현황
- 위험 신호 자동 감지: "상담 3주 이상 없음", "부정적 감정 반복"

---

## 보류 (추후 기능)

- 출결 연동 (Google Sheets, LMS 등)
- 과제 연동
- 엑셀 Export

---

## 코드베이스 현황 분석 (2026-04-11 기준)

### 핵심 발견사항

#### 1. counseling_records에 space_id 없음 ⚠️

```
counseling_records
  - created_by_user_id (유저 기준)
  - member_id (nullable, 수강생 연결 시만 있음)
  - space_id ← 없음!
```

→ 현재 스페이스별 상담 기록 필터 불가능  
→ 미분류 기록(member_id = null)은 스페이스 추적 자체가 안 됨  
→ **migration으로 space_id 컬럼 추가 필요**

#### 2. Current Space 상태가 수강생 관리 페이지에만 있음

- `StudentManagementProvider.selectedSpaceId` — 수강생 관리 페이지에서만 사용
- 홈 화면(상담 기록)은 스페이스 개념이 전혀 없음
- `LinkMemberModal`에서 localStorage(`yeon_last_space_id`)로 임시 처리 중
  → **전역 Current Space 상태 또는 홈 전용 훅 필요**

#### 3. 홈 좌측 Sidebar는 상담 기록 플랫 리스트

- `useRecords()` 훅이 3초마다 `GET /api/v1/counseling-records` 폴링
- 스페이스/수강생 컨텍스트 없이 전체 기록 나열
- Sidebar 컴포넌트를 수강생 목록 + 미분류 구조로 전면 개편 필요

#### 4. 주요 API 현황

```
있음:
GET  /api/v1/spaces
GET  /api/v1/spaces/:spaceId/members
GET  /api/v1/spaces/:spaceId/members/:memberId/counseling-records
GET  /api/v1/counseling-records (스페이스 필터 없음)
PATCH /api/v1/counseling-records/:recordId (member 연결)

추가 필요:
GET  /api/v1/counseling-records?spaceId=... (스페이스 필터)
POST /api/v1/spaces/:spaceId/members/:memberId/counseling-memos (텍스트 메모)
```

---

## 차수별 구현 계획

### 1차 — DB 기반 작업 (counseling_records에 space_id 추가)

**목표**: 상담 기록을 스페이스 단위로 관리할 수 있는 DB 구조 확보

**변경 파일:**

```
apps/web/src/server/db/schema/counseling-records.ts
  → spaceId: uuid("space_id").references(() => spaces.id, { onDelete: "set null" })
  → nullable, 기존 데이터는 null 허용

apps/web/src/server/db/migrations/
  → 새 migration SQL 생성

apps/web/src/server/services/counseling-records-repository.ts
  → findRecordsBySpaceId() 추가
  → createRecord() 시 spaceId 저장 로직 추가

apps/web/src/server/services/counseling-records-service.ts
  → listCounselingRecordsBySpace() 추가

apps/web/src/app/api/v1/counseling-records/route.ts
  → GET에 ?spaceId 쿼리 파라미터 지원 추가

packages/api-contract/src/counseling-records.ts
  → spaceId 필드 추가
```

**논의 필요:**

- 파일 업로드/녹음 API에서 spaceId를 어떻게 받을 것인가?
  - 옵션 A: 업로드 폼에 spaceId 필드 추가 (프론트에서 전달)
  - 옵션 B: 업로드 시 spaceId 없이도 허용, 나중에 member 연결 시 자동 채움
- **추천**: 옵션 B — 녹음 우선 플로우 유지, member 연결 시 spaceId도 같이 저장

---

### 2차 — Current Space + 홈 화면 개편

**목표**: 홈 화면이 스페이스 컨텍스트를 인식하고, 수강생 목록 + 미분류 기록 구조로 바뀜

**변경 파일:**

```
apps/web/src/app/home/_hooks/use-current-space.ts (신설)
  → localStorage + GET /api/v1/spaces 조합
  → spaces 목록, selectedSpaceId, setSelectedSpaceId
  → 기본값: localStorage 저장값 → 없으면 첫 번째 space

apps/web/src/app/home/_hooks/use-records.ts (수정)
  → selectedSpaceId를 파라미터로 받음
  → GET /api/v1/counseling-records?spaceId=... 로 필터링
  → 미분류(memberId = null) 기록 별도 분리

apps/web/src/app/home/_hooks/use-space-members.ts (신설)
  → GET /api/v1/spaces/:spaceId/members 호출
  → 각 member별 최근 상담 날짜 계산 (records에서)
  → 마지막 상담 N일 전, 상담 없음 여부

apps/web/src/app/home/_components/sidebar.tsx (전면 개편)
  → 상단: Current Space 선택 드롭다운
  → 섹션 1: 수강생 목록
    - 이름 + 마지막 상담 날짜 + 상태 인디케이터 (●/⚠/✕)
    - 클릭 시 해당 수강생의 상담 기록만 필터
  → 섹션 2: 미분류 기록 (N)
    - member 연결 안 된 기록들
    - 기존 Sidebar 플랫 리스트 항목 그대로

apps/web/src/app/home/page.tsx (수정)
  → useCurrentSpace() 추가
  → useSpaceMembers() 추가
  → Sidebar에 members, unlinkedRecords props 전달
  → LinkMemberModal에 currentSpaceId 기본값으로 전달
```

**UI 구조:**

```
좌측 Sidebar
─────────────────────────────
[백엔드 3기 ▼]  ← Current Space 드롭다운

수강생 (8명)
─────────────────────────────
홍길동   ● 3일 전
김영희   ⚠ 18일 전
이민준   ✕ 상담 없음
박수연   ● 오늘
...

미분류 기록 (3)
─────────────────────────────
04-10  면담 녹음_01
04-09  상담녹음_홍
─────────────────────────────
[+ 새 상담 기록]
```

---

### 3차 — 텍스트 상담 메모

**목표**: 녹음 없이 텍스트로 빠르게 상담 내용 기록

**배경**: 현재 상담 기록 = 반드시 음성 파일 필요. 복도에서 나눈 대화, 전화 통화, 짧은 면담은 기록할 방법이 없음.

**DB 변경:**

```
counseling_records 테이블에 record_type 컬럼 추가
  - "audio" (기존, 음성 파일 기반)
  - "text_memo" (신규, 텍스트만)

text_memo 타입일 때:
  - audio 관련 컬럼은 null
  - transcript_text에 메모 내용 저장
  - analysis_result는 선택적 (AI 요약 on-demand)
```

**API:**

```
POST /api/v1/spaces/:spaceId/members/:memberId/counseling-memos
  body: { title, content, date?, tags? }
  → counseling_records에 record_type="text_memo"로 저장
```

**UI:**

```
[+ 새 상담 기록] 클릭 시 선택지:
  ● 녹음하기
  ● 파일 업로드
  ● 텍스트 메모  ← 신규
     → 빠른 입력 폼: 수강생, 날짜, 제목, 내용
     → 저장 (3~5초면 완료)
```

---

### 4차 — 스페이스 만들기 플로우 개편

**목표**: 기수 시작 시 수강생을 쉽게 등록할 수 있도록

**현재**: 스페이스 이름/기간만 입력하고 수강생은 한 명씩 수동 추가

**변경:**

```
스페이스 만들기 모달 개편:

Step 1: 시작 방법 선택
  [ 직접 만들기 ]  [ Google Drive ]  [ OneDrive ]

Step 2 (Drive 선택 시): 가이드라인 + 파일 선택
  - OAuth 인증
  - Drive 파일 피커
  - 컬럼 자동 매핑 미리보기

Step 2 (직접 만들기): 스페이스 정보 입력
  - 이름, 기간 (기존과 동일)

Step 3 (Drive): 수강생 미리보기 + 확인
  - "N명 등록 예정" 테이블
  - 컬럼 매핑 수정 가능
  - [스페이스 만들기] 실행
```

**관련 파일:**

```
apps/web/src/features/student-management/ (스페이스 생성 모달)
apps/web/src/app/api/v1/spaces/route.ts
apps/web/src/app/api/v1/spaces/[spaceId]/members/bulk-import/route.ts (신설)
  → CSV/Excel 파싱 + 수강생 일괄 등록
```

---

### 5차 — 상담 인사이트

**목표**: 수동 위험도 태그 → AI 자동 신호 감지

**기능:**

```
수강생별 인사이트 (tab-member-overview 또는 새 탭):
  - 총 상담 횟수, 이번 달 상담 횟수
  - 마지막 상담 N일 전
  - 반복 키워드 (AI 분석 결과에서 추출)
  - 감정 트렌드 (긍정/중립/부정)

스페이스 대시보드 (신설):
  - 전체 수강생 상담 현황 히트맵
  - "3주 이상 상담 없는 수강생" 자동 감지
  - 이번 주 상담 완료 N명 / 예정 N명
```

---

## 전체 일정 (우선순위)

```
1차  counseling_records에 space_id 추가 (DB migration)
     → 전체 기능의 기반, 먼저 해야 함

2차  Current Space + 홈 화면 좌측 패널 개편
     → 가장 눈에 보이는 변화, 핵심 UX

3차  텍스트 상담 메모
     → 관리자 일상 워크플로우에 직접 영향

4차  스페이스 만들기 플로우 (Drive 연동)
     → 신규 기수 시작 시 온보딩 경험

5차  상담 인사이트 + 위험 신호
     → 핵심 가치 제안, 결제 이유
```
