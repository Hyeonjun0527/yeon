# Raspberry Pi `docker compose` Deployment Guide

기준 시점: 2026-04-07

이 문서는 `yeon` 저장소를 Raspberry Pi에 `docker compose`로 배포하는 기준 절차를 정리한다.
현재 저장소 상태와 실제 운영 배포 절차를 분리해서 설명한다.

## 1. 현재 저장소 상태

2026-04-07 기준 현재 저장소에는 아래 배포 파일이 있다.

- [Dockerfile](/home/osuma/coding_stuffs/yeon/Dockerfile)
- [compose.prod.yml](/home/osuma/coding_stuffs/yeon/compose.prod.yml)
- [.dockerignore](/home/osuma/coding_stuffs/yeon/.dockerignore)
- [.env.example](/home/osuma/coding_stuffs/yeon/.env.example)
- [.github/workflows/docker-image.yml](/home/osuma/coding_stuffs/yeon/.github/workflows/docker-image.yml)

현재 [apps/web/package.json](/home/osuma/coding_stuffs/yeon/apps/web/package.json)에는 production `build`, `start` 스크립트도 있다.

즉, 이제 배포 절차는 아래처럼 본다.

1. GitHub Actions로 GHCR 이미지 publish
2. Raspberry Pi 서버 준비
3. GitHub self-hosted runner가 online이면 Raspberry Pi에서 자동 배포
4. runner가 없거나 offline이면 Pi에서 수동 `compose pull && up -d`

## 2. 권장 배포 전략

운영 권장 방식은 아래와 같다.

1. Raspberry Pi에는 `Raspberry Pi OS Lite`를 사용한다.
2. Pi 안에서 앱 이미지를 직접 빌드하지 않는다.
3. 개발 PC나 CI에서 `linux/arm64` 이미지를 빌드해 레지스트리에 push한다.
4. Pi에서는 `docker compose pull && docker compose up -d`만 수행한다.

이 방식이 더 나은 이유는 아래와 같다.

- Pi에서 직접 빌드하면 느리고 메모리 여유가 적다.
- 운영 서버에는 빌드 도구보다 실행 산출물만 두는 편이 단순하다.
- 같은 태그를 기준으로 롤백과 재배포가 쉬워진다.

## 3. Raspberry Pi OS 준비

Raspberry Pi 공식 문서 기준으로 Raspberry Pi OS는 64비트와 32비트 이미지를 제공하고, Lite 버전은 헤드리스 서버 용도에 적합하다.

권장:

- Raspberry Pi 4 / 5: `Raspberry Pi OS Lite 64-bit`
- 헤드리스 운영 서버: Desktop 없이 Lite

초기 세팅 후 먼저 업데이트한다.

```bash
sudo apt update
sudo apt full-upgrade -y
sudo reboot
```

아키텍처도 바로 확인한다.

```bash
uname -m
dpkg --print-architecture
```

보통 아래처럼 나온다.

- `aarch64` 또는 `arm64`: `linux/arm64` 이미지 사용
- `armv7l` 또는 `armhf`: `linux/arm/v7` 이미지 사용

이 문서는 기본적으로 `arm64`를 기준으로 설명한다.

## 4. Docker Engine + Compose 설치

Docker 공식 설치 문서를 기준으로 Raspberry Pi OS에 Docker Engine과 Compose plugin을 설치한다.

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/raspbian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/raspbian \
  $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

설치 확인:

```bash
docker --version
docker compose version
docker buildx version
```

## 5. 운영용 기본 설정

Docker Linux post-install 문서 기준으로 `docker` 그룹 사용과 부팅 시 자동 시작 설정을 맞춘다.

```bash
sudo usermod -aG docker $USER
newgrp docker

sudo systemctl enable docker.service
sudo systemctl enable containerd.service
```

주의:

- `docker` 그룹은 사실상 root 권한에 준하는 권한을 가진다.
- 운영 서버라면 이 그룹에 넣을 사용자 수를 최소화한다.

