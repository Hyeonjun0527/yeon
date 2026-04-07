---
name: monorepo-patterns
description: `apps/*`와 `packages/*` 경계를 유지하는 기준.
user_invocable: true
---

# Monorepo Patterns

## 공유 판단 기준

- 둘 이상의 runtime 또는 app에서 실제로 쓰는가
- 앱 내부 구현 디테일이 없는가
- 계약이 독립적으로 버저닝되거나 검증될 가치가 있는가

위 질문에 모두 예라고 답하기 어렵다면 먼저 앱 내부에 둔다.

## package 배치 기준

- `api-contract`: schema, DTO, validation
- `api-client`: typed client
- `domain`: 순수 도메인 로직
- `design-tokens`: cross-platform design constants
- `utils`: 순수 헬퍼

## 금지 패턴

- 편의상 `packages/*`에 앱 전용 파일을 넣는 것
- 앱 내부 import cycle을 피하려고 shared package를 임시 쓰레기통처럼 쓰는 것
- 패키지 export surface를 생각하지 않고 내부 구현 파일을 직접 참조하는 것
