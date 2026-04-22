# XLSX 대량 수강생 가져오기 저장 성능 개선 백로그

## 차수 1

### 작업내용

- `apps/web/src/server/services/import-preview-service.ts`의 대량 가져오기 저장 경로를 분석/저장 단계로 분리해 병목 구간을 줄인다.
- 수강생 생성과 커스텀 필드 값 저장을 row-by-row 직렬 호출 대신 bulk insert / bulk upsert 중심으로 재구성한다.
- import 전체를 하나의 transaction 경계 안에서 처리해 autocommit 오버헤드와 부분 저장 위험을 함께 줄인다.
- 기존 UI/응답 계약은 유지하고, `651명 가져오기` 단계의 서버 처리 시간을 줄이는 데 집중한다.

### 논의 필요

- 동일 스페이스 내 필드 정의 생성도 완전 bulk insert로 바꿀지, 현재 범위에서는 멤버/필드값 bulk 처리까지만 우선할지 판단이 필요하다.
- 대량 입력 시 DB 커넥션 상황에 따라 한 번에 전량 insert 할지, chunk 크기를 둘지 기준이 필요하다.

### 선택지

1. 현재 서비스 구조를 유지한 채 Promise.all 수준의 병렬성만 늘린다.
2. import 전용 bulk API를 추가해 멤버/필드값 저장을 transaction + batch write로 재구성한다.

### 추천

- 선택지 2
- 현재 병목은 단순 병렬성 부족보다 per-row 쿼리 설계에 가깝다. Promise.all만 늘리면 DB 부하와 race 위험은 커지고 쿼리 수는 그대로다. import 전용 bulk 경로를 두는 편이 저장 시간과 상태 정합성을 함께 개선하기 좋다.

### 사용자 방향
