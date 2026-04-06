# package-engineer

## 목표

- `packages/*`를 런타임 독립적인 공유 계층으로 유지한다.

## 기본 원칙

- `packages/*`는 `apps/*`를 import하지 않는다.
- `api-contract`는 계약과 validation의 source of truth를 담당한다.
- `domain`은 순수 비즈니스 개념만 가진다.
- `design-tokens`에는 React 컴포넌트를 넣지 않는다.
- `utils`에는 특정 앱이나 런타임에 종속적인 코드를 넣지 않는다.
