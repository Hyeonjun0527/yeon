# GitHub Actions + GHCR Setup

기준 시점: 2026-04-07

이 문서는 `yeon` 저장소에서 GitHub Actions로 Docker 이미지를 GHCR에 publish하고, 브랜치에 따라 develop 서버 또는 운영 서버로 자동 배포하는 절차를 정리한다.

## 1. 저장소에 포함된 배포 파일

- [.github/workflows/docker-image.yml](/home/osuma/coding_stuffs/yeon/.github/workflows/docker-image.yml)
- [Dockerfile](/home/osuma/coding_stuffs/yeon/Dockerfile)
- [.dockerignore](/home/osuma/coding_stuffs/yeon/.dockerignore)
- [compose.dev.yml](/home/osuma/coding_stuffs/yeon/compose.dev.yml)
- [compose.prod.yml](/home/osuma/coding_stuffs/yeon/compose.prod.yml)
- [.env.example](/home/osuma/coding_stuffs/yeon/.env.example)

## 2. 워크플로 동작 방식

워크플로는 아래 경우에 실행된다.

- `develop` 브랜치 push
- `main` 브랜치 push
- 수동 실행 `workflow_dispatch`

워크플로는 다음 순서로 동작한다.

1. checkout
2. QEMU / buildx 준비
3. `GITHUB_TOKEN`으로 GHCR 로그인
4. branch 기준 Docker tag 생성
5. `linux/amd64`, `linux/arm64` 멀티플랫폼 이미지 build + push
6. branch에 맞는 self-hosted runner가 같은 Pi 안에서 compose 파일 동기화 후 로컬 deploy

## 3. 브랜치별 배포 기준

- `develop` push
  - 이미지 태그: `develop`, `sha-<short-sha>`
  - 배포 대상: develop 서버
  - 원격 디렉터리: `/srv/yeon-develop`
  - compose 파일: `compose.dev.yml`
- `main` push
  - 이미지 태그: `latest`, `sha-<short-sha>`
  - 배포 대상: 운영 서버
  - 원격 디렉터리: `/srv/yeon`
  - compose 파일: `compose.prod.yml`
  - 앱 host 포트: `3000`

중요:

- 현재 기준 deploy job은 `self-hosted`, `Linux`, `ARM64` 라벨 runner에서 실행된다.
- 즉 GitHub Actions가 SSH로 외부 Pi에 붙는 구조가 아니라, Pi 위 runner가 자기 로컬 디렉터리를 직접 배포한다.
- 서버에는 최소한 각 디렉터리의 `.env`, Docker, Compose가 준비되어 있어야 한다.
- 같은 Pi에서 운영과 develop을 함께 띄우면 develop 앱 host 포트는 `3001`로 분리하는 것을 권장한다.
- `cloudflared`가 Docker 네트워크로 앱에 붙는 구조라면 `web:3001`이 아니라 고유 alias `yeon-prod-web:3000`, `yeon-dev-web:3000`처럼 라우팅해야 한다.
- deploy job은 `yeon-edge` external network가 없으면 자동으로 생성한다.

## 4. 핵심 권한

```yaml
permissions:
  contents: read
  packages: write
```

의미:

- `contents: read`: 저장소 코드 checkout
- `packages: write`: GHCR push

## 5. GHCR 패키지와 태그

워크플로가 성공하면 GHCR에 아래 이미지가 갱신된다.

```txt
ghcr.io/<owner>/yeon-web-app
```

기본 태그:

- `develop`: develop 서버가 소비하는 최신 develop 이미지
- `latest`: 운영 서버가 소비하는 최신 운영 이미지
- `sha-<short-sha>`: 공통 롤백용 태그

## 6. GitHub Actions secret 기준

현재 same Pi + self-hosted runner 기준에서는 별도 `DEV_RPI_*`, `PROD_RPI_*`, `RPI_*` SSH secret이 필요 없다.

필수:

- 기본 `GITHUB_TOKEN`

선택:

- 없음

메모:

- self-hosted runner가 로컬 Docker에 로그인한 뒤 GHCR 이미지를 pull한다.
- `cloudflared` 컨테이너를 따로 운영한다면 tunnel token은 앱 `.env`가 아니라 `cloudflared` 컨테이너 환경변수에 둔다.
- 같은 tunnel 컨테이너가 운영/개발 앱 둘 다 붙어야 하면 공용 Docker network(`yeon-edge`)에 join시킨다.

## 7. 원격 서버가 만족해야 하는 조건

develop 서버와 운영 서버 모두 아래 전제를 만족해야 한다.

- Docker Engine 설치
- `docker compose` 사용 가능
- GitHub self-hosted runner online 상태
- 각 서버 디렉터리에 실제 `.env` 배치

Pi에 저장소 전체를 clone할 필요는 없다.
workflow가 compose 파일은 runner에서 해당 디렉터리로 매번 동기화한다.

## 8. 수동 배포 예시

운영 서버:

```bash
cd /srv/yeon
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

develop 서버:

```bash
cd /srv/yeon-develop
docker compose -f compose.dev.yml pull
docker compose -f compose.dev.yml up -d
```

이미지가 private이면 먼저 GHCR 로그인:

```bash
docker login ghcr.io
```

## 9. 실패 시 가장 먼저 볼 것

- workflow YAML의 `permissions.packages: write` 누락
- GitHub Settings -> Actions 정책 제한
- Docker build 실패
- GHCR 로그인 실패
- self-hosted runner offline
- 각 서버의 `.env` 누락
- host 포트 충돌 (`3000`, `3001`)

로그에서 자주 보이는 실패 유형:

- `permission_denied`
- `insufficient_scope`
- `denied: permission`
- `403 Forbidden` on GHCR blob HEAD request
- `/srv/yeon-develop/.env` 없음
- self-hosted runner queue 대기

## 10. 운영 메모

- `develop`은 develop 서버 배포 브랜치다.
- `main`은 운영 서버 배포 브랜치다.
- `dev.yeon.world`는 develop 서버를 향하도록 분리한다.
- `yeon.world`는 운영 서버를 향하도록 유지한다.
- Docker service discovery를 쓰는 구조면 `yeon.world -> http://yeon-prod-web:3000`, `dev.yeon.world -> http://yeon-dev-web:3000`으로 붙인다.
