# 같은 Pi 운영/개발 동시 배포 정렬 백로그

## 1차

### 작업내용

- 현재 `develop` 자동배포 workflow가 `ubuntu-latest -> SSH` 기준으로 되어 있는지 확인한다.
- 실제 인프라가 `same Pi + self-hosted runner + Docker cloudflared`인지 확인한 근거를 정리한다.
- `develop`과 `main` 모두 self-hosted runner에서 로컬 deploy 하도록 workflow 방향을 정한다.

### 논의 필요

- develop 배포 job이 `/srv/yeon-develop/.env`가 없을 때 즉시 실패할지, 친절한 안내 후 skip할지 결정이 필요하다.

### 선택지

- 선택지 A: `.env`가 없으면 실패
- 선택지 B: `.env`가 없으면 skip

### 추천

- 선택지 A
- 자동배포가 성공처럼 보이는데 실제 반영이 안 되는 상태보다, 준비가 덜 됐으면 명확히 실패시키는 편이 낫다.

### 사용자 방향

## 2차

### 작업내용

- `.github/workflows/docker-image.yml`을 self-hosted runner 기반으로 수정한다.
- `develop`은 `/srv/yeon-develop`, `main`은 `/srv/yeon`으로 분기한다.
- GHCR 이미지는 branch별 태그(`develop`, `latest`)를 유지한다.

### 논의 필요

- 없음

### 선택지

- 선택지 A: build는 `ubuntu-latest`, deploy는 `self-hosted`
- 선택지 B: build/deploy 모두 `self-hosted`

### 추천

- 선택지 A
- 멀티플랫폼 build는 GitHub hosted runner가 더 안정적이고, deploy만 Pi 로컬 runner가 담당하는 구조가 단순하다.

### 사용자 방향

## 3차

### 작업내용

- 같은 Pi + Docker cloudflared + `dev.yeon.world` / `yeon.world` 기준으로 문서를 정리한다.
- 앱 `.env`와 tunnel token의 책임 분리를 명확히 적는다.
- 운영/개발 `.env` 예시와 포트 분리 기준을 문서화한다.

### 논의 필요

- 없음

### 선택지

- 선택지 A: tunnel 1개에서 hostname 두 개 라우팅
- 선택지 B: tunnel 2개 완전 분리

### 추천

- 선택지 A
- 현재 이미 `yeon-tunnel`이 살아 있고 같은 Pi에서 운영/개발을 함께 올리는 구조라, 우선은 기존 tunnel에 `dev.yeon.world` 라우팅을 추가하는 편이 가장 빠르다.

### 사용자 방향
