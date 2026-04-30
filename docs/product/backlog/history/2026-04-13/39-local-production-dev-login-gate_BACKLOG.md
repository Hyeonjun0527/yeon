# 39. 로컬 production start 개발자 로그인 허용 가드

## 작업내용

- `dev-login` 허용 조건을 `NODE_ENV` 단일 기준에서 분리한다.
- 실제 운영 프로덕션은 계속 차단하고, 로컬 `pnpm --filter @yeon/web build && pnpm --filter @yeon/web start` 환경에서는 개발자 로그인을 허용한다.
- 랜딩 페이지의 로그인 옵션 노출과 `/api/auth/dev-login` 세션 발급이 같은 가드를 공유하도록 맞춘다.
- localhost/loopback 판별 테스트를 추가한다.

## 논의 필요

- 로컬 허용 범위를 `localhost`, `127.0.0.1`, `::1`, `*.localhost`까지 포함할지
- 프리뷰 배포나 사설 도메인에서 실수로 dev-login이 열릴 여지를 완전히 막을지

## 선택지

- A. `NODE_ENV !== "production"`만 유지
- B. `ALLOW_DEV_LOGIN === "true"` 이고 비프로덕션 또는 loopback origin이면 허용
- C. 별도 env(`ALLOW_DEV_LOGIN_IN_LOCAL_PROD`)를 추가해 production localhost도 명시적으로만 허용

## 추천

- B
- 이유: 사용자가 원하는 “로컬 production start에서는 허용, 실제 운영에서는 차단”을 추가 env 없이 바로 만족한다.
- 운영 배포에서 localhost/loopback origin이 들어올 수 없으므로 안전 경계가 분명하다.
- UI 노출과 API 허용을 같은 origin 기반 함수로 묶기 쉽다.

## 사용자 방향
