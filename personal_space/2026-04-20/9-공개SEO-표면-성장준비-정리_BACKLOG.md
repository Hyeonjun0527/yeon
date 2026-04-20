# 공개 SEO 표면 성장 준비 정리

## 작업내용

- `yeon.world` 기준 공개 SEO 표면과 비공개 표면을 코드 레벨에서 분리한다.
- 루트 `metadata`, `robots`, `sitemap`의 source of truth를 공용 SEO 유틸로 정리한다.
- 공개 index 대상은 `/`, `/typing-service`, `/privacy`, `/terms`로 제한하고, 향후 `/services/<slug>`, `/guides/<slug>` 확장 규칙을 문서화한다.
- 인증 워크스페이스, 토큰 URL, auth error, redirect-only, mockdata, API 경로는 검색 비대상으로 정리한다.
- `https://yeon.world`를 단일 canonical/indexable host로 고정하고, `www.yeon.world` 통합 정책과 `dev.yeon.world` noindex 정책을 반영한다.
- Google Search Console 등록/검증/제출 절차를 저장소 문서로 남긴다.

## 논의 필요

- `www.yeon.world`를 앱 레벨 redirect로 처리할지, 인프라 레벨 redirect로만 처리할지
- 아직 존재하지 않는 `/services/<slug>`, `/guides/<slug>`를 코드 라우트까지 만들지, 문서 규칙까지만 둘지
- `dev.yeon.world` noindex를 metadata만으로 둘지, `X-Robots-Tag` 헤더까지 같이 둘지

## 선택지

### 선택지 A

- SEO 규칙은 문서만 만들고 기존 metadata/sitemap 정도만 최소 수정한다.
- 구현 비용은 작지만 공개/비공개 경계가 다시 흔들릴 가능성이 높다.

### 선택지 B

- 공용 SEO 유틸 + sitemap/robots/layout/page metadata 정리 + Search Console 운영 문서까지 이번 차수에서 마무리한다.
- 향후 공개 페이지 추가 시 규칙 재사용이 쉽고, 현재 공개/비공개 경계도 같이 닫힌다.

### 선택지 C

- 선택지 B에 더해 `/services`, `/guides` 실 라우트까지 미리 만든다.
- 장기 IA는 빨리 잡히지만, 아직 콘텐츠가 없는 상태에서 빈 라우트만 늘어날 수 있다.

## 추천

- 선택지 B.
- 이유:
  - 현재 저장소에는 이미 `typing-service`용 SEO와 루트 `robots/sitemap`이 생기기 시작했기 때문에 source of truth를 지금 묶어야 중복 수정이 줄어든다.
  - `/counseling-service`, `/check/[token]`, `/mockdata`처럼 검색에서 빼야 할 표면이 명확해서 코드 레벨 noindex 경계를 지금 닫는 편이 안전하다.
  - 아직 콘텐츠가 없는 `/services`, `/guides`는 문서 규칙까지만 고정하는 편이 green 단위를 유지하기 쉽다.

## 사용자 방향
