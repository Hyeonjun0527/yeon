# 수강생 커스터마이징 시스템 BACKLOG

작성일: 2026-04-11  
v3 업데이트: 템플릿 시스템 + AI 임포트 시너지 추가

---

## 전체 비전

운영자가 수강생 상세 화면의 **탭 구조 자체**와 **각 탭 안의 필드**를 모두 직접 구성할 수 있다.
기관마다 다른 정보 구조를 시스템이 강제하지 않는다.
스페이스 생성 시 **템플릿을 먼저 선택**하면 탭·필드 구조가 자동 세팅되고,
이후 외부 파일 임포트 시 AI가 **템플릿 필드를 힌트로** 삼아 커스텀 필드 값까지 한 번에 추출한다.

```
현재 (고정):
  탭: [개요] [상담기록] [수강이력] [비상연락처] [메모] [리포트]
  개요 안: 이름, 이메일, 전화번호, 수강상태, 위험도, 등록일 (변경 불가)

목표 (커스터마이징 가능):
  탭: [개요] [상담기록] [결제정보 ★] [포트폴리오 ★] [메모] [리포트]
       ↑ 순서 변경 가능    ↑ 숨김 가능     ↑ 직접 추가      ↑ 숨김 가능
  개요 안: 기본 필드 + 커스텀 필드 (GitHub, 직전직장 등 추가 가능)
  결제정보 탭 안: 결제수단(select), 할부회차(number), 입금일(date) 등
```

---

## 템플릿 시스템

### 개념

템플릿은 "탭 구조 + 필드 구조"의 미리 정의된 묶음이다.
스페이스를 만들 때 템플릿을 고르면 해당 탭·필드 세트가 자동으로 세팅된다.
나중에 얼마든지 수정 가능하며, 템플릿은 단지 시작점이다.

### 템플릿 종류

**시스템 템플릿** (플랫폼 기본 제공, 삭제 불가):

| 템플릿 이름   | 기본 제공 커스텀 필드                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| 코딩 부트캠프 | GitHub(url), 기술스택(multi_select), 직전직장(text), 포트폴리오(url), NDA 서명일(date) |
| 디자인 스쿨   | Behance(url), Figma(url), 사용 툴(multi_select), 포트폴리오(url)                       |
| 데이터 분석   | Kaggle(url), Python 수준(select), 직전직장(text), 통계 배경(checkbox)                  |
| 일반 교육     | 커스텀 필드 없음 (기본 필드만)                                                         |

**사용자 정의 템플릿** (운영자가 기존 스페이스를 템플릿으로 저장):

- "이 스페이스 구조를 템플릿으로 저장" → 탭·필드 구조 snapshot
- 다음 스페이스 생성 시 내 템플릿 목록에서 선택 가능

### 스페이스 생성 플로우 (템플릿 포함)

```
스페이스 만들기
  ↓
1단계: 스페이스 이름 입력 ("백엔드 4기")
  ↓
2단계: 템플릿 선택
  ├─ 시스템 템플릿: [코딩 부트캠프] [디자인 스쿨] [데이터 분석] [일반 교육]
  └─ 내 템플릿: [백엔드 3기 구조] [디자인 2기 구조] ...
       (없으면 표시 안 함)
  ↓
3단계: 미리보기 — 선택한 템플릿의 탭·필드 목록 확인
  ↓
스페이스 생성
  ├─ 시스템 탭 6개 자동 생성
  └─ 템플릿 커스텀 탭·필드 자동 복사
```

### DB 스키마 추가

```sql
CREATE TABLE space_templates (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL이면 시스템 템플릿

  name                VARCHAR(80) NOT NULL,
  description         TEXT,
  is_system           BOOLEAN NOT NULL DEFAULT false,

  -- 탭·필드 구조를 JSON으로 저장 (스냅샷)
  tabs_config         JSONB NOT NULL,
  -- [{ name, tab_type, system_key, display_order, fields: [{ name, field_type, options, is_required, display_order }] }]

  created_at          TIMESTAMP NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP NOT NULL DEFAULT now()
);
```

tabs_config 예시 (코딩 부트캠프 템플릿):

