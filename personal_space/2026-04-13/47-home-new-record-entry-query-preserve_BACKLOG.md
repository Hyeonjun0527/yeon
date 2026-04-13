# 47-home-new-record-entry-query-preserve_BACKLOG

## 차수 1

### 작업내용

- `/home` 진입 직후 선택 상태 URL 동기화가 `newRecordEntry`, `studentName`, `spaceId` 같은 기존 query를 지우지 않도록 수정한다.
- 학생 상세 `상담기록` 탭에서 `/home?newRecordEntry=true...`로 이동했을 때 기존 `새 상담 기록` 모달이 자동으로 뜨는 흐름을 복구한다.

### 논의 필요

- 없음

### 선택지

- `useWorkspaceSelection`의 URL 생성기를 수정해 기존 query를 보존하고 `memberId/recordId`만 patch한다.
- `/home/page.tsx` auto-open effect를 더 이르게 실행하거나 별도 상태로 옮긴다.

### 추천

- URL 동기화 쪽을 고친다. 현재 버그 원인은 선택 상태 sync가 다른 query를 전부 덮어쓰는 구조라서, 이 레이어를 고치는 편이 가장 작고 안전하다.

### 사용자 방향
