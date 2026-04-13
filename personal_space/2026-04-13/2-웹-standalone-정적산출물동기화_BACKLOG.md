## 차수 1

### 작업내용

- `apps/web`의 로컬 standalone 실행 경로를 점검한다.
- standalone 서버가 필요로 하는 `.next/static`, `public` 산출물을 runtime 경로로 동기화하는 스크립트를 추가한다.
- `start:standalone`이 동기화 후 서버를 실행하도록 연결한다.

### 논의 필요

- 없음

### 선택지

- `package.json`의 `start:standalone`에 복사 명령을 인라인으로 길게 넣는다.
- 별도 스크립트 파일로 정리하고 `start:standalone`에서 호출한다.

### 추천

- 별도 스크립트 파일로 정리하고 `start:standalone`에서 호출한다.
- 복사 대상과 실패 원인을 명확하게 표현할 수 있고, 이후 Docker 로컬 검증 흐름과도 맞추기 쉽다.

### 사용자 방향
