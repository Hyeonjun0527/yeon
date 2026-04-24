# Deep Interview Spec: YEON 멀티 서비스 플랫폼 구조

## Metadata

- Interview ID: `deep-interview-2026-04-20-yeon-multi-service-platform`
- Rounds: 5
- Final Ambiguity Score: 14.7%
- Type: brownfield
- Generated: 2026-04-20
- Threshold: 20%
- Status: PASSED

## Clarity Breakdown

| Dimension          | Score | Weight | Weighted |
| ------------------ | ----- | ------ | -------- |
| Goal Clarity       | 0.96  | 0.35   | 0.336    |
| Constraint Clarity | 0.88  | 0.25   | 0.220    |
| Success Criteria   | 0.72  | 0.25   | 0.180    |
| Context Clarity    | 0.78  | 0.15   | 0.117    |
| **Total Clarity**  |       |        | **0.853** |
| **Ambiguity**      |       |        | **0.147** |

## Goal

`yeon.world`를 여러 웹서비스의 루트 포털로 전환한다. 루트는 포털, 중앙 로그인, 공통 계정/설정, 결제 진입점을 소유하고, 각 서비스는 서비스별 도메인 권한과 UX를 독립적으로 가진다. 현재 상담 서비스는 `yeon.world/counseling-service`로 옮기며, 향후 타자연습, 랭킹 등 바이럴 서비스도 `yeon.world/<service-slug>` 형태로 확장한다. 현재는 단일 배포를 유지하되, 구조는 장차 독립 배포로 승격 가능하도록 분리한다.

## Constraints

- 루트 `yeon.world`는 포털 + 중앙 인증 허브 역할을 맡는다.
- 카카오 로그인, 구글 로그인은 루트에 유지한다.
- 상담 관련 UI와 API는 장기적으로 `yeon.world/counseling-service` 하위로 이동한다.
- 서비스 내부 권한은 루트가 아니라 각 서비스가 소유한다.
- 서비스별 접근 정책은 다를 수 있다.
- 어떤 서비스는 로그인 없이도 사용 가능해야 한다.
- 현재 단계에서는 물리적 독립 배포를 강제하지 않는다.
- 대신 코드, 라우팅, 인증, 서비스 레지스트리는 나중에 독립 배포로 승격할 수 있게 설계한다.
- 루트는 결제 자체를 당장 구현하지 않더라도, 공통 결제 진입점과 계정/설정의 소유권은 가진다.

## Non-Goals

- 지금 당장 포털 앱과 서비스 앱을 물리적으로 분리 배포하는 것
- 모든 서비스의 세부 권한 모델을 루트에서 중앙 통제하는 것
- 모든 서비스를 공통 로그인 강제로 묶는 것
- 모든 서비스를 하나의 공통 구독/크레딧 체계로 즉시 통합하는 것

## Acceptance Criteria

- [ ] 루트 `yeon.world`가 포털, 중앙 로그인, 서비스 목록, 공통 계정/설정의 진입점 역할을 한다.
- [ ] 상담 서비스의 사용자 경로가 `yeon.world/counseling-service/...` 아래로 정리된다.
- [ ] 카카오/구글 로그인 시작점과 콜백의 소유권이 루트 플랫폼으로 정의된다.
- [ ] 서비스별로 `익명 허용` 또는 `로그인 필요` 정책을 선언할 수 있다.
- [ ] 서비스 내부 권한 모델은 각 서비스에서 독립적으로 유지된다.
- [ ] 현재는 단일 배포를 유지해도, 서비스 경계와 라우팅 규약만으로 추후 독립 배포 전환이 가능하다.
- [ ] 새 서비스 추가 시 루트 포털의 서비스 레지스트리에 등록하고 `/<service-slug>`로 노출하는 규약이 정의된다.

## Assumptions Exposed & Resolved

| Assumption | Challenge | Resolution |
| ---------- | --------- | ---------- |
| 여러 서비스를 하려면 바로 독립 배포가 필요하다 | 현재 배포 구조가 실제로 단일 앱인지 확인 | 지금은 단일 배포 유지, 대신 독립 배포 가능 구조로 설계 |
| 플랫폼이면 모든 서비스가 공통 로그인 전제여야 한다 | 바이럴 서비스의 익명 진입 필요성 확인 | 서비스별 접근 정책을 허용 |
| 중앙 플랫폼이면 권한도 모두 중앙화해야 한다 | 상담 서비스와 바이럴 서비스의 성격 차이 검토 | Identity는 중앙화, 도메인 권한은 서비스별 분리 |
| 플랫폼이면 결제도 곧바로 통합해야 한다 | 현재는 결제 기능 자체가 없음을 확인 | 결제 진입점만 루트가 소유하고 실제 과금은 후순위 |

## Technical Context

현재 저장소는 브라운필드이며 배포와 런타임 구조는 사실상 단일 Next.js 앱 `@yeon/web` 중심이다.

