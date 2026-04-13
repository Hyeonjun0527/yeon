## 작업 내용
- 공개 체크인 위치 검색에서 Kakao `OPEN_MAP_AND_LOCAL` 미활성화 오류를 운영자용 안내 메시지로 변환했습니다.
- 위치 검색 React Query 재시도를 꺼서 실패 시 에러를 즉시 노출하도록 조정했습니다.
- Kakao 권한 오류 번역 동작을 검증하는 서비스 테스트를 추가했습니다.

## 변경 이유
- 기존에는 Kakao 설정 누락 상황에서 검색 UI가 오래 대기하는 것처럼 보여 원인 파악이 어려웠습니다.
- 운영자가 바로 조치할 수 있는 메시지를 보여줘야 위치 인증 세션 설정 실패를 빠르게 해결할 수 있습니다.

## 검증 방법
- `pnpm --filter @yeon/web exec vitest run src/server/services/__tests__/public-check-location-search-service.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @yeon/web build`
- Playwright로 `http://localhost:3000/home/student-management/check-board?spaceId=3a6e29f2-d195-4761-9f3f-fc3b6c49298e` 진입 후 위치 검색 시 안내 메시지 노출 확인

## 브랜치 정보
- base: `develop`
- head: `feat/public-check-location-search-2`
- 순번: `2`
