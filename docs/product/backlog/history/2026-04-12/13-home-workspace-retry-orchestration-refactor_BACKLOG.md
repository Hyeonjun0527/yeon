# home workspace retry orchestration refactor BACKLOG

작성일: 2026-04-12  
상태: 진행중

---

## 1차: page.tsx retry/feedback orchestration 분리

### 작업내용

- home `page.tsx`에서 전사 재시도, 분석 재시도, retry feedback 상태를 별도 hook으로 추출한다.
- `CenterPanel`에는 동일한 public props를 유지하거나 더 단순화된 props만 전달한다.
- `useRecords`는 source of truth로 유지하고, 새 hook은 orchestration만 담당한다.

### 논의 필요

- 없음

### 선택지

A. page.tsx 내부 callback 유지  
B. retry orchestration 전용 hook 추출

### 추천

B — 1구간 내부에서 가장 안전하게 페이지 복잡도를 낮출 수 있다.

### 사용자 방향
