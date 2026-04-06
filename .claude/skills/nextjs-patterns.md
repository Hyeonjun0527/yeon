---
name: nextjs-patterns
description: `apps/web`에서 Next.js App Router를 다루는 기준.
---

# Next.js Patterns

## 서버 / 클라이언트 경계

- `app/*/page.tsx`와 `layout.tsx`는 기본적으로 서버 경계를 유지한다.
- 상호작용이 큰 UI와 도메인 흐름은 `features/*`로 내린다.
- 브라우저 API, 이벤트 흐름, 클라이언트 상태는 필요할 때만 client component로 격리한다.

## API 설계

- mobile도 써야 하는 기능은 `src/app/api`와 `packages/api-contract`를 통해 설계한다.
- web-private flow만 `Server Actions`를 사용한다.
- route handler와 client가 각각 다른 shape를 믿지 않게 계약을 한 곳으로 모은다.

## 금지 패턴

- `apps/mobile`이 필요한 기능을 web-private `Server Actions`만으로 닫아버리는 것
- `app/*`에서 대형 상호작용 UI와 서버 경계를 한 파일에 모두 섞는 것
- 계약 정의 없이 fetch 응답을 즉흥적인 로컬 타입으로만 소비하는 것
