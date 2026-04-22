# 타자연습서비스 SEO MVP

## 작업내용

- `yeon.world/typing-service`에 공개 진입 가능한 타자연습 서비스 첫 landing을 만든다.
- 라우트는 `app`을 얇게 두고 실제 UI/상태는 `features/typing-service` 아래에 둔다.
- 첫 차수는 검색 유입을 받을 수 있는 콘텐츠형 랜딩과 즉시 플레이 가능한 타자연습 MVP를 한 화면에 함께 둔다.
- 서비스 metadata, canonical, Open Graph, Twitter metadata를 붙인다.
- FAQ 또는 서비스 소개 기반의 구조화 데이터(JSON-LD)를 넣어 검색 결과 해석을 돕는다.
- 전역 `robots.ts`, `sitemap.ts`를 추가해 루트 포털과 `typing-service`를 검색엔진에 명시적으로 노출한다.
- 플랫폼 서비스 레지스트리에서 `typing-service`를 `live`로 전환하고 포털 카드가 실제 진입점으로 동작하게 만든다.

## 논의 필요

- 첫 차수에서 랭킹, 저장, 계정 연동까지 넣을지
- SEO 타깃을 한국어 단일로 먼저 갈지, 나중 다국어 확장을 염두에 둔 정보 구조를 같이 깔지
- `/typing-service` 한 페이지에 소개와 플레이를 함께 둘지, `/typing-service/play`로 분리할지

## 선택지

### 선택지 A

- `/typing-service` 한 페이지에 소개 + 연습 + FAQ를 모두 둔다.
- SEO와 초기 체류, 즉시 사용성이 가장 빠르다.

### 선택지 B

- `/typing-service`는 마케팅 랜딩, `/typing-service/play`는 실제 연습 화면으로 분리한다.
- 장기 IA는 깔끔하지만 첫 차수에서는 파일/메타/내부링크 구성이 더 커진다.

### 선택지 C

- 연습 화면만 먼저 만들고 SEO는 최소 metadata만 붙인다.
- 구현은 빠르지만 검색 유입과 바이럴 확산을 노리는 서비스 성격과 잘 맞지 않는다.

## 추천

- 선택지 A.
- 이유:
  - 첫 차수에서 가장 작은 범위로 검색 유입용 콘텐츠와 실제 사용 경험을 함께 제공할 수 있다.
  - 익명 진입 서비스라 랜딩과 플레이 사이 클릭 한 번도 줄이는 편이 리텐션에 유리하다.
  - 이후 트래픽이 붙으면 `/typing-service/play`, `/typing-service/rankings`, `/typing-service/texts/<slug>` 식으로 확장하기 쉽다.

## 사용자 방향
