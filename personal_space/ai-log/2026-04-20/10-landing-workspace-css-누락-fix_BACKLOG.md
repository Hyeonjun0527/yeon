# landing workspace CSS 누락 fix

## 작업내용

- `apps/web/src/features/landing-home/landing-home.tsx`가 참조하는 `landing-workspace.module.css`를 저장소 추적 대상에 포함한다.
- develop 머지 후 Docker/Next.js 빌드에서 발생한 `Module not found`를 없앤다.
- 기존 루트 포털 랜딩 동작과 시각 구조는 바꾸지 않고, 누락 자산만 복구한다.

## 논의 필요

- 없음

## 선택지

- 선택지 A: import를 기존 `landing-home.module.css`로 되돌린다.
- 선택지 B: 실제 사용 중인 `landing-workspace.module.css`를 추적 대상으로 추가한다.

## 추천

- 선택지 B
- 이유:
  - 현재 `landing-home.tsx`가 이미 새 CSS 모듈을 source of truth로 참조하고 있다.
  - 로컬 빌드가 해당 파일 존재 시 정상 통과하므로, 문제는 구현 자체보다 누락된 파일 추적 상태다.
  - import를 되돌리면 다른 인접 변경과 어긋날 수 있어 회귀 위험이 더 크다.

## 사용자 방향