운영 안정성을 위해 `live-restore`도 켜두는 편이 좋다.

```bash
sudo mkdir -p /etc/docker
cat <<'EOF' | sudo tee /etc/docker/daemon.json
{
  "live-restore": true
}
EOF

sudo systemctl reload docker || sudo systemctl restart docker
```

## 6. 이 저장소에서 먼저 추가해야 할 것

Raspberry Pi 배포 전에 이 저장소에서 이미 추가된 항목은 아래와 같다.

1. `apps/web` production `build` / `start` 스크립트
2. 웹 앱용 `Dockerfile`
3. 루트 `.dockerignore`
4. [compose.prod.yml](/home/osuma/coding_stuffs/yeon/compose.prod.yml)
5. 루트 [.env.example](/home/osuma/coding_stuffs/yeon/.env.example)
6. GHCR publish workflow

추가로 사용자가 준비해야 하는 것은 아래다.

1. GitHub Actions / GHCR 웹 설정 확인
2. Raspberry Pi 서버에 실제 `.env` 배치
3. GitHub self-hosted runner 등록
4. 필요 시 수동 `docker login ghcr.io`
5. 배포 실행

최소 체크리스트:

- `apps/web/package.json`에 `build`, `start`가 있는가
- 앱이 `0.0.0.0`에서 뜨는가
- DB 연결이 환경변수 기반인가
- `arm64` 이미지로 빌드 가능한가

## 7. 이미지 빌드 전략

### 권장: 외부 빌드 후 레지스트리 push

운영 권장 방식은 개발 PC나 CI에서 이미지를 빌드해서 GHCR 같은 레지스트리에 push하는 것이다.

단일 arm64 이미지 예시:

```bash
docker buildx build \
  --platform linux/arm64 \
  -t ghcr.io/<owner>/yeon-web-app:latest \
  --push .
```

멀티 플랫폼 예시:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t ghcr.io/<owner>/yeon-web-app:latest \
  --push .
```

설명:

- `linux/amd64`: 일반 개발 PC 또는 서버
- `linux/arm64`: Raspberry Pi 64-bit

Pi는 pull 시 자기 아키텍처에 맞는 이미지를 받는다.

### 비권장: Pi에서 직접 `docker compose build`

가능은 하지만 운영 기본값으로 두지 않는다.

- 빌드 시간이 길다
- 메모리 압박이 크다
- 빌드 실패 시 운영 서버에서 문제를 바로 맞게 된다

## 8. Raspberry Pi 배포 디렉터리 구조

Pi에는 보통 아래 정도만 두면 된다.

```txt
/srv/yeon/
  compose.prod.yml
  .env
  deploy.sh
```

Git 저장소 전체를 Pi에 clone할지, compose 파일만 둘지는 선택할 수 있다.
운영 단순성을 위해서는 `compose` 파일과 환경변수만 두는 편을 권장한다.

## 8-1. GitHub self-hosted runner 준비

고정 IP나 SSH inbound 없이 자동 배포하려면 Raspberry Pi 안에 GitHub self-hosted runner를 등록하는 편이 단순하다.

요약 절차:

1. `Repository -> Settings -> Actions -> Runners -> New self-hosted runner`
2. `Linux`, `ARM64` 선택
3. GitHub가 보여주는 `config.sh` 명령을 Raspberry Pi에서 실행
4. runner가 등록되면 `sudo ./svc.sh install && sudo ./svc.sh start`

runner가 붙으면 workflow의 deploy job은 Raspberry Pi 안에서 직접 아래를 수행한다.

```bash
install -m 644 compose.prod.yml /srv/yeon/compose.prod.yml
cd /srv/yeon
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

## 9. Compose 예시

아래는 운영 형태 예시다.
현재 저장소에 바로 들어갈 최종본은 아니고, 방향을 설명하기 위한 샘플이다.