```json
[
  {
    "name": "포트폴리오",
    "tab_type": "custom",
    "display_order": 6,
    "fields": [
      {
        "name": "GitHub",
        "field_type": "url",
        "is_required": false,
        "display_order": 0
      },
      {
        "name": "포트폴리오 URL",
        "field_type": "url",
        "is_required": false,
        "display_order": 1
      },
      {
        "name": "기술 스택",
        "field_type": "multi_select",
        "is_required": false,
        "display_order": 2,
        "options": [
          { "value": "JavaScript", "color": "#fbbf24" },
          { "value": "Python", "color": "#34d399" },
          { "value": "Java", "color": "#f87171" }
        ]
      }
    ]
  },
  {
    "name": "입학 정보",
    "tab_type": "custom",
    "display_order": 7,
    "fields": [
      {
        "name": "직전 직장",
        "field_type": "text",
        "is_required": false,
        "display_order": 0
      },
      {
        "name": "NDA 서명일",
        "field_type": "date",
        "is_required": false,
        "display_order": 1
      }
    ]
  }
]
```

---

## AI 임포트 + 템플릿 시너지

### 현재 파일 분석 파이프라인의 한계

```
현재: 파일 → AI → name, email, phone, status, cohort 만 추출
```

외부 파일(OneDrive, Google Drive, 로컬)에 GitHub, 기술스택, 직전직장 컬럼이 있어도
AI가 "무엇을 찾아야 하는지" 모르기 때문에 그냥 무시된다.

### 템플릿 필드를 AI 힌트로 활용

스페이스에 커스텀 필드가 정의되어 있으면, 파일 분석 Phase 1의 AI 프롬프트에
**현재 스페이스의 필드 스키마를 함께 전달**한다.

```
신규: 파일 샘플 + 스페이스 필드 스키마 → AI → 확장된 컬럼 매핑
```

Phase 1 프롬프트 변화:

```
[기존]
이 스프레드시트에서 수강생 목록을 추출하려 합니다.
상위 20행을 보고 이름/이메일/전화번호/상태 컬럼을 찾아주세요.

[신규]
이 스프레드시트에서 수강생 목록을 추출하려 합니다.
상위 20행을 보고 아래 필드에 해당하는 컬럼을 최대한 찾아주세요:

기본 필드:
  - name (이름, 성명)
  - email (이메일)
  - phone (전화번호)
  - status (수강상태: active/withdrawn/graduated)

커스텀 필드 (이 스페이스에서 수집하는 추가 정보):
  - "GitHub" (url 타입) → GitHub 링크, github.com 포함된 컬럼
  - "기술 스택" (multi_select 타입) → 기술, 언어, 스택, 사용 기술 관련 컬럼
  - "직전 직장" (text 타입) → 전 직장, 이전 회사, 경력 관련 컬럼
  - "NDA 서명일" (date 타입) → NDA, 서명일 관련 컬럼

각 필드에 해당하는 컬럼 인덱스를 JSON으로 반환해주세요.
없으면 null로 표시하세요.
```

### 변경된 파이프라인

```
파일 입력 (Excel/CSV/Google Sheets/OneDrive)
  │
  ├─ 현재 스페이스의 커스텀 필드 스키마 로드
  │
  Phase 1: 샘플 20행 + 필드 스키마 → AI
  │  반환: {
  │    extractable: true/false,
  │    nameColumn: 0,
  │    emailColumn: 2,
  │    phoneColumn: null,
  │    statusColumn: 5,
  │    customFieldColumns: {           ← 신규
  │      "github_field_id": 7,
  │      "skill_stack_field_id": 8,
  │      "prev_job_field_id": null,
  │      "nda_date_field_id": 3
  │    },
  │    cohortStrategy: "by_sheet",
  │    dirtyColumns: [8]
  │  }
  │
  Phase 2: 코드 기반 전체 추출
  │  ├─ 기본 필드 (name, email, phone, status) 추출 (기존)
  │  └─ customFieldColumns 매핑으로 커스텀 필드 값도 추출 (신규)
  │
  Phase 3 (dirty 컬럼):
  │  ├─ 기술스택처럼 "React, TypeScript, Node.js" 형태 → multi_select 배열 정제
  │  └─ 날짜 포맷 정규화 ("23년 3월 5일" → "2023-03-05")
  │
  ▼
ImportPreview (확장)
  └─ {
       cohorts: [{
         name: "백엔드 4기",
         students: [{
           name: "김민수",
           email: "...",
           phone: null,
           status: "active",
           customFieldValues: {          ← 신규
             "github_field_id": "https://github.com/minsu",
             "skill_stack_field_id": ["React", "TypeScript"],
             "nda_date_field_id": "2026-03-01"
           }
         }]
       }]
     }
```

