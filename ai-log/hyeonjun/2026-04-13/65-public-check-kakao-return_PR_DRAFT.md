## 작업 내용

- 공개 체크인 위치 검색 공급자를 `Juso API`에서 `Kakao Local API`로 되돌렸습니다.
- 위치 검색 서비스와 테스트를 카카오 키워드 검색 + 주소 검색 기준으로 다시 맞췄습니다.
- `JUSO_API_CONFIRM_KEY` env 예시와 `proj4` 의존성을 제거했습니다.

## 변경 이유

- Juso 승인키/응답 이슈보다, 이미 심사가 완료된 카카오 앱으로 붙이는 편이 오늘 심사용 결과물을 더 안정적으로 만들 수 있습니다.
- 학생 GPS 반경 검증 구조는 그대로 두고, 운영자 위치 검색 공급자만 카카오로 단순화하는 것이 현재 요구와 가장 잘 맞습니다.

## 검증 방법

- `pnpm --filter @yeon/web exec vitest run src/server/services/__tests__/public-check-location-search-service.test.ts`
- `pnpm --filter @yeon/web lint`
- `pnpm --filter @yeon/web typecheck`
- `pnpm --filter @yeon/web build`
- `apps/web`에서 `searchPublicCheckLocations("건원대로 34번길 51")` 직접 호출 확인

## 브랜치 정보

- base: `develop`
- head: `feat/public-check-location-kakao-return-1`
- 순번: `1`
