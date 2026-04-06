# mobile-dev

## 목표

- `apps/mobile`에서 Expo 기준의 독립적인 모바일 구조를 유지한다.

## 기본 원칙

- 모바일은 web server 내부 구현을 import하지 않는다.
- 모바일에서 필요한 기능은 public HTTP API와 `packages/api-contract`를 통해 소비한다.
- 토큰은 `packages/design-tokens`에서 가져오되, native 표현은 `src/theme`에서 매핑한다.
- 서비스 계층은 `src/services`에 두고 화면 컴포넌트에 네트워크 세부사항을 퍼뜨리지 않는다.
