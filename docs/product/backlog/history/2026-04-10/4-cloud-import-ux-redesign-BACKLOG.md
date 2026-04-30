# Cloud Import UX 전면 재설계 — 백로그

> 파일 브라우저를 모달에서 메인 영역 인라인으로 이전 + 파일 미리보기 + 분석 결과 분할 화면

---

## 1차: 파일 프록시 API 추가

### 작업내용

- `GET /api/v1/integrations/onedrive/file/[fileId]/route.ts`
  - 세션 인증 확인
  - OneDrive에서 파일 바이트 스트리밍
  - Content-Type 헤더 그대로 전달
- `GET /api/v1/integrations/googledrive/file/[fileId]/route.ts`
  - Google Drive 파일 다운로드 (Google Sheets → XLSX export)
  - 동일 구조

### 논의 필요

없음

### 선택지

단일 프록시 엔드포인트 vs provider별 분리

### 추천

provider별 분리 — 기존 라우트 구조와 일관성 유지

### 사용자 방향

추천대로

---

## 2차: react-doc-viewer 설치 및 설정

### 작업내용

- `pnpm --filter @yeon/web add @cyntler/react-doc-viewer`
- 지원 형식: XLSX, DOCX, PDF, PNG/JPG/GIF, CSV, MP4, HTML
- 미지원 형식(HWP 등): "미리보기를 지원하지 않는 형식입니다" 폴백
- 텍스트/코드 파일(.txt, .js, .ts 등): `<pre>` 태그 별도 처리

### 논의 필요

없음

### 선택지

없음

### 추천

@cyntler/react-doc-viewer

### 사용자 방향

추천대로

---

## 3차: 인라인 파일 브라우저 UI (모달 제거)

### 작업내용

- 기존 `FileBrowserModal` + `ImportPreviewModal` 제거
- `features/cloud-import/` 전면 재설계:
  - `CloudImportBrowser` — 메인 영역에서 렌더되는 인라인 파일 브라우저
    - Provider 탭: OneDrive / Google Drive
    - OAuth 미연결 시: 탭 클릭 → 연결 버튼 자동 표시
    - 브레드크럼 + 뒤로가기 폴더 네비게이션
    - 파일 그리드 (기존 N×M 그리드 재사용)
  - `CloudImportSplitView` — 파일 클릭 후 분할 화면
    - 왼쪽: 파일 미리보기 (react-doc-viewer, 프록시 URL 사용)
    - 오른쪽: "분석 시작" 버튼 → 로딩 → 분석 결과
- `student-management-home` 빈 상태에 "스프레드시트로 가져오기" CTA 추가
- 사이드바 OneDrive/Google Drive 버튼 → 메인 영역 파일 브라우저 진입으로 연결

### 논의 필요

없음 (사용자와 이미 확정)

### 선택지

없음

### 추천

확정 구조대로 구현

### 사용자 방향

확정대로

---

## 4차: 분석 + 임포트 분할 패널

### 작업내용

오른쪽 패널 상태 머신:

1. `idle` — "분석 시작" 버튼
2. `analyzing` — 로딩 스피너 (왼쪽 파일 미리보기는 유지)
3. `preview` — 스페이스명 입력 + 수강생 목록 (이름, 연락처 수정 가능)
4. `importing` — 임포트 진행 중
5. `done` — 성공 메시지 → 파일 브라우저 닫기 + 스페이스 목록 갱신

기존 `useCloudImport` 훅 상태 관리 재활용 + 패널 상태 추가

### 논의 필요

없음

### 선택지

없음

### 추천

상태 머신 패턴으로 오른쪽 패널 구현

### 사용자 방향

확정대로

---

## 전체 화면 흐름 요약

```
[빈 상태 or 사이드바 버튼]
  ↓ 클릭
[메인 영역 전체 → 파일 브라우저]
  탭: OneDrive | Google Drive
  브레드크럼: 루트 > 폴더A
  파일 그리드 (N×M)
  ↓ 파일 클릭
[분할 화면]
  LEFT: 파일 미리보기 (react-doc-viewer)
  RIGHT: [분석 시작] 버튼
  ↓ 분석 시작
  LEFT: 그대로 유지
  RIGHT: 로딩 → 스페이스명 + 수강생 목록 프리뷰
  ↓ [스페이스 생성] 클릭
  → 스페이스 + 수강생 생성 완료
  → 파일 브라우저 닫힘 + 사이드바 갱신
```
