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
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
KAKAO_REST_API_KEY=<kakao-rest-api-key>
KAKAO_CLIENT_SECRET=<kakao-client-secret>
POSTGRES_DB=yeon
POSTGRES_USER=yeon
POSTGRES_PASSWORD=<prod-password>
DATABASE_URL=postgresql://yeon:<prod-password>@db:5432/yeon
```

develop 서버 예시:

```env
YEON_WEB_IMAGE=ghcr.io/hyeonjun0527/yeon-web-app:develop
WEB_PORT=3001
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://dev.yeon.world
AUTH_SECRET=<dev-secret>
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>
KAKAO_REST_API_KEY=<kakao-rest-api-key>
KAKAO_CLIENT_SECRET=<kakao-client-secret>
POSTGRES_DB=yeon_develop
POSTGRES_USER=yeon_develop
POSTGRES_PASSWORD=<dev-password>
DATABASE_URL=postgresql://yeon_develop:<dev-password>@db:5432/yeon_develop
```

원칙:

- 민감 값은 이미지에 bake하지 않는다.
- `.env`는 서버에만 둔다.
- develop과 운영은 절대 같은 `DATABASE_URL`을 쓰지 않는다.
- `CLOUDFLARE_TUNNEL_TOKEN`은 앱 `.env`가 아니라 별도 `cloudflared` 컨테이너 환경변수에 둔다.

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

현재처럼 같은 Pi에 운영/개발 앱을 함께 올리고, `cloudflared`도 Docker 컨테이너로 띄우는 구조라면 기존 `yeon-tunnel` 하나에 hostname 두 개를 매핑하는 방식이 가장 빠르다. 다만 `web:3001`처럼 서비스명에 host 포트를 붙이는 방식은 맞지 않는다. 컨테이너 간 통신은 둘 다 내부 포트 `3000`을 쓰고, 운영/개발 웹에 서로 다른 Docker alias를 주는 쪽이 안전하다.

권장:

- `yeon.world` -> `http://yeon-prod-web:3000`
- `dev.yeon.world` -> `http://yeon-dev-web:3000`

전제:

- 운영/개발 compose와 `cloudflared` 컨테이너가 공용 Docker network `yeon-edge`에 join해야 한다.
- [compose.prod.yml](/home/osuma/coding_stuffs/yeon/compose.prod.yml)은 `yeon-prod-web` alias를, [compose.dev.yml](/home/osuma/coding_stuffs/yeon/compose.dev.yml)은 `yeon-dev-web` alias를 사용한다.
- GitHub Actions deploy job도 `yeon-edge`가 없으면 자동으로 생성한다.

### 권장안 A. tunnel 1개 + ingress 2개

- 현재 이미 `yeon-tunnel`이 살아 있고, 같은 Pi에서 운영/개발을 함께 띄우는 구조에 가장 잘 맞는다.
- Public Hostname 두 개만 추가하면 된다.

예시:

```yaml
tunnel: yeon-tunnel
credentials-file: /etc/cloudflared/yeon-tunnel.json

ingress:
  - hostname: yeon.world
    service: http://yeon-prod-web:3000
  - hostname: dev.yeon.world
    service: http://yeon-dev-web:3000
  - service: http_status:404
```

`cloudflared` Docker Compose 예시:

```yaml
services:
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run --token ${CLOUDFLARE_TUNNEL_TOKEN}
    networks:
      - yeon-edge

networks:
  yeon-edge:
    external: true
```

### 대안 B. tunnel 2개 완전 분리

- 운영과 develop의 장애 범위를 더 잘 나눌 수 있다.
- 다만 지금 상태에서는 새 tunnel 생성, token 교체, Public Hostname 재정리가 추가로 필요하다.

운영 tunnel 예시:

```yaml
tunnel: yeon-production
credentials-file: /etc/cloudflared/yeon-production.json

ingress:
  - hostname: yeon.world
    service: http://yeon-prod-web:3000
  - service: http_status:404
```

develop tunnel 예시:

```yaml
tunnel: yeon-development
credentials-file: /etc/cloudflared/yeon-development.json

ingress:
  - hostname: dev.yeon.world
    service: http://yeon-dev-web:3000
  - service: http_status:404
```

## 9. 자동 배포 메모

- [docker-image.yml](/home/osuma/coding_stuffs/yeon/.github/workflows/docker-image.yml)이 branch별 GHCR publish와 self-hosted runner 로컬 deploy를 처리한다.
- `develop` push 시 runner가 `/srv/yeon-develop`에 `compose.dev.yml`을 동기화하고 deploy한다.
- `main` push 시 runner가 `/srv/yeon`에 `compose.prod.yml`을 동기화하고 deploy한다.
- 별도 SSH secret 없이 runner가 같은 Pi 로컬 Docker를 직접 조작한다.
- 각 디렉터리의 `.env`가 없으면 deploy job은 실패한다.

## 10. 운영 체크리스트

- Raspberry Pi OS Lite 64-bit인가
- `docker compose version` 확인했는가
- `docker network create yeon-edge`를 해 두었는가
- `arm64` 이미지가 실제로 push 되었는가
- 운영 `.env`와 develop `.env`가 분리되어 있는가
- 운영 DB와 develop DB가 분리되어 있는가
- `dev.yeon.world`, `yeon.world` Public Hostname이 각각 `yeon-dev-web:3000`, `yeon-prod-web:3000`을 가리키는가
- 앱 `.env`에 tunnel token을 넣지 않았는가
- `docker compose logs`로 기동 확인을 했는가

## Sources

- Docker Engine on Raspberry Pi OS: https://docs.docker.com/engine/install/raspberry-pi-os/
- Docker Compose plugin on Linux: https://docs.docker.com/compose/install/linux/
- Docker multi-platform builds: https://docs.docker.com/build/building/multi-platform/
- Cloudflare Tunnel docs: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/
