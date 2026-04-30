# 상담서비스 home 소스구조 제거 백로그

## 차수 1

### 작업내용

- 상담 서비스의 canonical base path를 `/counseling-service`로 고정하고 `app-route` 기본 상수를 `/home` 기준에서 전환한다.
- `app/home/_components`, `_hooks`, `_lib`에 묶인 shared shell 의존을 `features/counseling-service-shell` 또는 공용 계층으로 옮긴다.
- `app/counseling-service/*`를 실제 엔트리로 전환하고 `app/home/*` 재-export 의존을 제거한다.
- production code에서 `@/app/home/*` import를 제거한다.
- `/home` 공개 경로와 관련 proxy redirect를 제거한다.

### 논의 필요

- mockdata 경로가 상담 서비스 canonical path를 그대로 따를지, mock demo 전용 호환 shell을 둘지 구현 중 선택이 필요할 수 있다.

### 선택지

- 선택지 A: `/home` route 파일을 남긴 채 내부 구현만 `counseling-service`로 역전한다.
- 선택지 B: `/home` route와 proxy redirect를 모두 제거하고 `counseling-service`만 route source of truth로 남긴다.

### 추천

- 선택지 B
- 이유: 사용자 결정이 `/home`를 공개 경로와 내부 source of truth 양쪽에서 모두 제거하는 쪽으로 수렴했고, 장기적으로도 legacy alias를 계속 유지할 이유가 없다.

### 사용자 방향
