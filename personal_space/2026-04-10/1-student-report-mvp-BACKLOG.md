# 학생 관리 리포트 MVP 백로그

## 목표

기존 툴(구글 시트)을 연동해 수강생 데이터를 자동 수집하고,
강사가 수강생 상태를 한눈에 파악할 수 있는 리포트를 제공한다.

---

## 현재 상태

- students 테이블 없음 (UI만 존재, DB/API 미연결)
- googleapis 패키지 없음
- counseling_records 테이블은 존재 (입학 상담 녹음 분석 연동 가능)

---

## 1차수 — DB 스키마 + 수강생 기본 CRUD

### 작업 내용

**신규 테이블 4개:**

```sql
cohorts          -- 기수/반 (ex: "2기 풀스택 부트캠프")
students         -- 수강생 (cohort에 속함)
activity_logs    -- 행동 로그 (출결, 과제 등)
sheet_integrations -- 구글 시트 연동 설정
```

**스키마 상세:**

```typescript
cohorts {
  id, name, description,
  startDate, endDate,
  createdByUserId, createdAt, updatedAt
}

students {
  id, cohortId,
  name, email, phone,
  status: "active" | "withdrawn" | "graduated",
  initialRiskLevel: "low" | "medium" | "high",  -- 입학 상담 분석 결과
  counselingRecordId,  -- 연결된 입학 상담 녹음
  createdAt, updatedAt
}

activity_logs {
  id, studentId, cohortId,
  type: "attendance" | "assignment" | "material_view" | "login",
  status: "present" | "late" | "absent" | "submitted" | "not_submitted",
  recordedAt,  -- 실제 발생 시각
  source: "google_sheets" | "manual" | "platform",
  metadata: jsonb,  -- 추가 정보 (ex: 과제명, 지각 시간 등)
  createdAt
}

sheet_integrations {
  id, cohortId,
  sheetUrl, sheetId,
  dataType: "attendance" | "assignment",
  columnMapping: jsonb,  -- 어느 컬럼이 이름/날짜/상태인지
  lastSyncedAt,
  createdAt, updatedAt
}
```

**API:**
- `GET/POST /api/v1/cohorts`
- `GET/POST /api/v1/cohorts/[cohortId]/students`
- `GET /api/v1/cohorts/[cohortId]/report`

### 논의 필요

- students 테이블에 counselingRecordId 연결 방식 (nullable FK)
- activity_logs의 metadata 컬럼 구조 확정

### 선택지

A. students가 독립 테이블 (counseling_records와 느슨하게 연결)
B. counseling_records를 students의 서브셋으로 재구성

### 추천

A — 기존 counseling_records 건드리지 않고 확장성 있게 연결

### 사용자 방향

추천 기준으로 진행

---

## 2차수 — 구글 시트 연동

### 작업 내용

- `googleapis` 패키지 설치
- Google Sheets API v4 연동 서비스
- 시트 URL 입력 → 컬럼 매핑 → 데이터 파싱 → activity_logs 저장
- 주기적 동기화 (수동 트리거 우선, 자동 나중)

**환경변수 추가:**
```
GOOGLE_SHEETS_SERVICE_ACCOUNT_KEY=
```

### 추천

서비스 계정 방식 (OAuth 불필요, 시트 공유만 하면 됨)

---

## 3차수 — 강사용 리포트 UI

### 작업 내용

- 기수별 수강생 목록
- 수강생별 출결/과제 완료율 시각화
- 위험 신호 수강생 하이라이트
- 입학 상담 프로파일 연결 표시

---

## 브랜치 전략

- 1차수: `feat/student-db-schema`
- 2차수: `feat/google-sheets-integration`
- 3차수: `feat/student-report-ui`

각각 develop에 PR 머지 후 다음 단계 진행
