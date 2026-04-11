# 가져오기 미리보기 스크롤 소유권 재설계 백로그

## 차수 1

### 작업내용

- `apps/web/src/features/cloud-import/components/cloud-import-inline.tsx`의 expanded 미리보기 레이아웃에서 상단 미리보기 + 하단 고정 높이 패널 구조를 재조정한다.
- large screen에서는 파일 미리보기와 분석/수정 패널이 각각 **독립적으로 전체 높이를 쓰며 스크롤**하도록 바꾼다.
- 기존 좌측 글로벌 네비게이션과 수강생 관리 사이드바는 그대로 두고, import workspace 내부에서만 스크롤 소유권을 정리한다.
- 모바일/좁은 화면에서는 현재 적층 구조를 유지하되, 하단 패널 높이 제약이 과하지 않도록 보완한다.

### 논의 필요

- desktop에서 raw 파일 미리보기와 분석 패널 중 어느 쪽을 더 넓게 줄지 비율 조정이 필요하다.
- 장기적으로는 파일 미리보기와 분석 결과를 완전히 분리한 워크스페이스로 갈지 검토가 필요하다.

### 선택지

1. 좌측 사이드바를 `fixed`로 바꾸고 전체 페이지를 다시 스크롤 구조로 설계한다.
2. 현재 앱 shell은 유지하고, import workspace 내부만 full-height 2-pane scroll 구조로 바꾼다.

### 추천

- 선택지 2
- 문제는 전역 네비게이션이 아니라 import workspace 내부의 height clamp와 잘못된 scroll ownership에 가깝다. 전역 shell을 흔들지 않고 import 화면만 재구성하는 편이 영향 범위가 작고 ChatGPT처럼 안정적인 본문 스크롤 경험에 가깝다.

### 사용자 방향

- full-height independent scroll pane 구조로 진행한다.
