# 36-prepare-hook-docker-guard_BACKLOG

## 작업내용

- 루트 `prepare` 스크립트가 Docker `pnpm install` 단계에서 깨지지 않도록 파일 존재 여부를 먼저 확인하도록 수정한다.
- 로컬 git hook 설치는 유지하되, 스크립트 파일이 없는 CI/컨테이너 환경에서는 조용히 건너뛴다.

## 논의 필요

- 없음

## 선택지

- A. `prepare`에서 `scripts/setup-git-hooks.sh` 존재 여부를 가드한다.
- B. Docker `deps` 단계에서 `scripts/setup-git-hooks.sh`를 먼저 복사한다.

## 추천

- A. git hook 설치는 로컬 개발 편의 기능이므로 install 단계에서 필수 파일처럼 강제하지 않는 편이 더 안전하다.

## 사용자 방향

- Docker install 단계에서 깨지지 않도록 `prepare` 가드 추가
