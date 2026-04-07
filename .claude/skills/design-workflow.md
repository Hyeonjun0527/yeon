---
name: design-workflow
description: |
  UI 작업 시 디자인 방향을 먼저 정하고 21st 도구로 구현 레퍼런스를 연결하는 절차.
user_invocable: true
---

# Design Workflow

## 기본 순서

1. `ui-ux-pro-max`로 `--design-system` 검색을 먼저 실행한다.
2. 제품 유형, 분위기, 산업, 반응형 방향, 타이포그래피 기준을 정리한다.
3. 21st 도구로 inspiration 또는 component builder / refiner를 사용한다.
4. `design-eye.md` 기준으로 위계, CTA, 모바일 레이아웃, AI 디자인 냄새를 다시 점검한다.
5. 생성된 결과를 현재 저장소 구조, 접근성, 상태 처리, Tailwind 정책에 맞게 수정한다.

## 이 저장소 전용 규칙

- 기본 Tailwind 유틸리티 사용을 막지 않는다.
- `global.css` 또는 `globals.css`에서 base scale을 꺼버리는 방식은 금지한다.
- 디자인 토큰은 반복 의미가 생길 때만 추가한다.
- 레이아웃이나 톤이 정해지기 전에 공용 컴포넌트를 먼저 만들지 않는다.
