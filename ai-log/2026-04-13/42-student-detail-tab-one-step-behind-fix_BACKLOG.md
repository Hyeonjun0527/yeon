# 42-student-detail-tab-one-step-behind-fix

## 작업내용

- 수강생 상세 탭(`개요/상담기록/메모/리포트`) 클릭 시 active 상태가 한 박자 늦게 반영되는 문제를 수정한다.
- `tab` query deep-link는 유지하고, 브라우저 뒤로가기가 탭 이력을 밟지 않도록 `replace` 정책도 유지한다.
- `use-member-detail`에 즉시 반응용 local active state를 도입하고, URL은 동기화 대상으로만 사용한다.
- hook 단위 회귀 테스트를 추가한다.

## 논의 필요

- 없음

## 선택지

1. `useSearchParams`로 완전 복귀해 query를 다시 reactive source로 쓴다.
2. local active state를 즉시 갱신하고 URL query는 `router.replace`로 동기화한다.
3. `tab` query를 제거하고 완전 local state로 되돌린다.

## 추천

- 2번
- 이유: 현재 요구사항인 `deep-link 유지`, `refresh 유지`, `뒤로가기는 이전 페이지 복귀`, `클릭 즉시 반응`을 동시에 만족하는 최소 수정이다.

## 사용자 방향
