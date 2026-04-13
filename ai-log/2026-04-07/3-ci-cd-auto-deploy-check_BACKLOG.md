# 3-ci-cd-auto-deploy-check_BACKLOG

## 현재 상태

- `docker-image.yml`은 GHCR publish까지만 담당한다.
- Raspberry Pi 자동 배포 job은 아직 없다.
- GitHub repository secret, variable, runner는 현재 비어 있다.
- 따라서 지금 상태는 CI 일부만 있고, CD는 아직 없다.

## 목표 상태

- `main` 반영 시 이미지 publish 후 Raspberry Pi deploy까지 이어지는 구조를 갖춘다.
- 필요한 secret이 없으면 deploy job은 명확히 skip된다.
- 로컬에서는 Next build, Docker build, 컨테이너 실행, 페이지 응답까지 확인한다.
- GitHub에서는 workflow 실행 가능 여부를 검증한다.

## 1차

### 작업내용

- `docker-image.yml`에 deploy job 추가
- Raspberry Pi SSH deploy 방식으로 설계
- GHCR private pull 대응용 secret 구조 정리

### 논의 필요

- GHCR 이미지를 public으로 둘지 private으로 둘지

### 선택지

- A. public 이미지로 운영
- B. private 이미지 + Pi에서 GHCR login

### 추천

- B. 기본은 private을 유지하고 필요 시 public으로 전환

### 사용자 방향

## 2차

### 작업내용

- 간단한 웹페이지가 build / runtime에서 실제로 뜨는지 로컬 검증
- Docker build / run / health endpoint 확인

### 논의 필요

- 홈 페이지를 더 운영 친화적인 상태 화면으로 바꿀지

### 선택지

- A. 현재 스캐폴드 페이지 유지
- B. 배포 상태가 보이는 간단한 운영 페이지로 조정

### 추천

- B. 간단한 상태 정보와 API 링크가 보이는 페이지로 조정

### 사용자 방향

## 3차

### 작업내용

- GitHub workflow를 실제로 실행 가능한 범위까지 테스트
- 불가능한 구간은 왜 막히는지 명확히 기록
- 문서 갱신

### 논의 필요

- branch push로 워크플로를 검증할지, main 반영 후 검증할지

### 선택지

- A. 작업 브랜치 push + workflow_dispatch 검증
- B. main 직접 push 후 검증

### 추천

- A. direct main push 없이 branch에서 먼저 검증

### 사용자 방향
