## 차수 1

### 작업내용

- `packages/config`를 상대경로 `tsconfig extends`로 참조하는 workspace를 식별한다.
- 해당 workspace의 `package.json`에 `@yeon/config`를 명시적으로 연결해 Turbo 의존 그래프와 Docker prune 결과를 일치시킨다.
- Docker prune 결과와 웹 빌드를 다시 검증해 CI 재발 가능성을 줄인다.

### 논의 필요

- 현재 `@yeon/config`는 런타임 import 대상이 아니라 설정 패키지다.
- 그래도 workspace dependency로 명시해 빌드 그래프에 포함시키는 정책을 공통 규칙으로 둘지 확인이 필요하다.

### 선택지

- 선택지 1: `@yeon/web`만 임시로 `@yeon/config`에 의존시켜 현재 CI만 복구한다.
- 선택지 2: `packages/config`를 참조하는 모든 workspace가 `@yeon/config`를 명시적으로 의존하도록 정합화한다.

### 추천

- 선택지 2

### 사용자 방향