- 루트 랜딩/로그인 진입점: [apps/web/src/app/page.tsx](/home/osuma/coding_stuffs/yeon/apps/web/src/app/page.tsx:1)
- 상담 메인 화면: [apps/web/src/app/home/page.tsx](/home/osuma/coding_stuffs/yeon/apps/web/src/app/home/page.tsx:1)
- OAuth 시작/콜백: [apps/web/src/app/api/auth/google/route.ts](/home/osuma/coding_stuffs/yeon/apps/web/src/app/api/auth/google/route.ts:1), [apps/web/src/app/api/auth/kakao/route.ts](/home/osuma/coding_stuffs/yeon/apps/web/src/app/api/auth/kakao/route.ts:1)
- OAuth callback URL 생성: [apps/web/src/server/auth/social-providers.ts](/home/osuma/coding_stuffs/yeon/apps/web/src/server/auth/social-providers.ts:72)
- 인증 redirect 규약: [apps/web/src/server/auth/constants.ts](/home/osuma/coding_stuffs/yeon/apps/web/src/server/auth/constants.ts:1)
- 일부 app base path 추상화 존재: [apps/web/src/lib/app-route-context.tsx](/home/osuma/coding_stuffs/yeon/apps/web/src/lib/app-route-context.tsx:1)
- Docker/compose는 단일 `@yeon/web` 앱만 배포: [Dockerfile](/home/osuma/coding_stuffs/yeon/Dockerfile:11), [compose.prod.yml](/home/osuma/coding_stuffs/yeon/compose.prod.yml:4)

현재 코드에서 가장 큰 구조적 리스크는 다음이다.

- 루트 포털, 인증, 상담 UI, 상담 API가 같은 앱과 같은 경로 공간에 넓게 섞여 있다.
- `/home`, `/api/auth/*`, `/api/v1/*` 같은 절대 경로 문자열이 많아 서비스 base path 이동 비용이 높다.
- 루트와 서비스의 책임 경계가 아직 개념적으로 고정되지 않았다.

## Recommended Target Architecture

### 1. Platform Shell

- 소유 범위: 랜딩, 중앙 로그인, 공통 세션, 계정/설정, 서비스 목록, 결제 진입점
- URL 예시:
  - `/`
  - `/login`
  - `/account`
  - `/services`
  - `/billing` (향후)

### 2. Service Apps

- 상담 서비스: `/counseling-service`
- 타자연습 서비스: `/typing-service`
- 랭킹 서비스: `/beauty-ranking-service`
- 각 서비스는 다음을 스스로 소유한다.
  - 도메인 데이터
  - 서비스 내부 권한
  - 서비스 전용 UX
  - 서비스별 로그인/익명 정책

### 3. Identity Boundary

- 카카오/구글 로그인은 루트 플랫폼이 소유한다.
- 루트는 글로벌 세션과 기본 사용자 identity를 소유한다.
- 각 서비스는 루트 세션을 기반으로 진입 여부를 판단할 수 있지만, 세부 권한은 서비스별로 해석한다.

### 4. Deployment Principle

- 현재: 단일 배포 유지
- 목표: 서비스 경계, URL 규약, 인증 계약, 서비스 레지스트리를 먼저 분리
- 미래: 필요할 때 reverse proxy/ingress 기반 독립 배포로 승격

## Ontology (Key Entities)

| Entity | Type | Fields | Relationships |
| ------ | ---- | ------ | ------------- |
| Yeon Portal | core domain | root domain, landing, service registry, account entry | has many Independent Service App |
| Identity/Auth Hub | core domain | social login providers, global session, profile | belongs to Yeon Portal, is consumed by services |
| Counseling Service | core domain | service slug, service routes, domain auth policy | one of Independent Service App |
| Typing Practice Service | supporting | service slug, anonymous access policy | one of Independent Service App |
| Beauty Ranking Service | supporting | service slug, viral/public access policy | one of Independent Service App |
| Independent Service App | core domain | slug, access policy, service owner, route base | registered in Yeon Portal |
| Global Session | supporting | user identity, session state, provider bindings | issued by Identity/Auth Hub |
| Service-local Authorization | core domain | roles, access rules, domain policies | owned by each service |
| Platform Billing Entry | supporting | billing page, subscription entry, future payment surface | belongs to Yeon Portal |
| Service Access Policy | core domain | anonymous allowed, login required, mixed access | configured per Independent Service App |

## Ontology Convergence

| Round | Entity Count | New | Changed | Stable | Stability Ratio |
| ----- | ------------ | --- | ------- | ------ | --------------- |
| 1 | 6 | 6 | - | - | - |
| 2 | 8 | 2 | 0 | 6 | 75% |
| 3 | 9 | 1 | 0 | 8 | 89% |
| 4 | 10 | 1 | 0 | 9 | 90% |
| 5 | 10 | 0 | 0 | 10 | 100% |

## Interview Transcript

<details>
<summary>Full Q&A (5 rounds)</summary>

### Round 1

**Q:** `yeon.world`의 최종 역할은 무엇인가?
**A:** 여러 프로젝트들의 루트 통로로 사용하고, 상담 서비스는 `/counseling-service`로 옮긴다. 앞으로 다양한 바이럴 서비스를 붙인다.
**Ambiguity:** 46.5%

### Round 2

**Q:** 중앙 인증은 어디까지 책임지는가?
**A:** 장기적으로 중앙 세션 기반 구조가 맞고, 서비스 내부 권한은 서비스별로 분리한다.
**Ambiguity:** 34%

### Round 3

**Q:** 결제/공통 플랫폼 화면은 어떻게 가져갈 것인가?
**A:** 지금 결제 기능은 없지만, 장기적으로 루트가 공통 결제 진입점을 가지는 구조가 좋다.
**Ambiguity:** 28%

### Round 4

**Q:** 모든 서비스가 로그인 전제인가?
**A:** 아니고 서비스마다 다르게 가능해야 하며, 어떤 서비스는 로그인 없이도 사용 가능해야 한다.
**Ambiguity:** 21%

### Round 5

**Q:** 독립 배포가 지금 필요한가?
**A:** 지금은 단일 배포 유지, 대신 나중에 필요하면 독립 배포로 승격 가능한 구조로 만든다.
**Ambiguity:** 14.7%

</details>
