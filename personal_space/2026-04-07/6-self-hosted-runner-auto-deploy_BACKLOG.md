# 6-self-hosted-runner-auto-deploy_BACKLOG

## 현재 상태

- 도메인 `yeon.world`는 Cloudflare 네임서버로 이전 절차를 진행 중이다.
- Raspberry Pi에는 `/srv/yeon` 디렉터리, `compose.prod.yml`, `.env`가 준비되어 있다.
- Raspberry Pi에서는 수동 `docker compose pull && docker compose up -d`가 가능한 상태를 확인했다.
- GitHub self-hosted runner는 Raspberry Pi에서 등록되었고, `run.sh` 기준으로 GitHub 연결과 job 대기 상태를 확인했다.
- 이후 `svc.sh` 기준의 서비스 등록까지 완료해 runner를 상시 실행 구조로 전환했다.

## 목표 상태

- `main` push 또는 수동 실행 시 GHCR 이미지 publish 뒤 Raspberry Pi self-hosted runner가 직접 배포를 수행한다.
- SSH secret 없이도 배포가 가능하다.
- Raspberry Pi 준비 절차와 GitHub runner 등록 절차가 문서에 반영된다.
- 왜 SSH가 아니라 self-hosted runner를 쓰는지, Cloudflare와 어떤 역할 분담인지가 백로그만 읽어도 이해된다.

## 배경 / 제약

- 사용자는 세입자 환경이라 공유기 포트포워딩과 공인 고정 IP 확보가 어렵다.
- 현재 공인 IP는 유동 IP라서 SSH 대상 주소를 고정하기 어렵다.
- 도메인은 구매했지만, 외부에서 Raspberry Pi로 직접 SSH를 받는 구조는 운영 안정성과 보안 면에서 부담이 크다.

## 원리

### 왜 self-hosted runner를 쓰는가

- SSH 배포는 GitHub Actions가 Raspberry Pi로 직접 들어와야 한다.
- 이 방식은 고정 IP, DDNS, 포트포워딩, SSH 공개가 필요해질 가능성이 높다.
- 반대로 self-hosted runner는 Raspberry Pi가 GitHub에 outbound 연결을 유지한 채 job을 받아 실행한다.
- 따라서 inbound 포트 개방 없이도 GitHub Actions가 Raspberry Pi 안에서 배포 명령을 실행할 수 있다.

### 역할 분담

- GitHub hosted runner:
  - Docker 이미지 build
  - GHCR push
- Raspberry Pi self-hosted runner:
  - GHCR login
  - `/srv/yeon/compose.prod.yml` 동기화
  - `docker compose pull`
  - `docker compose up -d`
- Cloudflare:
  - 도메인 DNS 관리
  - 이후 Tunnel을 통해 `app.yeon.world`를 Raspberry Pi의 `localhost:3000`으로 연결

### 배포 흐름

1. 개발 내용을 GitHub에 push하거나 workflow를 수동 실행한다.
2. GitHub hosted runner가 `ghcr.io/hyeonjun0527/yeon-web-app:latest` 이미지를 새로 publish한다.
3. Raspberry Pi의 self-hosted runner가 deploy job을 받아 `/srv/yeon`에서 compose 배포를 실행한다.
4. 웹 앱은 Raspberry Pi 내부 3000 포트에서 실행되고, 외부 공개는 Cloudflare Tunnel이 맡는다.

## 현재 판단

- 기본 운영 경로는 `main` push 자동 배포다.
- 테스트 단계에서는 브랜치에서 `workflow_dispatch`를 사용해 deploy 경로를 검증하는 편이 안전하다.
- SSH secret 기반 deploy는 fallback으로만 남기고, 기본값은 self-hosted runner 구조로 고정한다.

## 1차

### 작업내용

- `docker-image.yml`을 self-hosted runner 배포 구조로 변경
- deploy job에서 GHCR 로그인 후 `/srv/yeon`의 compose 배포 실행
- self-hosted runner 라벨과 필수 서버 상태를 명시
- 브랜치에서 `workflow_dispatch`로 수동 deploy 검증이 가능하도록 조건 정리

### 논의 필요

- runner 매칭을 기본 라벨만으로 할지, 전용 커스텀 라벨까지 요구할지

### 선택지

- A. `self-hosted`, `linux`, `ARM64` 기본 라벨만 사용
- B. `yeon-prod` 같은 커스텀 라벨을 추가로 요구

### 추천

- A. 현재는 저장소 전용 Raspberry Pi 한 대만 붙어 있으므로 기본 라벨로 먼저 단순하게 간다.

### 사용자 방향


## 2차

### 작업내용

- `.env.example`와 배포 문서의 이미지명, 배포 방식, 준비 절차를 self-hosted runner 기준으로 정리
- SSH secret 안내를 runner 등록 절차로 교체

### 논의 필요

- SSH fallback 문서를 완전히 제거할지, 선택지로만 남길지

### 선택지

- A. SSH 배포 설명 제거
- B. SSH 배포는 과거 방식으로 짧게 남기고 runner 방식을 기본값으로 승격

### 추천

- B. 이미 동작하는 과거 경로는 남기되, 기본값은 runner 방식으로 전환

### 사용자 방향


## 3차

### 작업내용

- self-hosted runner가 실제로 job을 받는지 확인
- 브랜치에서 `workflow_dispatch`로 build + deploy 테스트
- 성공 시 `main` 자동 배포 기준으로 운영 절차 확정

### 논의 필요

- 테스트 브랜치를 별도 landing 단위로 남길지, 기존 배포 개선 브랜치에 포함할지

### 선택지

- A. 브랜치 수동 실행으로 한 번 검증 후 main 반영
- B. 바로 main 반영 후 실서비스에서 검증

### 추천

- A. 브랜치 수동 실행으로 runner, GHCR, compose 경로를 먼저 확인한 뒤 main으로 올린다.

### 사용자 방향


## 진행 메모

- `.env.example`의 이미지명과 workflow의 실제 GHCR 패키지명을 `yeon-web-app:latest` 기준으로 맞췄다.
- deploy job은 `runs-on: [self-hosted, linux, ARM64]` 기준으로 Raspberry Pi runner를 사용하도록 전환했다.
- `main` push뿐 아니라 테스트 브랜치의 `workflow_dispatch`에서도 deploy가 가능하도록 조정했다.
- 다음 실제 확인 포인트는 GitHub Actions run에서 deploy job이 Raspberry Pi runner에게 정상 할당되는지 여부다.
