# GitHub Actions + GHCR Setup

기준 시점: 2026-04-07

이 문서는 `yeon` 저장소에서 GitHub Actions로 Docker 이미지를 빌드해 GHCR에 publish하고, 조건이 맞으면 Raspberry Pi로 자동 배포하는 절차를 정리한다.

## 1. 저장소에 추가된 파일

이 저장소에는 아래 파일이 추가되어 있다.

- [.github/workflows/docker-image.yml](/home/osuma/coding_stuffs/yeon/.github/workflows/docker-image.yml)
- [Dockerfile](/home/osuma/coding_stuffs/yeon/Dockerfile)
- [.dockerignore](/home/osuma/coding_stuffs/yeon/.dockerignore)
- [compose.prod.yml](/home/osuma/coding_stuffs/yeon/compose.prod.yml)
- [.env.example](/home/osuma/coding_stuffs/yeon/.env.example)

## 2. 워크플로 동작 방식

워크플로는 아래 조건에서 실행된다.

- `main` 브랜치 push
- 수동 실행 `workflow_dispatch`

워크플로는 다음을 수행한다.

1. checkout
2. QEMU / buildx 준비
3. `GITHUB_TOKEN`으로 GHCR 로그인
4. Docker metadata 생성
5. `linux/amd64`, `linux/arm64` 멀티플랫폼 이미지 build + push
6. 필요한 secret이 있으면 Raspberry Pi SSH deploy

## 3. 핵심 권한

워크플로에는 아래 권한이 들어 있다.

```yaml
permissions:
  contents: read
  packages: write
```

의미:

- `contents: read`: 저장소 코드 checkout
- `packages: write`: GHCR push

## 4. GitHub 웹 설정에서 확인할 것

이미 Actions 웹 권한을 열었다고 해도 아래는 다시 한 번 확인하는 편이 좋다.

경로:

- `Repository -> Settings -> Actions -> General`

확인 항목:

1. Actions permissions
   - 필요한 action 사용이 막혀 있지 않은지 확인
2. Workflow permissions
   - 워크플로가 `GITHUB_TOKEN`을 사용할 수 있는지 확인

## 5. GHCR 패키지 확인

워크플로가 성공하면 GHCR에 아래 이미지가 생긴다.

```txt
ghcr.io/<owner>/yeon-web
```

기본 태그:

- `latest`
- `sha-<short-sha>`

## 6. 자동 배포가 되려면 필요한 secret

현재 workflow는 아래 secret이 있으면 deploy job까지 실행한다.

- `RPI_HOST`
- `RPI_USERNAME`
- `RPI_SSH_KEY`

선택:

- `RPI_PORT`
- `GHCR_PULL_USERNAME`
- `GHCR_PULL_TOKEN`

의미:

- `RPI_HOST`, `RPI_USERNAME`, `RPI_SSH_KEY`: Raspberry Pi SSH 접속
- `RPI_PORT`: 기본값 `22`
- `GHCR_PULL_USERNAME`, `GHCR_PULL_TOKEN`: GHCR private 이미지 pull이 필요할 때 사용

중요:

- 위 SSH secret이 없으면 deploy job은 실행되지 않고 skip된다.
- 즉, 현재 구조는 “조건부 CD”다.

## 7. Raspberry Pi에서 pull할 때

이미지가 public이면 별도 로그인 없이 pull 가능하다.

이미지가 private이면 Raspberry Pi에서 GHCR 로그인 후 pull해야 한다.

예시:

```bash
docker login ghcr.io
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

운영 메모:

- GitHub Actions 안에서는 `GITHUB_TOKEN`으로 push한다.
- Raspberry Pi 같은 외부 서버에서는 별도 인증 정보로 login해야 한다.

## 8. Raspberry Pi 서버가 만족해야 하는 조건

deploy job은 Raspberry Pi 안에 아래가 이미 준비되어 있다고 가정한다.

- `/srv/yeon` 디렉터리 존재
- `compose.prod.yml` 배치
- `.env` 배치
- `docker compose` 사용 가능

deploy job이 원격에서 수행하는 명령은 아래와 같다.

```bash
cd /srv/yeon
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

즉, 서버 준비가 끝나 있지 않으면 publish는 성공해도 deploy는 실패한다.

## 9. 실패 시 가장 먼저 볼 것

- workflow YAML의 `permissions.packages: write` 누락
- GitHub Settings -> Actions 정책 제한
- 조직 정책 제한
- Docker build 실패
- GHCR 로그인 실패
- Raspberry Pi SSH 접속 실패
- `/srv/yeon` 경로 또는 `.env` 부재

로그에서 자주 보이는 실패 유형:

- `permission_denied`
- `insufficient_scope`
- `denied: permission`
- action 사용 제한 메시지

## 10. 운영 권장

- `main` push 시 `latest` 갱신
- SSH secret이 설정되면 `main` push 시 자동 deploy
- secret이 아직 없으면 수동 `pull && up -d`
- 롤백은 `sha-<short-sha>` 태그를 사용
