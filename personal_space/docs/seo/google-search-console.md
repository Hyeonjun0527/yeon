# Google Search Console 운영 가이드

## 목적

- `https://yeon.world`를 단일 canonical/indexable host로 유지한다.
- 운영 sitemap 제출 대상을 `https://yeon.world/sitemap.xml` 하나로 고정한다.
- 인증 워크스페이스, 토큰 URL, mockdata, auth error, redirect-only 경로가 검색에 섞이지 않게 운영 기준을 맞춘다.

## Canonical 원칙

- 검색 기준 URL: `https://yeon.world`
- `www.yeon.world`: `yeon.world`로 301 redirect
- `dev.yeon.world`: noindex, 운영 sitemap 제외

## 현재 공개 SEO 대상

- `/`
- `/typing-service`
- `/privacy`
- `/terms`
- 향후 `/services/<slug>`
- 향후 `/guides/<slug>`

## 현재 검색 제외 대상

- `/counseling-service`
- `/check/[token]`
- `/auth/error`
- `/landing`
- `/contest`
- `/mockdata/*`
- `/api/*`

## slug 규칙

- 공개 SEO slug는 영문 소문자 kebab-case만 사용한다.
- 서비스 소개와 가이드/아티클은 아래처럼 분리하는 것을 기본값으로 본다.
  - `/services/<slug>`
  - `/guides/<slug>`

## Search Console 등록 순서

1. `https://yeon.world/` URL-prefix property를 등록한다.
2. 가능하면 `yeon.world` Domain property도 추가해 도메인 단위 진단을 같이 본다.
3. HTML meta verification 방식을 쓰면 Search Console에서 발급한 값을 `GOOGLE_SITE_VERIFICATION` 환경변수에 넣는다.
4. 운영 배포 후 `https://yeon.world/sitemap.xml`을 제출한다.
5. `URL 검사`에서 `/`, `/typing-service`, `/privacy`, `/terms`가 canonical `yeon.world`로 잡히는지 확인한다.
6. `/counseling-service`, `/check/<token>`, `/auth/error`, `/mockdata/...`가 noindex 또는 비제출 대상으로 보이는지 확인한다.

## 환경변수

- 운영: `NEXT_PUBLIC_APP_URL=https://yeon.world`
- 개발: `NEXT_PUBLIC_APP_URL=https://dev.yeon.world`
- 검증 메타: `GOOGLE_SITE_VERIFICATION=<Search Console value>`

## 코드 기준 source of truth

- SEO 유틸: `apps/web/src/lib/seo.ts`
- 루트 metadata: `apps/web/src/app/layout.tsx`
- sitemap: `apps/web/src/app/sitemap.ts`
- robots: `apps/web/src/app/robots.ts`
- 호스트 redirect / dev noindex 헤더: `apps/web/src/proxy.ts`

## 운영 체크리스트

- [ ] `www.yeon.world/*` 접속 시 `https://yeon.world/*`로 308/301 redirect 된다.
- [ ] `dev.yeon.world/robots.txt`는 전체 disallow 또는 noindex 정책을 반영한다.
- [ ] 운영 `robots.txt`는 `/counseling-service`, `/check/`, `/auth/`, `/mockdata/`, `/api/`를 제외한다.
- [ ] 운영 `sitemap.xml`에는 `/landing`, `/contest`가 포함되지 않는다.
- [ ] 운영 canonical은 상대 path를 쓰더라도 최종 출력이 `https://yeon.world/...`로 정렬된다.
