# Raspberry Pi `docker compose` Deployment Guide

기준 시점: 2026-04-07

이 문서는 `yeon` 저장소를 Raspberry Pi에 `docker compose`로 배포하는 기준 절차를 정리한다. 현재 기준 운영 모델은 `develop` 서버와 `main` 운영 서버를 분리하는 2계층 구조다.

## 1. 브랜치와 서버 매핑

- `develop` -> develop 서버 -> `dev.yeon.world`
- `main` -> 운영 서버 -> `yeon.world`

브랜치 push 기준:

- `develop` push 시 `compose.dev.yml` 기준 자동 배포
- `main` push 시 `compose.prod.yml` 기준 자동 배포

## 2. 저장소에 있는 배포 자산

- [Dockerfile](/home/osuma/coding_stuffs/yeon/Dockerfile)
- [compose.dev.yml](/home/osuma/coding_stuffs/yeon/compose.dev.yml)
- [compose.prod.yml](/home/osuma/coding_stuffs/yeon/compose.prod.yml)
- [.env.example](/home/osuma/coding_stuffs/yeon/.env.example)
- [.github/workflows/docker-image.yml](/home/osuma/coding_stuffs/yeon/.github/workflows/docker-image.yml)

현재 [apps/web/package.json](/home/osuma/coding_stuffs/yeon/apps/web/package.json)에는 production `build`, `start` 스크립트가 있다.

## 3. 권장 배포 전략

권장 방식은 아래와 같다.

1. Raspberry Pi에는 `Raspberry Pi OS Lite 64-bit`를 사용한다.
2. Pi 안에서 이미지를 직접 빌드하지 않는다.
3. GitHub Actions가 GHCR로 `linux/amd64`, `linux/arm64` 이미지를 publish한다.
4. Pi에서는 `docker compose pull && docker compose up -d`만 수행한다.

이 방식이 나은 이유:

- Pi에서 직접 빌드하면 느리고 메모리 여유가 적다.
- 운영 서버에는 빌드 도구보다 실행 산출물만 두는 편이 단순하다.
- branch별 태그 기준으로 롤백과 재배포가 쉽다.

## 4. 서버 디렉터리 구조

운영 서버:

```txt
/srv/yeon/
  compose.prod.yml
  .env
```

develop 서버:

```txt
/srv/yeon-develop/
  compose.dev.yml
  .env
```

중요:

- GitHub Actions가 compose 파일은 매번 동기화한다.
- `.env`는 각 서버에만 두고 저장소에는 넣지 않는다.

## 5. DB 분리 기준

develop 서버를 상시 자동배포 환경으로 운영할 거면 DB도 운영과 분리해야 한다.

최소 기준:

- 다른 DB 이름
- 다른 DB 유저
- 다른 비밀번호
- 다른 Docker volume 또는 다른 외부 DB 인스턴스

권장 기준:

- 운영 DB와 develop DB를 별도 Postgres 인스턴스 또는 별도 서버로 분리

이유:

- develop 배포 중 스키마 변경이 운영 데이터를 건드리면 안 된다.
- seed, 테스트 데이터, 임시 복구 작업이 운영 데이터와 섞이면 안 된다.
- 운영 장애 분석 중 develop 데이터가 노이즈가 되면 안 된다.

`compose.dev.yml`은 기본값도 운영과 다르게 잡아 두었다.

- `POSTGRES_DB=yeon_develop`
- `POSTGRES_USER=yeon_develop`
- 이미지 태그 기본값 `:develop`

## 6. `.env` 예시

운영 서버 예시:

```env
YEON_WEB_IMAGE=ghcr.io/hyeonjun0527/yeon-web-app:latest
WEB_PORT=3000
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://yeon.world
AUTH_SECRET=<prod-secret>
POSTGRES_DB=yeon
POSTGRES_USER=yeon
POSTGRES_PASSWORD=<prod-password>
DATABASE_URL=postgresql://yeon:<prod-password>@db:5432/yeon
```

