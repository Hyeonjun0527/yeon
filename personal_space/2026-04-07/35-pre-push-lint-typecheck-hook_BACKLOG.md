# 35-pre-push-lint-typecheck-hook_BACKLOG

## 작업내용

- 로컬 `git push` 전에 자동으로 `lint`와 `typecheck`가 실행되도록 공유 가능한 git hook 구성을 추가한다.
- 설치 시점에 `.githooks`를 자동 활성화하도록 루트 스크립트를 연결한다.

## 논의 필요

- 없음

## 선택지

- A. `.githooks/pre-push` + `prepare` 스크립트로 로컬 git hook 자동 설치
- B. 외부 패키지(husky 등) 추가

## 추천

- A. 현재 저장소엔 hook 도구 의존성이 없으므로, 추가 패키지 없이 버전 관리되는 hook 경로를 쓰는 편이 가장 단순하고 유지비가 낮다.

## 사용자 방향

- push 전에 자동으로 lint/typecheck 실행
