## 작업 내용

- 공개 체크인 세션 위치 인증 등록 UI를 수동 `위도/경도` 입력에서 `카카오 주소/건물명 검색 결과 선택` 방식으로 전환했습니다.
- `Kakao Local API`를 서버 route handler 뒤에 붙여 위치 검색 결과를 정규화하는 검색 경로를 추가했습니다.
- 위치 인증 반경 정책을 기본 `150m`, 허용 범위 `50~300m`로 고정하고, 세션 생성 검증 메시지도 검색 기반 UX에 맞게 바꿨습니다.
- mock demo 환경에서도 같은 위치 검색 흐름을 확인할 수 있게 mock API 응답을 추가했습니다.

## 변경 이유

- 운영자가 공개 체크인 세션을 만들 때 `위도/경도`를 직접 입력하는 방식은 한국 서비스 운영 흐름과 맞지 않았습니다.
- 실제 요구사항은 입력 UX를 한국형 주소/건물명 검색으로 바꾸되, 학생 체크인 검증은 기존 GPS 반경 비교를 유지하는 것이어서 이를 그대로 반영했습니다.

## 검증 방법

- `pnpm --filter @yeon/web exec vitest run src/server/services/__tests__/public-check-location-search-service.test.ts src/server/services/__tests__/public-check-service.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @yeon/web build`

## 브랜치 정보

- base: `develop`
- head: `feat/public-check-location-search-1`
- 순번: `1`