### 임포트 확인 UI 변화

```
현재: 수강생 이름 / 이메일 / 전화번호 / 상태 미리보기 테이블

신규: 수강생 이름 / 이메일 / 상태 / GitHub / 기술스택 / NDA서명일 ... 미리보기 테이블
      (추출된 커스텀 필드도 컬럼으로 표시, 운영자가 확인 후 임포트 확정)
```

### 시너지 효과 정리

|                     | 템플릿 없이 임포트             | 템플릿 정의 후 임포트                   |
| ------------------- | ------------------------------ | --------------------------------------- |
| AI가 추출하는 필드  | name, email, phone, status     | + GitHub, 기술스택, 직전직장, NDA서명일 |
| 임포트 후 추가 작업 | 수강생별 커스텀 필드 수동 입력 | 자동 입력됨                             |
| AI 정확도           | 일반적 컬럼 추측               | 필드 타입 알고 있어 정확한 매핑         |
| 데이터 완성도       | 기본 정보만                    | 첫 임포트부터 풍부한 프로필             |

---

## 탭 분류 체계

### 시스템 탭 (system tab)

플랫폼이 기본 제공하는 탭. 삭제 불가, **숨김·순서 변경만** 가능.

| system_key   | 기본 이름  | 삭제 가능 | 내부 동작                       |
| ------------ | ---------- | --------- | ------------------------------- |
| `overview`   | 개요       | ❌        | 기본 필드 + 커스텀 필드 표시    |
| `counseling` | 상담기록   | ❌        | 상담 기록 목록 시스템           |
| `courses`    | 수강이력   | ❌        | 수강 이력 시스템 (미구현)       |
| `guardian`   | 비상연락처 | ❌        | guardian 테이블 시스템 (미구현) |
| `memos`      | 메모       | ❌        | 메모 시스템                     |
| `report`     | 리포트     | ❌        | AI 리포트 시스템                |

- 시스템 탭 이름은 운영자가 변경 가능 ("상담기록" → "멘토링 기록")
- 개요 탭은 숨김도 불가 (항상 첫 번째 탭)
- 나머지 시스템 탭은 숨김 가능

### 커스텀 탭 (custom tab)

운영자가 직접 생성하는 탭. **이름 변경·삭제·순서 변경** 모두 가능.
탭 안에 커스텀 필드를 자유롭게 배치한다.

예시:

- "결제 정보" → 결제수단(select), 할부회차(number), 입금일(date), 환불여부(checkbox)
- "포트폴리오" → GitHub(url), 노션(url), 대표 프로젝트명(text), 기술스택(multi_select)
- "입학 정보" → 지원 동기(long_text), 직전 직장(text), 거주 지역(select), NDA 서명일(date)

---

## 필드 배치 규칙

커스텀 필드는 반드시 **하나의 탭**에 속한다.

```
member_field_definitions.tab_id → member_tab_definitions.id

- tab_id → overview 탭   : 개요 탭 "추가 정보" 섹션에 표시
- tab_id → custom 탭     : 해당 커스텀 탭 안에 표시
- 시스템 탭(counseling, memos 등)에는 커스텀 필드 배치 불가
  (시스템 탭은 자체 데이터 구조를 가짐)
```

개요 탭에 배치된 커스텀 필드는 기본 필드(이름·이메일·전화번호·수강상태) 아래
"추가 정보" 섹션으로 그룹화되어 표시된다.

---

## DB 스키마 설계

### member_tab_definitions (탭 정의)

```sql
CREATE TABLE member_tab_definitions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id            UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_by_user_id  UUID NOT NULL REFERENCES users(id),

  tab_type            VARCHAR(20) NOT NULL,   -- 'system' | 'custom'
  system_key          VARCHAR(30),            -- 'overview'|'counseling'|'courses'|
                                              -- 'guardian'|'memos'|'report' | NULL(custom)
  name                VARCHAR(80) NOT NULL,   -- 표시 이름 (운영자 변경 가능)
  is_visible          BOOLEAN NOT NULL DEFAULT true,
  display_order       INTEGER NOT NULL DEFAULT 0,

  created_at          TIMESTAMP NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (space_id, system_key)              -- 시스템 탭은 스페이스당 1개만
);
```

