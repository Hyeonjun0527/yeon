# Student detail back space context preserve 백로그

## 차수 1

### 작업내용

- 수강생 상세 진입/복귀 시 active space context를 URL query(`spaceId`)로 함께 전달한다.
- 상세 화면의 뒤로가기 링크를 하드코딩된 `/home/student-management`에서 context-aware 링크로 바꾼다.
- `StudentManagementProvider`가 `spaceId` query를 source of truth로 읽어 초기/복귀 상태를 복원하게 만든다.

### 논의 필요

- 이후 student-management 전체에서 active tab/filter/sort도 URL에 올릴지 범위를 확장할지 결정이 필요하다.
- URL에 active space를 항상 노출할지, detail 진입/복귀에 한해 최소한으로 사용할지 정책을 정리할 필요가 있다.

### 선택지

1. 뒤로가기만 `router.back()`으로 바꾼다.
2. active space를 URL query로 실어 진입/복귀 모두 같은 context를 복원한다.

### 추천

- 선택지 2
- 현재 문제는 브라우저 히스토리 동작보다 context source of truth 부재다. URL에 `spaceId`를 실어야 새로고침, 직접 진입, 일반 anchor navigation까지 모두 동일하게 복원된다.

### 사용자 방향
