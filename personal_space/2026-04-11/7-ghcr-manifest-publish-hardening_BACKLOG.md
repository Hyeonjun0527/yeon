## 차수 1

### 작업내용

- `.github/workflows/docker-image.yml`의 `publish_manifest`에서 digest artifact 입력 검증을 추가한다.
- source digest를 `docker buildx imagetools inspect`로 사전 확인한 뒤 `docker buildx imagetools create`를 실행하도록 보강한다.
- `imagetools create`에 재시도와 backoff를 추가해 GHCR manifest read 일시 장애에 덜 민감하게 만든다.

### 논의 필요

- 현재 `amd64`, `arm64` 두 개 플랫폼을 workflow에서 고정 검증할지, 이후 플랫폼 확장 여지를 남길지 결정이 필요하다.
- source digest preflight 재시도 횟수와 대기 시간을 현 수준으로 둘지 추후 더 늘릴지 운영 로그를 보고 판단해야 한다.

### 선택지

- 선택지 1: 기존 `inspect` 재시도만 유지하고 `imagetools create` 실패는 수동 재실행에 맡긴다.
- 선택지 2: `publish_manifest`에 digest 검증, preflight inspect, `imagetools create` 재시도를 함께 추가한다.

### 추천

- 선택지 2

### 사용자 방향
