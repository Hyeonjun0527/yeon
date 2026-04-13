## 작업 내용
- 공개 체크인 위치 검색 공급자를 `Kakao Local API`에서 `Juso 검색 API + 좌표 API` 조합으로 교체했습니다.
- Juso 좌표 `entX/entY`를 `proj4`로 `WGS84 위경도`로 변환해 기존 GPS 반경 검증 구조를 유지했습니다.
- 위치 검색 서비스 테스트를 Juso 응답 기준으로 재작성했고, `JUSO_API_CONFIRM_KEY` env 예시를 추가했습니다.

## 변경 이유
- Kakao Local 심사/권한 활성화 대기 없이 오늘 바로 심사 시연 가능한 위치 검색이 필요했습니다.
- 현재 공개 체크인 기능은 내부적으로 `latitude`, `longitude`, `radiusMeters`를 저장해야 학생 GPS 반경 검증이 가능하므로, 주소 검색만이 아니라 좌표 확보까지 되는 공급자가 필요했습니다.

## 검증 방법
- `pnpm --filter @yeon/web exec vitest run src/server/services/__tests__/public-check-location-search-service.test.ts`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @yeon/web build`
- `pnpm --filter @yeon/web exec tsx -e "void (async () => { process.env.JUSO_API_CONFIRM_KEY='TESTJUSOGOKR'; const mod = await import('./src/server/services/public-check-location-search-service.ts'); const result = await mod.default.searchPublicCheckLocations('강남대로12길 8'); console.log(JSON.stringify(result.results.slice(0, 2), null, 2)); })();"`

## 브랜치 정보
- base: `develop`
- head: `feat/public-check-location-juso-1`
- 순번: `1`
