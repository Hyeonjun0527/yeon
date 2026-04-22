## 작업 내용

- 루트 포털 기준 공개 SEO source of truth를 `apps/web/src/lib/seo.ts`로 정리했습니다.
- 루트 `metadata`, `robots`, `sitemap`, `proxy`에 canonical host와 noindex 정책을 연결했습니다.
- `/typing-service` 공개 라우트와 콘텐츠형 페이지를 추가했습니다.
- `/check`, `/counseling-service`, `/mockdata`, `/auth/error`, 레거시 상담 화면을 검색 비대상으로 정리했습니다.
- `www.yeon.world`를 canonical host(`https://yeon.world`)로 보내는 redirect 정책을 추가했습니다.
- Google Search Console 운영 절차 문서를 추가했습니다.

## 변경 이유

- 검색에 노출할 URL과 숨길 URL이 섞여 있으면 sitemap, canonical, Search Console 운영이 흔들립니다.
- `yeon.world`를 단일 canonical host로 고정하고, 공개 서비스 진입면인 `/typing-service`를 함께 정리해야 성장 준비형 SEO 기준이 닫힙니다.
- 운영자가 그대로 따라 할 수 있는 Search Console 등록 절차 문서가 필요했습니다.

## 검증 방법

- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @yeon/web build`
- `pnpm --filter @yeon/web exec vitest run src/lib/__tests__/seo.test.ts`

## 브랜치 정보

- base: `develop`
- head: `feat/public-seo-growth-ready-1`
- 순번: `1`
