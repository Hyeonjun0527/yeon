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
6. Raspberry Pi self-hosted runner가 online이면 해당 runner에서 직접 deploy

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
ghcr.io/<owner>/yeon-web-app
```

기본 태그:

- `latest`
- `sha-<short-sha>`

## 6. 자동 배포가 되려면 필요한 조건

현재 workflow는 Raspberry Pi 안에 GitHub self-hosted runner가 등록되어 있고, runner가 online 상태면 deploy job까지 실행한다.
`main` push에서는 자동 deploy가 동작하고, 테스트 브랜치에서는 `workflow_dispatch`로 수동 실행해 deploy까지 검증할 수 있다.

- `Settings -> Actions -> Runners`에서 저장소용 runner 등록
- runner 기본 라벨 `self-hosted`, `linux`, `ARM64`
- runner 프로세스를 `svc.sh` 또는 systemd 서비스로 상시 실행
- Raspberry Pi에 `/srv/yeon/.env` 배치

중요:

- 현재 workflow는 `runs-on: [self-hosted, linux, ARM64]`로 매칭한다.
- 해당 runner가 offline이면 deploy job은 시작되지 않고 대기 상태에 머문다.
- 브랜치에서 수동 실행할 때도 같은 runner 라벨로 deploy를 수행한다.

## 7. Raspberry Pi에서 pull할 때

deploy job은 self-hosted runner 안에서 `docker/login-action`으로 GHCR에 로그인한 뒤 pull을 수행한다.
즉, workflow가 실행될 때는 별도 SSH secret이나 별도 pull token을 요구하지 않는다.

예시:

```bash
docker login ghcr.io
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

운영 메모:

- GitHub Actions job 안에서는 `GITHUB_TOKEN`으로 push와 pull을 모두 처리한다.
- 운영자가 Raspberry Pi에서 수동 pull을 할 때만 별도 `docker login ghcr.io`가 필요할 수 있다.

## 8. Raspberry Pi 서버가 만족해야 하는 조건

deploy job은 self-hosted runner가 올라간 Raspberry Pi 안에 아래가 이미 준비되어 있다고 가정한다.

- `/srv/yeon` 디렉터리 존재
- `.env` 배치
- `docker compose` 사용 가능
- GitHub self-hosted runner 서비스 실행 중

deploy job이 runner 안에서 수행하는 핵심 명령은 아래와 같다.

```bash
install -m 644 compose.prod.yml /srv/yeon/compose.prod.yml
cd /srv/yeon
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d
```

즉, runner는 이미 Raspberry Pi 안에서 실행 중이어야 하고 서버 준비가 끝나 있지 않으면 publish는 성공해도 deploy는 실패한다.

## 9. 실패 시 가장 먼저 볼 것

- workflow YAML의 `permissions.packages: write` 누락
- GitHub Settings -> Actions 정책 제한
- 조직 정책 제한
- Docker build 실패
- GHCR 로그인 실패
- self-hosted runner offline
- `/srv/yeon` 경로 또는 `.env` 부재
- runner 사용 계정의 Docker 권한 누락

로그에서 자주 보이는 실패 유형:

- `permission_denied`
- `insufficient_scope`
- `denied: permission`
- action 사용 제한 메시지
- `403 Forbidden` on GHCR blob HEAD request
- `Waiting for a runner to pick up this job`

추가 메모:

- 수동 `docker push`로 먼저 만든 GHCR 패키지가 저장소와 연결되지 않은 상태면, 같은 이름으로 GitHub Actions `GITHUB_TOKEN` push가 `403`으로 막힐 수 있다.
- 이런 경우에는 새 패키지 이름을 쓰거나, GitHub 웹에서 패키지와 저장소 권한 연결을 다시 맞춘다.

## 10. 운영 권장

- `main` push 시 `latest` 갱신
- self-hosted runner가 online이면 `main` push 시 자동 deploy
- 테스트 브랜치에서는 `workflow_dispatch`로 수동 deploy 검증 가능
- runner가 아직 없거나 offline이면 수동 `pull && up -d`
- 롤백은 `sha-<short-sha>` 태그를 사용