스페이스 생성 시 시스템 탭 6개를 자동 INSERT한다.

```sql
-- 스페이스 생성 트리거 예시
INSERT INTO member_tab_definitions (space_id, created_by_user_id, tab_type, system_key, name, display_order)
VALUES
  (new_space_id, user_id, 'system', 'overview',   '개요',       0),
  (new_space_id, user_id, 'system', 'counseling', '상담기록',   1),
  (new_space_id, user_id, 'system', 'courses',    '수강이력',   2),
  (new_space_id, user_id, 'system', 'guardian',   '비상연락처', 3),
  (new_space_id, user_id, 'system', 'memos',      '메모',       4),
  (new_space_id, user_id, 'system', 'report',     '리포트',     5);
```

---

### member_field_definitions (필드 정의)

```sql
CREATE TABLE member_field_definitions (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id            UUID NOT NULL REFERENCES spaces(id) ON DELETE CASCADE,
  created_by_user_id  UUID NOT NULL REFERENCES users(id),

  -- 어느 탭에 속하는지 (overview 탭 또는 custom 탭만 허용)
  tab_id              UUID NOT NULL REFERENCES member_tab_definitions(id) ON DELETE CASCADE,

  name                VARCHAR(80) NOT NULL,   -- "GitHub 링크", "직전 직장"
  field_type          VARCHAR(30) NOT NULL,   -- 아래 타입 목록 참조
  options             JSONB,                  -- select/multi_select 선택지 배열
  is_required         BOOLEAN NOT NULL DEFAULT false,
  display_order       INTEGER NOT NULL DEFAULT 0,

  created_at          TIMESTAMP NOT NULL DEFAULT now(),
  updated_at          TIMESTAMP NOT NULL DEFAULT now()
);
```

---

### member_field_values (필드 값)

```sql
CREATE TABLE member_field_values (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id             UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  field_definition_id   UUID NOT NULL REFERENCES member_field_definitions(id) ON DELETE CASCADE,

  value_text            TEXT,      -- text, long_text, url, email, phone, date(ISO)
  value_number          NUMERIC,   -- number
  value_boolean         BOOLEAN,   -- checkbox
  value_json            JSONB,     -- select(string), multi_select(string[])

  created_at            TIMESTAMP NOT NULL DEFAULT now(),
  updated_at            TIMESTAMP NOT NULL DEFAULT now(),

  UNIQUE (member_id, field_definition_id)
);
```

---

### 필드 타입 목록

| 타입        | 코드           | 저장 컬럼        | 예시                  |
| ----------- | -------------- | ---------------- | --------------------- |
| 단문 텍스트 | `text`         | value_text       | 직전 직장, 거주 지역  |
| 장문 텍스트 | `long_text`    | value_text       | 자기소개, 학습 목표   |
| 숫자        | `number`       | value_number     | 성적 점수, 나이       |
| 날짜        | `date`         | value_text (ISO) | 생년월일, NDA 서명일  |
| 단일 선택   | `select`       | value_json       | 트랙, 지역, 결제 수단 |
| 다중 선택   | `multi_select` | value_json       | 기술 스택, 관심 분야  |
| 체크박스    | `checkbox`     | value_boolean    | 장학생 여부, NDA 동의 |
| URL         | `url`          | value_text       | GitHub, 포트폴리오    |
| 이메일      | `email`        | value_text       | 보조 이메일           |
| 전화번호    | `phone`        | value_text       | 비상연락처 2          |

추후 검토: `rating`(별점), `file`(파일 첨부)

options JSONB 형식 (select / multi_select):

```json
[
  { "value": "서울", "color": "#818cf8" },
  { "value": "경기", "color": "#34d399" },
  { "value": "지방", "color": "#fbbf24" }
]
```

---

## 전체 데이터 관계도

```
spaces
  └─ member_tab_definitions (탭 목록, space당 6개 시스템 + N개 커스텀)
       └─ member_field_definitions (필드 목록, overview/custom 탭에만)
            └─ member_field_values (수강생별 실제 값)
                 └─ members
```

---

## API 계약 설계

### 탭 정의 API

