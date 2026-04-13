# 32. 학생관리 카드뷰 무한스크롤 페이지네이션

## 작업내용

- 수강생 관리 카드뷰에서 row-based virtualization을 제거하고 기존 CSS grid 레이아웃을 유지한다.
- 카드뷰는 초기 카드 개수만 렌더하고, 스크롤 하단 sentinel이 보이면 다음 묶음을 점진적으로 추가한다.
- dense 뷰는 기존처럼 1행 1항목 구조에서만 virtualization을 유지한다.
- 필터/정렬/스페이스 변경 시 카드뷰 pagination 상태를 안전하게 초기화한다.

## 논의 필요

- 현재 API는 전체 수강생을 한 번에 내려주므로 이번 차수는 서버 페이지네이션이 아니라 클라이언트 점진 렌더링으로 충분한가.

## 선택지

- 선택지 A: 카드뷰도 grid virtualization을 유지하며 보정한다.
- 선택지 B: 카드뷰는 일반 grid + infinite scroll로 전환하고 dense 뷰만 virtualization을 유지한다.
- 선택지 C: 카드뷰는 일반 grid로만 두고 pagination 없이 전체 렌더링한다.

## 추천

- 선택지 B

## 사용자 방향
