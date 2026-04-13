# 45-social-login-round-9-ssr-stale-session-cleanup_BACKLOG

## 1차

### 작업내용

- SSR 페이지에서 이미 무효화된 세션 쿠키가 남아 있을 때, 서버 리다이렉트로 쿠키를 정리하는 cleanup 경로를 추가한다.
- 홈과 보호 페이지가 stale 세션을 감지하면 바로 cleanup 경로를 거쳐 일관된 로그인 화면 또는 랜딩으로 복귀하게 만든다.

### 논의 필요

- stale 세션 정리를 middleware로 할지, 명시적 cleanup route로 할지 여부

### 선택지

- A. SSR 페이지에서 cleanup route로 넘겨 쿠키를 정리하고 돌아온다
- B. middleware에서 모든 요청마다 세션을 검사하고 쿠키를 정리한다

### 추천

- A. 현재 구조를 크게 바꾸지 않으면서도 SSR stale 세션 쿠키를 실제로 정리할 수 있는 가장 작은 안전 수정이다.

### 사용자 방향
