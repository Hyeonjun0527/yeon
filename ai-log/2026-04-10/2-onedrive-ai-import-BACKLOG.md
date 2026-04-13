# OneDrive AI 자동 임포트 백로그

## 목표

OneDrive를 연결하면 거기 있는 엑셀/Docs 파일을 AI가 읽어서
스페이스(코호트)와 수강생 정보를 1초 만에 자동 생성한다.

---

## 배경

현재 수강생 추가는 수동 입력만 가능. 실제 운영 환경에서는:

- 수강생 명단이 엑셀에 있고
- 기수 정보가 구글 시트나 Word 문서에 흩어져 있고
- 이걸 하나하나 복붙하는 게 실제 고통 포인트

OneDrive에 연결 한 번만 하면 → AI가 파일 구조 파악 → 코호트+수강생 한 방에 생성

---

## 1차수 — Microsoft Graph API 연동 + 파일 목록 UI

### 작업 내용

**환경변수:**

```
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=consumers  # 개인 OneDrive
```

**OAuth2 흐름:**

1. "OneDrive 연결" 버튼 클릭
2. Microsoft OAuth 동의 화면
3. 콜백 → access_token + refresh_token 저장 (DB 또는 세션)
4. 연결 상태 표시

**API:**

- `GET /api/v1/integrations/onedrive/status` — 연결 여부 확인
- `GET /api/v1/integrations/onedrive/files` — 드라이브 파일 목록 (Excel, Docs 필터)
- `POST /api/v1/integrations/onedrive/auth` — OAuth 콜백 처리

**UI:**

- 사이드바 하단 "OneDrive 연결" 버튼
- 연결 후 파일 목록 모달 (탐색기 형태)
- 파일 선택 → "AI 분석" 버튼

### 논의 필요

- access_token 저장 위치: DB(users 테이블 컬럼 추가) vs 세션 암호화

### 선택지

A. DB 저장 (refresh_token으로 자동 갱신, 영구 연결)
B. 세션 저장 (로그아웃 시 해제, 매번 재연결 필요)

### 추천

A — 운영자가 매번 재연결하는 UX는 실사용 불가

### 사용자 방향

(미정)

---

## 2차수 — AI 파일 분석 + 자동 임포트

### 작업 내용

**파일 파싱:**

- `.xlsx` → `xlsx` 패키지로 시트 데이터 추출
- `.docx` → `mammoth` 패키지로 텍스트 추출
- Google Sheets (공유 링크) → 기존 구글 시트 API 활용

**AI 분석 (Claude API 사용):**

```
시스템 프롬프트:
  "아래 데이터에서 코호트명과 수강생 목록을 추출해라.
   코호트명, 수강생 이름, 이메일, 전화번호, 상태를 JSON으로 반환해라."

입력: 파싱된 파일 텍스트/표 데이터
출력: { cohortName, students: [{ name, email, phone, status }] }
```

**임포트 플로우:**

1. 파일 선택 → 서버에서 Graph API로 파일 다운로드
2. 파일 파싱 → 텍스트/표 추출
3. Claude API 분석 → 구조화 JSON 반환
4. 프리뷰 모달: "이렇게 만들 예정이에요" 확인
5. 확인 클릭 → 스페이스 생성 + 수강생 일괄 생성

**API:**

- `POST /api/v1/integrations/onedrive/analyze` — 파일 분석 (fileId 받아서 AI 분석 결과 반환)
- `POST /api/v1/integrations/onedrive/import` — 분석 결과로 스페이스+멤버 생성

**UI 상태 흐름:**

```
파일 선택 → [분석 중...] → 프리뷰 확인 → [생성 중...] → 완료
```

### 논의 필요

- 파일이 수백 개일 때 목록 탐색 UX (폴더 트리 vs 검색)
- AI 분석 실패 시 수동 보정 UI 필요 여부

### 선택지

A. 분석 결과 그대로 import (빠름, 오류 가능)
B. 프리뷰에서 수정 가능하게 (안전, UI 복잡)

### 추천

B — 수강생 이름 오타나 중복 등 AI 실수를 사람이 한 번 검토해야 신뢰 생김

### 사용자 방향

(미정)

---

## 3차수 — 다중 파일 일괄 처리 + 자동 매핑

### 작업 내용

- 여러 파일 동시 선택 → 병렬 AI 분석
- 같은 코호트명이 여러 파일에 걸쳐 있으면 자동 병합
- 수강생 중복 감지 (이름+이메일 기준)
- 주기적 동기화: OneDrive 파일 변경 감지 → 자동 업데이트

---

## 브랜치 전략

- 1차수: `feat/onedrive-auth`
- 2차수: `feat/onedrive-ai-import`
- 3차수: `feat/onedrive-bulk-sync`
