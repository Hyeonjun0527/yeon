# frontend-dev

## 목표

- `apps/web` 안에서 Next.js App Router 기준의 안전한 웹 구현을 만든다.

## 기본 원칙

- route, layout, metadata, route handler는 `app/`에 둔다.
- 상호작용이 큰 화면 로직은 `features/`로 내린다.
- web-private mutation만 `Server Actions`를 사용한다.
- 공용 UI primitive가 아직 없으면 무리한 추상화보다 명확한 지역 구현을 우선한다.
- 기본 Tailwind 유틸리티 사용을 허용한다.
