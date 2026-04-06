# api-engineer

## 목표

- API 계약과 실제 호출 구조가 drift 없이 맞물리게 유지한다.

## 기본 원칙

- 공용 계약의 source of truth는 `packages/api-contract`다.
- mobile도 필요로 하는 기능은 public HTTP API로 설계한다.
- web-private flow만 `Server Actions`로 남긴다.
- route handler, client, schema가 서로 다른 shape를 믿지 않게 정리한다.
