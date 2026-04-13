## 작업 내용

- Juso 주소 검색 응답에서 `juso: null` 형태를 정상 처리하도록 서버 스키마를 보완했습니다.
- 승인키 오류(`E0001`)가 발생하면 `JUSO_API_CONFIRM_KEY 설정 또는 승인키 권한을 확인해 주세요.` 메시지가 그대로 노출되도록 오류 매핑 흐름을 정리했습니다.
- 실제 Juso 권한 오류 응답을 반영한 테스트 케이스를 추가했습니다.

## 변경 이유

- Juso는 승인되지 않은 키에 대해 `juso: null`을 반환할 수 있는데, 기존 구현은 이를 응답 형식 오류로 오인했습니다.
- 운영자가 실제 원인인 승인키 설정/권한 문제를 바로 파악할 수 있어야 오늘 심사용 데모 준비가 가능합니다.

## 검증 방법

- `pnpm --filter @yeon/web lint`
- `pnpm --filter @yeon/web exec vitest run src/server/services/__tests__/public-check-location-search-service.test.ts`
- `pnpm --filter @yeon/web typecheck`
- `pnpm --filter @yeon/web build`
- `apps/web`에서 실제 Juso 키로 `searchPublicCheckLocations("건원대로")` 호출 시 승인키 안내 오류가 반환되는지 확인

## 브랜치 정보

- base: `develop`
- head: `feat/public-check-location-juso-2`
- 순번: `2`
