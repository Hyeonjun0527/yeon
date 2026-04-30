# 9. AI 프로필 자동완성 (파일 업로드 → AI 파싱)

## 배경

현재 "데이터 연동"(`SheetIntegrationPanel`)은 **구글 시트 URL 기반 스페이스 단위 연동**으로, 출결/과제 데이터를 `activity_logs`에 가져오는 기능이다. 멤버 프로필 필드(이름, 이메일, 전화번호 등)와는 무관하다.

사용자가 원하는 것은 별개: **수강생 화면에서 파일(CSV, 텍스트 등)을 올리면 AI가 읽어서 해당 수강생의 프로필 필드를 자동으로 채워주는 기능**.

---

## 1차 — 백엔드 인프라

### 작업 내용

1. `members-service.ts`에 `updateMember(memberId, data)` 함수 추가
2. `PATCH /api/v1/spaces/:spaceId/members/:memberId` route 핸들러 신설
3. `POST /api/v1/spaces/:spaceId/members/:memberId/profile-import` route 핸들러 신설
   - multipart form으로 파일 수신
   - 파일 내용을 텍스트로 추출 (CSV, 일반 텍스트 우선 지원)
   - OpenAI에 "이 파일에서 수강생 프로필 정보 추출" 요청
   - `{ suggestions: { name?, email?, phone?, status?, initialRiskLevel? } }` 반환

### 논의 필요

- 파일 형식: CSV만? 텍스트도? Excel?
- 현재 AI 서비스는 OpenAI (`gpt-4.1-mini`) 사용 중

### 추천

- 1차는 CSV + 일반 텍스트만 지원, 파일 크기 1MB 제한
- Excel은 별도 라이브러리 필요하므로 2차로 미룸

### 사용자 방향

- 추천 기준으로 진행

---

## 2차 — UI 컴포넌트

### 작업 내용

1. `profile-import-panel.tsx` 신설
   - 드래그&드롭 또는 클릭 파일 선택
   - 업로드 → 로딩 → AI 제안값 표시
   - 필드별 체크박스로 적용 여부 선택
   - 저장 버튼 → PATCH 호출 → 성공 시 멤버 데이터 갱신
2. `tab-member-overview.tsx` 하단에 패널 삽입
3. `index.ts`에 export 추가

### 논의 필요

- 저장 후 멤버 리프레시: 현재 `tab-member-overview`는 `member` prop을 받음 → 부모(`student-detail-screen`)에서 멤버 재조회 필요

### 추천

- 1차에선 간단하게 패널 내부에서만 상태 관리, 저장 후 `window.location.reload()` 임시 처리
- 2차에서 `useMemberDetail` 훅에 `refetch` 노출로 개선

---

## 구현 파일 목록

| 파일                                                                                  | 변경 유형 |
| ------------------------------------------------------------------------------------- | --------- |
| `apps/web/src/server/services/members-service.ts`                                     | 수정      |
| `apps/web/src/app/api/v1/spaces/[spaceId]/members/[memberId]/route.ts`                | 신설      |
| `apps/web/src/app/api/v1/spaces/[spaceId]/members/[memberId]/profile-import/route.ts` | 신설      |
| `apps/web/src/features/student-management/components/profile-import-panel.tsx`        | 신설      |
| `apps/web/src/features/student-management/components/tab-member-overview.tsx`         | 수정      |
| `apps/web/src/features/student-management/components/index.ts`                        | 수정      |
