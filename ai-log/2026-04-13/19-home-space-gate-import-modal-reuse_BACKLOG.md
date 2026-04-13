## 1차

### 작업내용

- `/home`의 스페이스 첫 진입 게이트에서 `파일 가져와 스페이스 만들기`를 눌렀을 때 student-management와 동일한 AI 가져오기 모달을 재사용하도록 연결한다.
- `/home`의 빈 스페이스 생성 플로우는 유지하되, gate 경로에서만 공용 모달을 사용하도록 최소 범위로 정리한다.
- 중복 UI 구현을 줄이면서 상태 전이와 생성 완료 후 닫힘 동작이 기존과 동일한지 검증한다.

### 논의 필요

- 없음

### 선택지

- `/home` 전용 `CreateSpaceModal`에 student-management import 헤더를 다시 복제한다.
- `/home` gate에서 `StudentSpaceCreateModal`을 직접 재사용한다.

### 추천

- `/home` gate에서 `StudentSpaceCreateModal`을 직접 재사용한다. 동일한 import 경험을 유지하면서 중복 구현을 늘리지 않는다.

### 사용자 방향
