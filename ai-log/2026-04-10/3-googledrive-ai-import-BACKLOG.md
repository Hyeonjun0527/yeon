# Google Drive AI Import — 백로그

> OneDrive 임포트와 병렬로 Google Drive 임포트 지원 추가

---

## 1차: DB 스키마 + 서비스 레이어

### 작업내용

- `googledriveTokens` 테이블 추가 (onedriveTokens와 동일 구조)
- `googledrive-service.ts` 작성
  - Google OAuth2 (`accounts.google.com`) URL 생성
  - 코드 → 토큰 교환
  - 토큰 갱신 (`refresh_token`)
  - 유효 토큰 조회 (만료 시 자동 갱신)
  - 파일 목록 (Google Drive API v3, spreadsheet + xlsx 필터)
  - 파일 다운로드 (일반 파일 `?alt=media`, Google Sheets는 export XLSX)
  - Excel 파싱은 기존 `parseExcelToText` 재사용
  - AI 분석은 기존 `analyzeFileWithAI` 재사용

### 논의 필요

- Google OAuth 클라이언트를 기존 로그인용(`GOOGLE_CLIENT_ID`)과 공유할지, 별도 생성할지
- Drive scope: `drive.readonly` vs `drive.file` (업로드 불필요하므로 readonly)

### 선택지

A. 기존 `GOOGLE_CLIENT_ID` 공유 — redirect URI만 추가 등록
B. Google Drive 전용 OAuth 앱 별도 생성

### 추천

A. 기존 클라이언트 공유. 같은 Google Cloud 프로젝트에서 Drive API 활성화 + redirect URI 추가.

### 사용자 방향

추천(A)대로 진행

---

## 2차: API 라우트

### 작업내용

`/api/v1/integrations/googledrive/` 아래 6개 라우트:

- `status/route.ts` — 연결 여부
- `auth/route.ts` — OAuth URL 반환
- `auth/callback/route.ts` — 코드 교환 + 저장 + 리다이렉트
- `files/route.ts` — 파일 목록
- `analyze/route.ts` — 파일 다운로드 + AI 분석
- `import/route.ts` — 스페이스 + 멤버 일괄 생성

### 논의 필요

없음 (OneDrive 라우트와 동일 구조)

### 선택지

OneDrive 라우트 복사 후 서비스 참조만 교체

### 추천

동일 구조 유지, 파일명만 다름

### 사용자 방향

추천대로 진행

---

## 3차: UI — 통합 임포트 컴포넌트

### 작업내용

- `onedrive-import` feature를 `cloud-import`로 리네임하거나, 기존 유지 + `googledrive-import` 별도 추가
- 사이드바에 두 개 버튼 표시 (OneDrive 연결 / Google Drive 연결)
- 각 provider별 파일 브라우저 모달 재사용 (provider prop으로 분기)
- 분석/임포트 미리보기는 공통 모달 재사용

### 논의 필요

- 코드 재사용 수준: 컴포넌트 공용화 vs 단순 복사

### 선택지

A. `cloud-import` feature로 통합 — provider: 'onedrive' | 'googledrive' prop
B. 각각 독립 feature 유지

### 추천

A. 공통 로직(분석 미리보기, 임포트)은 공유하고 provider별 hook만 분리.

### 사용자 방향

추천(A)대로 진행

---

## 환경 변수 추가 필요

```env
# 기존 Google OAuth와 공유 (Drive API 활성화 필요)
# GOOGLE_CLIENT_ID — 기존 값 사용
# GOOGLE_CLIENT_SECRET — 기존 값 사용
# Google Cloud Console에서 추가할 redirect URI:
# http://localhost:3000/api/v1/integrations/googledrive/auth/callback
# https://yeon.world/api/v1/integrations/googledrive/auth/callback
```

## Google Cloud Console 설정 필요

1. Google Cloud Console → 기존 프로젝트 → API 및 서비스 → 라이브러리 → "Google Drive API" 활성화
2. OAuth 동의 화면 → 범위 추가: `https://www.googleapis.com/auth/drive.readonly`
3. OAuth 클라이언트 ID → 승인된 리디렉션 URI에 callback URL 추가
