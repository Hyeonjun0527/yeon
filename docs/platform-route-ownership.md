# Platform Route Ownership

`yeon.world`를 여러 서비스의 루트 포털로 유지하면서도, 각 서비스가 자기 URL과 API 소유권을 갖도록 하기 위한 운영 문서다.

## 원칙

- 루트 플랫폼은 `identity`, `session`, `account`, `service registry`를 소유한다.
- `counseling-service`는 상담 UI, 상담 API, 상담 전용 외부 연동 OAuth를 소유한다.
- 지금은 단일 배포를 유지하므로 실제 route handler는 `apps/web/src/app/api/...`에 남아 있어도 된다.
- 외부에 노출되는 URL은 서비스 소유권 기준으로 보이게 하고, 내부는 proxy rewrite로 연결한다.

## 소유권 표

| 영역                          | 외부 진입 URL                                                           | 내부 handler 기준                               | 소유자             | 비고                                                    |
| ----------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------- | ------------------ | ------------------------------------------------------- |
| 루트 랜딩/포털                | `/`                                                                     | `app/page.tsx`                                  | 플랫폼             | 서비스 목록, 로그인 진입, 공통 포털                     |
| 루트 소셜 로그인 시작         | `/api/auth/google`, `/api/auth/kakao`                                   | `/api/auth/*`                                   | 플랫폼             | `next` 파라미터로 서비스 이동만 위임                    |
| 루트 소셜 로그인 callback     | `/api/auth/google/callback`, `/api/auth/kakao/callback`                 | `/api/auth/*/callback`                          | 플랫폼             | 카카오/구글 계정 연결과 글로벌 세션 발급                |
| 루트 세션 관리                | `/api/auth/logout`, `/api/auth/session/cleanup`, `/api/v1/auth/session` | 동일                                            | 플랫폼             | 서비스 공통 세션 정리                                   |
| 상담 메인 화면                | `/counseling-service/...`                                               | `app/counseling-service/...`                    | counseling-service | 외부와 내부 모두 상담 서비스 경로를 canonical로 사용    |
| 상담 REST API                 | `/counseling-service/api/v1/...`                                        | `/api/v1/...`                                   | counseling-service | proxy가 `/counseling-service/api/* -> /api/*`로 rewrite |
| 상담 전용 연동 OAuth 시작     | `/counseling-service/api/v1/integrations/<provider>/auth`               | `/api/v1/integrations/<provider>/auth`          | counseling-service | 서비스 내부 기능으로 취급                               |
| 상담 전용 연동 OAuth callback | `/counseling-service/api/v1/integrations/<provider>/auth/callback`      | `/api/v1/integrations/<provider>/auth/callback` | counseling-service | 외부 공개 URL도 상담 서비스 기준으로 등록               |

## OAuth / Redirect 매트릭스

| 흐름              | 시작 URL                                                   | callback URL                                                        | 성공 후 이동                                                        | 소유자             | 유지 원칙                          |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------ | ---------------------------------- |
| 카카오 로그인     | `/api/auth/kakao?next=...`                                 | `/api/auth/kakao/callback`                                          | `next` 또는 기본 `/counseling-service`                              | 플랫폼             | 루트 auth 허브 유지                |
| 구글 로그인       | `/api/auth/google?next=...`                                | `/api/auth/google/callback`                                         | `next` 또는 기본 `/counseling-service`                              | 플랫폼             | 루트 auth 허브 유지                |
| Google Drive 연동 | `/counseling-service/api/v1/integrations/googledrive/auth` | `/counseling-service/api/v1/integrations/googledrive/auth/callback` | `/counseling-service/student-management?googledrive_connected=true` | counseling-service | provider 콘솔에도 서비스 path 등록 |
| OneDrive 연동     | `/counseling-service/api/v1/integrations/onedrive/auth`    | `/counseling-service/api/v1/integrations/onedrive/auth/callback`    | `/counseling-service/student-management?onedrive_connected=true`    | counseling-service | provider 콘솔에도 서비스 path 등록 |

## 무엇을 지금 바꿔야 하는가

- `카카오 로그인`, `구글 로그인`, `logout`, `session cleanup`은 루트에 둔다.
- 상담 UI에서 호출하는 fetch URL은 `resolveApiHref` 계열로 `counseling-service` base path를 붙인다.
- 상담 전용 외부 연동 OAuth는 시작 URL, callback URL, callback 후 복귀 URL까지 모두 `counseling-service` 기준으로 맞춘다.

## 무엇은 아직 물리적으로 안 옮겨도 되는가

- `apps/web/src/app/api/v1/...` handler 위치 자체
- DB 스키마와 server service 위치
- 단일 배포 구성

위 항목은 지금 그대로 둬도 된다. 대신 외부 URL 계약만 서비스 소유권에 맞게 유지하면, 나중에 독립 배포로 전환할 때 ingress/proxy만 바꿔서 승격할 수 있다.
