---
name: component-patterns
description: 웹 컴포넌트와 UI 추상화 레벨을 정하는 기준.
user_invocable: true
---

# Component Patterns

## 원칙

- 하나의 컴포넌트는 가능한 한 하나의 이유로만 변경되게 유지한다.
- 반복되는 표현 패턴만 공용 컴포넌트로 승격한다.
- 도메인 로직과 스타일 primitive를 한 파일에 오래 섞어두지 않는다.
- 기본 Tailwind 클래스를 쓸 수 있다. 토큰이 없다는 이유로 구현을 멈추지 않는다.

## 공용화 기준

- 같은 구조와 상태축이 세 번 이상 반복될 때 공용 컴포넌트 승격을 검토한다.
- 공용화 후 variant / size / state 축이 설명 가능해야 한다.
- 아직 한 화면에서만 쓰는 UI는 지역 컴포넌트로 두는 편이 낫다.

## 금지 패턴

- 재사용 근거 없이 `packages/*`로 UI를 먼저 올리는 것
- Tailwind 기본 클래스를 막기 위해 과한 theme override를 도입하는 것
- 하나의 컴포넌트가 fetch, mutation, toast, 큰 마크업, 정책 판단을 모두 떠안는 것