develop 서버 예시:

```env
YEON_WEB_IMAGE=ghcr.io/hyeonjun0527/yeon-web-app:develop
WEB_PORT=3000
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://dev.yeon.world
AUTH_SECRET=<dev-secret>
POSTGRES_DB=yeon_develop
POSTGRES_USER=yeon_develop
POSTGRES_PASSWORD=<dev-password>
DATABASE_URL=postgresql://yeon_develop:<dev-password>@db:5432/yeon_develop
```

원칙:

- 민감 값은 이미지에 bake하지 않는다.
- `.env`는 서버에만 둔다.
- develop과 운영은 절대 같은 `DATABASE_URL`을 쓰지 않는다.

## 7. 수동 배포 명령

운영 서버:

```bash
cd /srv/yeon
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
docker compose -f compose.prod.yml ps
```

develop 서버:

```bash
cd /srv/yeon-develop
docker compose -f compose.dev.yml pull
docker compose -f compose.dev.yml up -d
docker compose -f compose.dev.yml ps
```

로그 확인:

```bash
docker compose -f compose.prod.yml logs -f
docker compose -f compose.dev.yml logs -f
```

## 8. Cloudflare Tunnel 기준

질문한 방향대로 `dev.yeon.world`는 별도 develop 경로로 여는 게 맞다. 운영 안정성을 생각하면 dev/prod를 별도 tunnel로 나누는 쪽이 더 안전하다.

권장:

- 운영 tunnel: `yeon.world` -> 운영 서버 `localhost:3000`
- develop tunnel: `dev.yeon.world` -> develop 서버 `localhost:3000`

### 권장안 A. tunnel 2개

- 운영과 develop을 완전히 분리
- 토큰, 장애, 재시작 영향 범위를 분리
- 운영 DNS와 develop DNS를 독립적으로 바꾸기 쉬움

### 대안 B. tunnel 1개 + ingress 2개

가능은 하지만 운영과 develop의 실패 경계가 같이 움직인다.

예시:

```yaml
tunnel: yeon-develop
credentials-file: /etc/cloudflared/yeon-develop.json

ingress:
  - hostname: dev.yeon.world
    service: http://localhost:3000
  - service: http_status:404
```

운영 tunnel 예시:

```yaml
tunnel: yeon-production
credentials-file: /etc/cloudflared/yeon-production.json

ingress:
  - hostname: yeon.world
    service: http://localhost:3000
  - service: http_status:404
```

## 9. 자동 배포 메모

- [docker-image.yml](/home/osuma/coding_stuffs/yeon/.github/workflows/docker-image.yml)이 branch별 GHCR publish와 SSH deploy를 처리한다.
- `develop`은 `DEV_*` secret이 있으면 develop 서버로 자동 배포된다.
- `main`은 `PROD_*` secret이 있으면 운영 서버로 자동 배포된다.
- 운영 workflow는 기존 `RPI_*` secret도 fallback으로 읽는다.
- secret이 없으면 해당 deploy job은 skip되고 GHCR publish까지만 수행된다.

## 10. 운영 체크리스트

- Raspberry Pi OS Lite 64-bit인가
- `docker compose version` 확인했는가
- `arm64` 이미지가 실제로 push 되었는가
- 운영 `.env`와 develop `.env`가 분리되어 있는가
- 운영 DB와 develop DB가 분리되어 있는가
- `dev.yeon.world`, `yeon.world` DNS와 tunnel 대상이 올바른가
- `docker compose logs`로 기동 확인을 했는가

## Sources

- Docker Engine on Raspberry Pi OS: https://docs.docker.com/engine/install/raspberry-pi-os/
- Docker Compose plugin on Linux: https://docs.docker.com/compose/install/linux/
- Docker multi-platform builds: https://docs.docker.com/build/building/multi-platform/
- Cloudflare Tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
