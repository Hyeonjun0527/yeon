# 구글 시트 익스포트 연동 BACKLOG

작성일: 2026-04-11  
상태: 기획 확정 대기

---

## 배경

기존 구현은 구글 시트에서 yeon으로 데이터를 임포트(시트→DB)하는 방향이었음.
사용자 요구는 반대 방향: **yeon 스페이스 데이터 → 구글 시트 익스포트(DB→시트)**.
운영자가 수강생 데이터를 구글 시트/엑셀로 쉽게 추출할 수 있도록 한다.

---

## 목표

- 스페이스에 빈 구글 시트 URL을 연동
- "동기화" 버튼 클릭 시 해당 스페이스의 수강생 데이터를 시트에 기록(WRITE)
- 이후 동기화 때마다 시트를 최신 데이터로 덮어씀
- 운영자는 시트를 열면 항상 최신 데이터를 볼 수 있음

---

## 1차: 인증 구조

### 작업 내용

- 기존 Google Drive OAuth에 `spreadsheets` 쓰기 스코프 추가 확인/수정
  - 현재 스코프: `drive.readonly` or `drive.file` 계열로 추정
  - 필요 스코프: `https://www.googleapis.com/auth/spreadsheets`
- `googledrive-service.ts`에서 저장된 OAuth 토큰으로 Sheets API 인증 처리 함수 추가
- 기존 서비스 어카운트 방식(`GOOGLE_SERVICE_ACCOUNT_KEY`) 제거 또는 분리

### 논의 필요

- Google Drive OAuth 재인증 필요 여부 (스코프 변경 시 사용자에게 다시 권한 요청)
- 연동 안 된 상태에서 동기화 시도 시 → Drive 연동 유도 UI

### 선택지

A. 기존 Google Drive OAuth에 spreadsheets 스코프 추가 (재인증 필요)  
B. 별도 "Google Sheets" 연동 OAuth 흐름 분리

### 추천

A — 이미 Drive OAuth 있으니 스코프만 추가. 재인증은 한 번만.

### 사용자 방향

---

## 2차: DB 스키마 변경

### 작업 내용

- `sheet_integrations` 테이블 역할 변경:
  - 기존: `dataType`, `columnMapping` (임포트 설정)
  - 신규: `exportSheetId`, `exportSheetUrl`, `lastExportedAt`
  - 기존 컬럼 중 임포트 전용(`columnMapping`, `dataType`) → 제거 또는 nullable 처리
- 또는 새 테이블 `space_sheet_exports` 생성 (기존 테이블과 분리)

### 논의 필요

- 기존 `sheet_integrations` 데이터 마이그레이션 필요 여부 (현재 프로덕션 데이터 있는지)
- 스페이스당 연동 시트 1개만 허용 vs 여러 개

### 선택지

A. `sheet_integrations` 테이블 재활용 (컬럼 의미만 바꿈)  
B. 새 테이블 `space_sheet_exports` 생성, 기존 테이블 레거시로 두기

### 추천

B — 역할이 완전히 달라져서 새 테이블이 명확. 스페이스당 1개 시트 연동.

### 사용자 방향

---

## 3차: 익스포트 서비스 구현

### 작업 내용

- `google-sheets-export-service.ts` 신규 작성
  - OAuth 토큰으로 Sheets API 인증 (서비스 어카운트 방식 아님)
  - `writeSpaceDataToSheet(spaceId, sheetId, userId)`:
    1. 헤더 행 작성: `이름 | 이메일 | 전화번호 | 수강 상태 | 위험도 | 등록일`
    2. 수강생 목록 조회 (members 테이블)
    3. `spreadsheets.values.update` 또는 `batchUpdate`로 전체 덮어쓰기
    4. `lastExportedAt` 업데이트
  - 커스텀 필드 포함 여부 (추가 컬럼으로 붙이기)

### 논의 필요

- 덮어쓰기(clear + write) vs 추가(append) 방식
- 커스텀 필드 포함 여부

### 선택지

A. 헤더 + 전체 덮어쓰기 — 항상 최신 데이터  
B. 행 추가만 — 변경 이력 보존

### 추천

A — 운영자가 "지금 현재 데이터 뽑기"를 원하는 용도이므로 덮어쓰기가 맞음.

### 사용자 방향

---

## 4차: API 라우트

### 작업 내용

- `POST /api/v1/spaces/{spaceId}/sheet-export/connect` — 시트 URL 등록
- `POST /api/v1/spaces/{spaceId}/sheet-export/sync` — 익스포트 실행
- `GET /api/v1/spaces/{spaceId}/sheet-export` — 연동 상태 조회
- `DELETE /api/v1/spaces/{spaceId}/sheet-export` — 연동 해제

### 논의 필요

없음

### 선택지

없음

### 추천

신규 라우트 `/sheet-export`로 기존 `/sheet-integrations`와 분리.

### 사용자 방향

---

## 5차: UI 교체

### 작업 내용

- `SheetIntegrationPanel` → `SheetExportPanel`로 교체
  - 연동된 시트 URL 표시 + 연결 해제 버튼
  - 미연동 시: "구글 시트 URL 붙여넣기" 입력 + 연결 버튼
  - Google Drive 미연동 시: "Google 계정 연결" CTA
  - "동기화" 버튼 → 익스포트 실행 + 결과 (N명 반영, 마지막 동기화 시각)
- 위치: 수강생 목록 화면 스페이스 설정 영역 (수강생 상세가 아닌 스페이스 단위)

### 논의 필요

- UI 위치: 스페이스 설정 모달 내 탭으로 넣기 vs 현재처럼 별도 패널

### 선택지

A. `SpaceSettingsModal`에 "데이터 내보내기" 탭 추가  
B. 수강생 목록 화면 우측 상단에 "내보내기" 버튼으로 독립

### 추천

B — 내보내기는 설정이 아니라 액션이라 목록 화면의 버튼이 더 자연스럽.

### 사용자 방향

---

## 제거 대상

- `google-sheets-service.ts` — 서비스 어카운트 기반 임포트 서비스 전체 제거
- `SheetIntegrationPanel` 컴포넌트 — 새 컴포넌트로 교체
- `sheet_integrations` 테이블 — 마이그레이션 후 제거 (또는 빈 상태 유지)
- API: `/api/v1/spaces/{spaceId}/sheet-integrations` — 삭제

## 주의 사항

- Google OAuth 스코프 추가 시 기존에 Drive 연동한 사용자는 재인증 필요
- 시트 URL이 빈 구글 시트인지 검증 (접근 권한 사전 확인)
- 동기화 중 에러 시 부분 기록된 데이터 롤백 처리 (clear 후 write이므로 자연 처리됨)
