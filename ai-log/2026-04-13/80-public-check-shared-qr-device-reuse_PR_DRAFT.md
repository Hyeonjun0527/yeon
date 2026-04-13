## 작업 내용

- 공개 체크인 URL을 `entry=qr`, `entry=location`으로 분리하고 공개 페이지에서 `체크인 방식 선택` UI를 제거했습니다.
- QR 진입은 `처음 1회 이름 + 전화번호 뒤 4자리 본인 확인` 후 같은 기기에서 자동 인증되도록 signed cookie 기반 remember 흐름을 추가했습니다.
- 관리자 세션 카드에 `QR 다운로드`, `QR 열기`, `위치 기반체크인 링크`를 분리 노출하고 QR SVG 다운로드 API를 추가했습니다.
- 공개 체크인 보드 스냅샷/히스토리 기록용 테이블과 마이그레이션을 포함해 제출 시 학생 보드 반영이 실제로 완료되게 맞췄습니다.

## 변경 이유

- 공용 QR을 유지하면서도 학생이 매번 이름과 전화번호를 다시 입력하지 않게 해 체크인 마찰을 줄이기 위해서입니다.
- QR을 이미 스캔한 사용자가 링크 내부에서 다시 방식을 고르게 하는 흐름이 비논리적이어서, QR과 위치 진입을 URL 레벨에서 분리했습니다.
- 로컬 DB에 히스토리 테이블이 없어서 QR 제출이 500으로 실패하던 상태를 함께 정리해야 실제 기능이 동작했습니다.

## 검증 방법

- `pnpm --filter @yeon/web exec vitest run src/server/services/__tests__/public-check-service.test.ts`
- `pnpm --filter @yeon/web exec eslint 'src/app/check/[token]/page.tsx' 'src/app/api/v1/public-check-sessions/[token]/route.ts' 'src/app/api/v1/public-check-sessions/[token]/submit/route.ts' 'src/app/api/v1/public-check-sessions/[token]/verify/route.ts' 'src/app/api/v1/public-check-sessions/[token]/qr/route.ts' 'src/features/student-management/components/student-check-board-panel.tsx' 'src/server/services/public-check-device-cookie.ts' 'src/server/services/public-check-service.ts' 'src/server/services/__tests__/public-check-service.test.ts' 'src/server/services/student-board-service.ts'`
- `pnpm --filter @yeon/web typecheck`
- `pnpm --filter @yeon/web build`
- `pnpm --filter @yeon/web db:migrate`
- 로컬 HTTP 검증으로 `GET session(entry=qr) -> POST verify -> GET session(entry=qr, remembered) -> POST submit(method=qr)` 순서가 모두 200인지 확인
- headless Playwright로 `/check/<token>?entry=qr` 첫 진입 시 이름/전화번호 입력과 `본인 확인` 버튼이 보이고, 인증 후 `김소율 님으로 자동 확인되었습니다.` 배너와 과제 입력 UI가 뜨며 제출 성공 메시지가 노출되는지 확인
- headless Playwright로 `/check/<token>?entry=location`에서 버튼 문구가 `위치 기반체크인`이고 이름/전화번호 입력이 유지되는지 확인

## 브랜치 정보

- base: `develop`
- head: `web-student-board-history-1`
- 순번: `1`
