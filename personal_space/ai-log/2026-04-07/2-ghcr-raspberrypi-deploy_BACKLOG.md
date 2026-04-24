# 2-ghcr-raspberrypi-deploy_BACKLOG

## 현재 상태

- Raspberry Pi `docker compose` 배포 가이드는 문서로만 존재한다.
- 저장소에는 아직 `.github/workflows/docker-image.yml`, `Dockerfile`, `.dockerignore`, `compose.prod.yml` 같은 실제 배포 산출물이 없다.
- `apps/web`은 Next.js 앱으로 실행 가능하지만, GHCR publish와 Pi pull 배포 흐름은 아직 연결되지 않았다.

## 목표 상태

- GitHub Actions가 `main` push 또는 수동 실행 시 GHCR에 웹 이미지를 publish한다.
- Raspberry Pi는 `compose.prod.yml`과 `.env`만으로 이미지를 pull해서 실행할 수 있다.
- 저장소 문서에 GitHub Settings와 GHCR 확인 절차가 정리되어 있다.

## 1차

### 작업내용

- `.github/workflows/docker-image.yml` 추가
- GHCR publish에 필요한 `permissions`, metadata, buildx, login, build-push 설정 추가
- 워크플로가 `linux/arm64` 기준 이미지를 publish하도록 설정

### 논의 필요

- `main` push 외에 태그 릴리스도 같이 발행할지

### 선택지

- A. `main` push + `workflow_dispatch`만 지원
- B. `main` push + semver tag push도 지원

### 추천

- A. 지금은 운영 단순성이 우선이라 `main` push + 수동 실행만 둔다

### 사용자 방향

## 2차

### 작업내용

- 루트 `Dockerfile` 추가
- `.dockerignore` 추가
- `compose.prod.yml` 추가
- `apps/web/.env.example`와 루트 배포 예시 환경변수 정리

### 논의 필요

- DB를 같은 Compose에 같이 둘지, 외부 DB를 기본값으로 둘지

### 선택지

- A. Compose에 Postgres 포함
- B. 외부 DB 연결만 기본값으로 문서화

### 추천

- A와 B를 모두 지원하되, 기본 예시는 Compose 내 Postgres 포함으로 둔다

### 사용자 방향

## 3차

### 작업내용

- GitHub Settings와 GHCR 연결 체크리스트 문서화
- Raspberry Pi 배포 문서와 README 갱신
- 검증 가능한 범위의 typecheck / workflow YAML / 문서 검증

### 논의 필요

- GitHub Actions에서 DB migration까지 자동화할지

### 선택지

- A. 이미지만 publish
- B. publish 후 원격 배포까지 자동화

### 추천

- A. 지금은 publish까지만 자동화하고, Pi 배포는 수동 `docker compose pull && up -d`로 둔다

### 사용자 방향
