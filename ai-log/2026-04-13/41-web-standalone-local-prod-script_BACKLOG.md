## 차수 1

### 작업내용

- `apps/web`의 기존 `start` 스크립트는 유지한다.
- 로컬에서 운영 유사 검증을 쉽게 하기 위해 `start:standalone` 스크립트를 추가한다.
- `pnpm --filter @yeon/web prod:local` 한 줄로 `build -> standalone server 실행`이 되도록 스크립트를 추가한다.

### 논의 필요

- 없음

### 선택지

- 기존 `start`를 standalone 실행으로 교체한다.
- 기존 `start`는 유지하고 별도 로컬 운영 검증 스크립트를 추가한다.

### 추천

- 기존 `start`는 유지하고 `start:standalone`, `prod:local`만 추가한다.
- 현재 운영/배포 플로우를 건드리지 않으면서 로컬 검증 편의성만 높일 수 있다.

### 사용자 방향
