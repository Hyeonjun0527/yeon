# 14-data-layer-schema-contract-alignment BACKLOG

## 차수 1

### 작업내용

- `packages/api-contract`에 `/api/v1/spaces/**` 데이터 계층에서 공용으로 써야 하는 request schema와 literal union을 추가한다.
- 1차 범위는 `spaces`, `members`, `member-tabs`, `member-fields`, `member-field-values` route body schema와 그에 연결된 서버 서비스 입력 타입 정렬로 한정한다.
- `apps/web/src/app/api/v1/spaces/**`의 route-local `z.object(...)` 정의를 `@yeon/api-contract` import 기반으로 교체한다.
- `apps/web/src/server/services/{spaces,members,member-tabs,member-fields,member-field-values}-service.ts`에서 같은 의미의 로컬 입력 타입/union 중 공용 계약으로 올릴 수 있는 부분을 contract 기준으로 맞춘다.
- 기존 API 동작, DB schema, migration, 응답 shape, UI 플로우는 바꾸지 않는다.

### 논의 필요

- 현재 `packages/api-contract`는 주로 응답/일부 request contract 위주인데, `spaces` 하위 CRUD request도 같은 패키지로 올리는 것이 적절한지 경계 판단이 필요하다.
- `updateMember`처럼 아직 public route에 직접 연결되지 않은 내부 입력 타입까지 이번 차수에서 contract화할지는 보수적으로 판단해야 한다.

### 선택지

1. route 파일의 로컬 body schema만 공용 contract로 옮기고 서비스 입력 타입은 최소 변경만 한다.
2. route body schema + 서비스 입력 타입 + field/tab literal union까지 함께 contract로 승격한다.
3. spaces 하위 API 전체 response DTO까지 한 번에 contract화한다.

### 추천

- 2번으로 간다. 현재 가장 큰 드리프트는 `spaces` 계열 route가 로컬 `z.object(...)`와 서비스 로컬 타입을 각각 따로 들고 있는 점이다. request schema와 field/tab literal union까지 한 번에 `packages/api-contract`로 모으면 source of truth가 생기고, 응답 DTO까지 넓히지 않아도 충분히 안전한 정렬 효과를 얻을 수 있다.

### 사용자 방향