```
GET    /api/v1/spaces/{spaceId}/member-tabs
        → TabDefinition[] (system + custom, display_order 정렬)

POST   /api/v1/spaces/{spaceId}/member-tabs
        body: { name: string }
        → 커스텀 탭 생성

PATCH  /api/v1/spaces/{spaceId}/member-tabs/{tabId}
        body: { name?, is_visible?, display_order? }
        → 이름 변경 / 숨김 / 순서 (시스템 탭은 system_key='overview' 면 is_visible 변경 불가)

DELETE /api/v1/spaces/{spaceId}/member-tabs/{tabId}
        → 커스텀 탭만 삭제 가능 (시스템 탭 삭제 시 403)

PATCH  /api/v1/spaces/{spaceId}/member-tabs/reorder
        body: { order: [tabId, tabId, ...] }
        → display_order 일괄 갱신
```

### 필드 정의 API

```
GET    /api/v1/spaces/{spaceId}/member-fields
        → FieldDefinition[] (tab_id 포함, tab별 grouping은 클라이언트)

GET    /api/v1/spaces/{spaceId}/member-tabs/{tabId}/fields
        → 특정 탭의 FieldDefinition[]

POST   /api/v1/spaces/{spaceId}/member-tabs/{tabId}/fields
        body: { name, field_type, options?, is_required? }

PATCH  /api/v1/spaces/{spaceId}/member-fields/{fieldId}
        body: { name?, options?, is_required?, display_order?, tab_id? }
        → tab_id 변경 = 필드를 다른 탭으로 이동

DELETE /api/v1/spaces/{spaceId}/member-fields/{fieldId}

PATCH  /api/v1/spaces/{spaceId}/member-tabs/{tabId}/fields/reorder
        body: { order: [fieldId, fieldId, ...] }
```

### 필드 값 API

```
GET    /api/v1/spaces/{spaceId}/members/{memberId}/field-values
        → { fieldDefinitionId, value }[]

PATCH  /api/v1/spaces/{spaceId}/members/{memberId}/field-values
        body: { fieldDefinitionId: uuid, value: any }
        → 단일 필드 upsert (낙관적 업데이트 지원)
```

멤버 상세 조회에 탭·필드 구조 포함:

```
GET /api/v1/spaces/{spaceId}/members/{memberId}
→ {
    ...member,
    tabs: TabDefinition[],              ← 탭 구조
    customFields: {                     ← 필드 정의 + 값
      [tabId]: {
        definition: FieldDefinition,
        value: FieldValue | null
      }[]
    }
  }
```

---

## 차수별 작업 계획

---

### 1차: DB 마이그레이션 + 탭/필드 백엔드 API

**작업 내용:**

- `member_tab_definitions` 테이블 마이그레이션
- `member_field_definitions` 테이블 마이그레이션 (`tab_id` 포함)
- `member_field_values` 테이블 마이그레이션
- 스페이스 생성 시 시스템 탭 6개 자동 생성 로직
- `packages/api-contract`에 타입 정의
  - `MemberTabDefinition`, `MemberFieldDefinition`, `MemberFieldValue`, `FieldType`
- 탭 CRUD route handler + service + repository
- 필드 CRUD route handler + service + repository
- 필드 값 upsert API
- 멤버 상세 조회에 탭·필드 구조 포함

**논의 필요:**

- 필드를 다른 탭으로 이동(tab_id 변경) 시 기존 값은 유지? → 유지 (값은 field_definition_id 기준이라 tab과 무관)
- 커스텀 탭 삭제 시 그 안의 필드·값 처리 → CASCADE DELETE 추천

**사용자 방향:** 추천 기준으로 진행

---

### 2차: 스페이스 설정 UI — 탭 + 필드 관리

**작업 내용:**

- 스페이스 설정 페이지 신설 (진입점: 스페이스 헤더 설정 아이콘)
- 탭 관리 섹션
  - 탭 목록 (드래그로 순서 변경)
  - 시스템 탭: 이름 변경 + 숨김 토글만 (개요는 숨김 불가 표시)
  - 커스텀 탭: 추가 / 이름 변경 / 삭제
- 탭 선택 시 오른쪽에 해당 탭의 필드 목록 표시
  - 필드 추가: 이름 + 타입 선택 + 옵션 설정
  - 필드 순서 변경 (드래그)
  - 필드 삭제 (확인 다이얼로그)
  - 필드를 다른 탭으로 이동 (drag or 컨텍스트 메뉴)