```yaml
services:
  web:
    image: ghcr.io/<owner>/yeon-web-app:latest
    restart: unless-stopped
    env_file:
      - .env
    ports:
      - "3000:3000"
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: yeon
      POSTGRES_USER: yeon
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U yeon -d yeon"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
```

운영 판단:

- DB까지 같은 Pi에 올릴 수는 있다.
- 하지만 안정성과 백업 관점에서는 외부 DB가 더 낫다.
- 초기 소규모 배포라면 같은 Compose에 Postgres를 같이 올리는 것도 가능하다.

## 10. `.env` 예시

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://yeon:${POSTGRES_PASSWORD}@db:5432/yeon
POSTGRES_PASSWORD=<strong-password>
```

원칙:

- 민감 값은 이미지에 bake하지 않는다
- `.env`는 Pi 서버에만 둔다
- `.env.example`에는 키 이름만 공유한다

## 11. 배포 명령

레지스트리 로그인:

```bash
docker login ghcr.io
```

최초 배포:

```bash
cd /srv/yeon
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
docker compose -f compose.prod.yml ps
```

로그 확인:

```bash
docker compose -f compose.prod.yml logs -f
```

업데이트 배포:

```bash
cd /srv/yeon
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

자동 배포 메모:

- [.github/workflows/docker-image.yml](/home/osuma/coding_stuffs/yeon/.github/workflows/docker-image.yml)에 deploy job이 들어 있다.
- self-hosted runner가 online이면 `main` push 뒤 자동으로 Raspberry Pi 안에서 위 명령을 실행한다.
- 테스트 브랜치에서는 GitHub Actions의 `Run workflow`로 수동 실행해 같은 배포 경로를 검증할 수 있다.
- runner가 offline이면 GHCR publish는 성공해도 deploy job은 대기 상태가 된다.

특정 태그로 롤백:

1. `compose.prod.yml`의 이미지 태그를 이전 태그로 변경
2. 아래 실행

```bash
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

## 12. reverse proxy 권장

운영에서는 앱 컨테이너를 바로 인터넷에 노출하기보다 reverse proxy를 앞에 두는 편이 낫다.

선택지:

- Caddy
- Nginx Proxy Manager
- nginx

최소 기준:

- 80 / 443 termination
- HTTPS 자동 갱신
- 도메인 연결
- 앱 컨테이너는 내부 포트만 listen

## 13. 운영 체크리스트

- Raspberry Pi OS Lite 64-bit인가
- 전원 어댑터 품질이 충분한가
- 저장소가 SSD 또는 충분히 빠른 SD 카드인가
- `docker compose version` 확인했는가
- `arm64` 이미지가 실제로 push 되었는가
- `.env`가 서버에만 존재하는가
- DB 백업 정책이 있는가
- reverse proxy와 HTTPS가 준비되었는가
- `docker compose logs`로 기동 확인을 했는가

## 14. 이 저장소에서 다음으로 할 일

현재 저장소 기준으로 남은 주요 작업은 아래다.

1. GitHub 저장소 웹 설정 최종 확인
2. GHCR 패키지 visibility 결정
3. Raspberry Pi 실제 `.env` 작성
4. 필요 시 DB 외부 분리 여부 결정
5. 원격 서버 배포 자동화가 필요하면 후속 workflow 또는 deploy script 추가

## Sources

- Docker Engine on Raspberry Pi OS: https://docs.docker.com/engine/install/raspberry-pi-os/
- Docker Compose plugin on Linux: https://docs.docker.com/compose/install/linux/
- Docker post-install on Linux: https://docs.docker.com/engine/install/linux-postinstall/
- Docker multi-platform builds: https://docs.docker.com/build/building/multi-platform/
- Docker live restore: https://docs.docker.com/engine/daemon/live-restore/
- Raspberry Pi OS docs: https://www.raspberrypi.com/documentation/computers/os.html
