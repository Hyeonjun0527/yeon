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
6. branch에 맞는 Raspberry Pi 서버로 compose 파일 동기화 후 SSH deploy

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

중요:

- 워크플로는 원격 서버에 compose 파일을 `scp`로 같이 올린다.
- 따라서 원격 서버에는 최소한 `.env`와 Docker / Compose만 준비되어 있으면 된다.

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

### develop 서버

필수:

- `DEV_RPI_HOST`
- `DEV_RPI_USERNAME`
- `DEV_RPI_SSH_KEY`

선택:

- `DEV_RPI_PORT`
- `DEV_GHCR_PULL_USERNAME`
- `DEV_GHCR_PULL_TOKEN`

### 운영 서버

권장:

- `PROD_RPI_HOST`
- `PROD_RPI_USERNAME`
- `PROD_RPI_SSH_KEY`

선택:

- `PROD_RPI_PORT`
- `PROD_GHCR_PULL_USERNAME`
- `PROD_GHCR_PULL_TOKEN`

하위 호환:

- 기존 `RPI_HOST`, `RPI_PORT`, `RPI_USERNAME`, `RPI_SSH_KEY`
- 기존 `GHCR_PULL_USERNAME`, `GHCR_PULL_TOKEN`

운영 workflow는 위 legacy secret도 fallback으로 읽는다.

## 7. 원격 서버가 만족해야 하는 조건

develop 서버와 운영 서버 모두 아래 전제를 만족해야 한다.

- Docker Engine 설치
- `docker compose` 사용 가능
- GitHub Actions가 접속할 SSH 계정 준비
- 각 서버 디렉터리에 실제 `.env` 배치

원격 서버에 저장소 전체를 clone할 필요는 없다.
workflow가 compose 파일은 매번 동기화한다.

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
- Raspberry Pi SSH 접속 실패
- 각 서버의 `.env` 누락
- `DEV_*` 또는 `PROD_*` secret 누락

로그에서 자주 보이는 실패 유형:

- `permission_denied`
- `insufficient_scope`
- `denied: permission`
- `403 Forbidden` on GHCR blob HEAD request
- SSH host key mismatch

## 10. 운영 메모

- `develop`은 develop 서버 배포 브랜치다.
- `main`은 운영 서버 배포 브랜치다.
- `dev.yeon.world`는 develop 서버를 향하도록 분리한다.
- `yeon.world`는 운영 서버를 향하도록 유지한다.