- select / multi_select 타입: 선택지 추가 + 색상 팔레트 (8색 고정)

**UX 레퍼런스:**

- 왼쪽: 탭 목록 패널 (Linear 설정 사이드바 스타일)
- 오른쪽: 선택한 탭의 필드 목록 (Notion 데이터베이스 속성 설정 스타일)

**사용자 방향:**

---

### 3차: 수강생 상세 화면 — 탭 구조 동적 렌더링

**작업 내용:**

- 탭 바를 DB 정의 기준으로 동적 렌더링
  - is_visible=false 탭 숨김
  - display_order 기준 정렬
  - 시스템 탭은 system_key로 기존 컴포넌트 연결
  - 커스텀 탭은 `CustomTabContent` 컴포넌트 렌더링
- `CustomTabContent`: 탭에 속한 필드를 타입별 렌더링
  - 인라인 편집 (클릭 시 편집 모드, Notion 스타일)
  - 값 없음: "추가하기" 플레이스홀더
  - 저장: PATCH field-values (낙관적 업데이트)
- 타입별 렌더링 컴포넌트 신설
  - `FieldRenderer`: 타입에 따라 뷰/편집 분기
  - text / long_text / url / email / phone: 텍스트 인라인 편집
  - number: 숫자 입력
  - date: 날짜 피커
  - select: 드롭다운 (색상 칩 포함)
  - multi_select: 태그 입력
  - checkbox: 토글

**사용자 방향:**

---

### 4차: 개요 탭 커스텀 필드 통합

**작업 내용:**

- 개요 탭에 배치된 커스텀 필드를 "추가 정보" 섹션으로 렌더링
  - 기존 "연락처" / "운영 상태" / "상담 기록" 섹션 아래에 위치
  - 커스텀 필드가 하나도 없으면 섹션 자체 숨김
- 프로필 완성도 계산에 `is_required=true` 커스텀 필드 포함
  - 예: 기본 필드 3개 + 필수 커스텀 필드 2개 = 분모 5
- "트랙, 수강료, GitHub 등 추가 항목은 후후 지원 예정입니다." 안내 문구 제거

**사용자 방향:**

---

### 5차: 템플릿 시스템 + 스페이스 생성 플로우

**작업 내용:**

- `space_templates` 테이블 마이그레이션
- 시스템 템플릿 4종 DB seed (코딩 부트캠프, 디자인 스쿨, 데이터 분석, 일반 교육)
- 템플릿 API
  ```
  GET    /api/v1/space-templates         ← 시스템 + 내 템플릿 목록
  POST   /api/v1/space-templates         ← 현재 스페이스 구조를 템플릿으로 저장
  DELETE /api/v1/space-templates/{id}    ← 내 템플릿 삭제
  ```
- 스페이스 생성 플로우 UI 변경
  - 기존: 이름 입력 → 생성
  - 신규: 이름 입력 → 템플릿 선택 → 탭·필드 미리보기 → 생성
- 스페이스 설정에 "이 스페이스를 템플릿으로 저장" 버튼 추가
- 스페이스 생성 서비스: 선택한 템플릿의 `tabs_config` 기반으로 탭·필드 자동 생성

**논의 필요:**

- 템플릿 미리보기 수준: 탭 이름만 vs 필드 목록까지
- 내 템플릿 최대 개수 제한 여부

**추천:**

- 미리보기: 탭 이름 + 각 탭의 필드 이름·타입 아이콘 목록
- 개수 제한: 일단 없음

**사용자 방향:**

---

### 6차: AI 임포트 + 커스텀 필드 연동

**작업 내용:**

- `file-analysis-service.ts`의 `identifyColumnsWithAI()` 프롬프트 확장
  - 현재 스페이스의 커스텀 필드 스키마를 Phase 1 AI에 전달
  - 반환 JSON에 `customFieldColumns: { [fieldId]: columnIndex | null }` 추가
- Phase 2 코드 추출 로직에 커스텀 필드 추출 추가
  - `customFieldColumns` 매핑으로 각 행의 커스텀 필드 값 추출
- Phase 3 dirty 처리에 커스텀 필드 타입별 정제 추가
  - `multi_select`: "React, TypeScript, Node.js" → `["React", "TypeScript", "Node.js"]`
  - `date`: "23년 3월 5일" → `"2023-03-05"` (ISO 8601)
  - `url`: "github.com/user" → `"https://github.com/user"` 자동 보정
