# 5-develop-server-cd_BACKLOG

## 현재 상태

- GitHub Actions 배포 워크플로는 `main` 브랜치 push와 수동 실행만 처리한다.
- Raspberry Pi 자동 배포도 `main` 운영 서버만 대상으로 한다.
- `develop` 브랜치는 문서상 통합/QA 역할로 적혀 있지만, 실제로는 별도 자동 배포 경로가 없다.
- 배포용 compose 파일은 `compose.prod.yml` 하나뿐이라 `develop` 서버와 운영 서버를 분리할 수 없다.
- 운영 도메인 `yeon.world`만 전제되어 있고 `dev.yeon.world` 및 Cloudflare Tunnel 운영 절차는 정리되어 있지 않다.

## 목표 상태

- `develop` 브랜치 push 시 develop 서버로 자동 배포된다.
- `main` 브랜치 push 시 운영 서버로 자동 배포된다.
- develop 서버와 운영 서버는 서로 다른 배포 자산, secret, DB 설정을 사용한다.
- 문서와 운영 메모에 `develop = develop 서버`, `main = 운영 서버` 기준이 일관되게 반영된다.
- Cloudflare Tunnel 기준으로 `dev.yeon.world`를 별도 ingress로 운영하는 절차가 문서화된다.

## 1차

### 작업내용

- `compose.dev.yml` 추가
- develop 서버용 기본 이미지 태그와 DB 기본값 분리
- branch별 태그를 publish하는 GitHub Actions 구조로 변경

### 논의 필요

- develop 서버와 운영 서버가 같은 호스트인지, 다른 호스트인지

### 선택지

- A. 서로 다른 호스트를 기본값으로 둔다
- B. 같은 호스트에서 포트와 compose project를 분리한다

### 추천

- A. 운영 리스크와 자원 충돌을 줄이기 위해 서로 다른 호스트를 기본값으로 둔다

### 사용자 방향

## 2차

### 작업내용

- `develop` / `main`별 SSH secret, 배포 디렉터리, compose 파일을 분기하는 deploy job 구현
- develop 서버용 DB 분리 기준을 compose와 문서에 반영
- 운영용 `latest`, develop용 `develop` 태그 전략 정리

### 논의 필요

- develop DB를 같은 Postgres 인스턴스의 별도 DB로 둘지, 별도 인스턴스로 둘지

### 선택지

- A. 같은 서버 내 별도 Postgres 컨테이너/볼륨
- B. 별도 Postgres 인스턴스 또는 별도 서버

### 추천

- B. 상시 자동배포 환경이라 데이터 오염과 마이그레이션 리스크를 줄이기 위해 별도 인스턴스를 우선 권장한다

### 사용자 방향

## 3차

### 작업내용

- `AGENTS.md`, `CLAUDE.md`, `.codex/project-context/README.md`의 브랜치 의미를 갱신
- 배포 문서에 `dev.yeon.world`와 Cloudflare Tunnel 운영 절차를 추가
- 검증 가능한 범위의 lint / format / typecheck와 문서 점검 수행

### 논의 필요

- Cloudflare Tunnel을 dev/prod 각각 별도 tunnel로 운영할지, 하나의 tunnel에 ingress만 추가할지

### 선택지

- A. 터널 2개로 완전히 분리
- B. 하나의 터널에 `yeon.world`, `dev.yeon.world` ingress를 함께 둔다

### 추천

- A. 장애 전파와 운영 권한 분리를 줄이기 위해 dev/prod를 별도 tunnel로 나눈다

### 사용자 방향