- `ImportPreview` 타입 확장
  - `students[]` 각 항목에 `customFieldValues: Record<fieldId, value>` 추가
- 임포트 확인 UI 테이블에 커스텀 필드 컬럼 표시
  - 추출된 필드만 컬럼으로 표시 (null인 필드는 표시 안 함)
  - "찾지 못한 필드" 섹션으로 운영자에게 알림
- 임포트 확정 시 `member_field_values`에 일괄 INSERT

**논의 필요:**

- 커스텀 필드를 찾지 못했을 때 UX: 조용히 null 처리 vs "GitHub 컬럼을 찾지 못했습니다" 알림
- 수동 컬럼 매핑 UI (AI 매핑 틀렸을 때 운영자가 직접 수정) 이번 차수에 포함할지

**추천:**

- 못 찾은 필드: 알림 표시 (조용히 무시하면 운영자가 놓침)
- 수동 매핑: 다음 차수. 이번엔 AI 자동만

**사용자 방향:**

---

### 7차 (선택): 목록 필터/정렬

**작업 내용:**

- 수강생 목록에서 커스텀 필드 값으로 필터
  - select / multi_select: 값 기준 필터
  - checkbox: true/false 필터
  - number: 범위 필터
- 커스텀 필드 값 기준 정렬
- 목록 테이블 컬럼 가시성 설정 (커스텀 필드 컬럼 추가)

**논의 필요:** 6차 완료 후 실제 필요성 재검토. JSONB 컬럼 필터 시 DB 인덱스 설계 필요.

---

## 미결 설계 질문

1. **필드 정의 scope**: ✅ 결정됨 — space별 독립, 템플릿으로 재사용

2. **비상연락처 탭**: 커스텀 탭 + 커스텀 필드로 대체 vs 시스템 탭 별도 구현 유지  
   → **추천: 시스템 탭 유지.** 비상연락처는 "이름+전화번호+관계"의 반복 행 구조라  
   단순 커스텀 필드로 표현 불가. guardian 테이블로 별도 구현이 적합

3. **수강이력 탭**: 마찬가지로 별도 시스템 구현 필요  
   → 커스텀 필드 범위 아님. 별도 기획

4. **탭 이동 UX**: 필드를 탭 간 이동할 때 drag&drop vs 설정 메뉴 내 "탭 이동" 선택  
   → **추천: 설정 메뉴 내 선택** (drag&drop은 탭 패널과 필드 패널이 분리되어 있어 복잡)

---

## 관련 파일 위치

```
현재:
  apps/web/src/server/db/schema/members.ts
  apps/web/src/server/services/members-service.ts
  apps/web/src/features/student-management/
    components/tab-member-overview.tsx
    screens/student-detail-screen.tsx      ← 3차 탭 동적 렌더링 핵심

신규 생성 (1차):
  apps/web/src/server/db/schema/member-tabs.ts
  apps/web/src/server/db/schema/member-fields.ts
  apps/web/src/server/services/member-tabs-service.ts
  apps/web/src/server/services/member-tabs-repository.ts
  apps/web/src/server/services/member-fields-service.ts
  apps/web/src/server/services/member-fields-repository.ts
  apps/web/src/app/api/v1/spaces/[spaceId]/member-tabs/route.ts
  apps/web/src/app/api/v1/spaces/[spaceId]/member-tabs/[tabId]/route.ts
  apps/web/src/app/api/v1/spaces/[spaceId]/member-tabs/[tabId]/fields/route.ts
  apps/web/src/app/api/v1/spaces/[spaceId]/member-fields/[fieldId]/route.ts
  packages/api-contract/src/member-fields.ts

신규 생성 (2차):
  apps/web/src/features/space-settings/
    components/tab-list-panel.tsx
    components/field-list-panel.tsx
    components/field-type-selector.tsx
    components/select-options-editor.tsx

신규 생성 (3차):
  apps/web/src/features/student-management/
    components/custom-tab-content.tsx
    components/field-renderer.tsx
    components/field-renderers/   (타입별 분리)
      text-field.tsx
      select-field.tsx
      multi-select-field.tsx
      checkbox-field.tsx
      date-field.tsx
      url-field.tsx
      number-field.tsx
```
