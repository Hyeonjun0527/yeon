# `yeon` Claude Agent System

핵심 원칙: 현재 코드베이스 현실을 존중하며, 기능, 계약, UX 동등성을 보장하는 점진 개선만 수행한다.

## 작업 우선순위

1. 사용자 요청 기능 또는 버그 해결
2. 기존 동작, 계약, UX 유지
3. 아키텍처 레이어링 개선
4. 회고를 통한 규칙 보강

## 실행 효율 규칙

- 오래 걸릴 수 있는 탐색, 테스트, 빌드, 외부 에이전트 작업은 가능한 한 백그라운드로 보내고 독립 작업을 먼저 진행한다.
- 외부 에이전트 위임은 기다리는 동안 할 독립 작업이 있을 때만 쓴다. 결과가 바로 필요하면 foreground 실행을 우선한다.
- 장시간 대기만 하다가 타임아웃으로 시간을 소모하지 않는다. 더 진행할 수 없으면 현재 상태와 대기 이유를 먼저 공유한다.
- `<system-reminder>`가 합리적인 시간 안에 오지 않으면 알림 경로가 깨진 것으로 보고, 현재 상태를 공유한 뒤 로컬 탐색이나 foreground 재실행으로 전환한다.
- 큰 작업도 짧은 단계로 끊어 사용자에게 진행이 보이게 처리한다.
- 같은 탐색을 중복 수행하지 말고, 기존 결과를 재사용하거나 다른 접근으로 전환한다.

## 아키텍처 레이어 가이드

- `apps/web/src/app`: 라우팅, 서버 경계, metadata, route handler
- `apps/web/src/features`: 유스케이스 단위 UI와 오케스트레이션
- `apps/web/src/components`: 도메인 비의존 웹 공용 UI
- `apps/web/src/server`: 서버 전용 구현
- `apps/mobile/app`, `apps/mobile/src/features`: 모바일 화면과 오케스트레이션
- `packages/*`: 런타임 독립 공유 자산

## 의존 방향

- `apps/web/src/app -> features -> components`
- `apps/mobile/app -> src/features -> src/components`
- `apps/* -> packages/*`
- `packages/*`는 `apps/*`를 import하지 않는다
- `apps/mobile`은 `apps/web/src/server`를 import하지 않는다

## 에이전트 책임

- `orchestrator`: 변경 범위 조율, 단계화된 적용 순서 확정
- `architect`: 경계 혼재 진단, 목표 구조와 중간 상태 정의
- `frontend-dev`: 웹 기능 구현, App Router와 UI 구조 정리
- `mobile-dev`: Expo 구조, 서비스 계층, 화면 흐름 정리
- `api-engineer`: API 계약, route handler, client 호출 구조 정리
- `state-engineer`: 상태, 캐시, 파생값, 부수효과 경계 정리
- `package-engineer`: `packages/*` 계약, export, runtime 독립성 관리
- `qa-tester`: lint, typecheck, build, 회귀 확인
- `meta-cognitive`: 반복 실수 패턴을 skills와 memory에 축적
- `code-quality-guardian`: **항상 동반** — 코드 변경 작업 시 상태 정합성, 경계 위반, 보안, 스타일링 규칙을 실시간 감시하고 커밋 전 최종 게이트 수행

## UI 작업 시 규칙

- UI 작업에서는 `design-workflow.md`와 `design-eye.md`를 함께 적용한다.
- 21st 결과물은 그대로 넣지 않고, 구조와 시각 위계를 다시 맞춘다.
- 기본 Tailwind 유틸리티 사용을 금지하지 않는다.

## 리팩토링 기본 프로토콜

1. 가장 충돌이 적은 엔트리부터 시작한다.
2. 큰 파일은 마크업 불변 상태에서 block 단위로 분리한다.
3. 계약과 source of truth 위치를 먼저 맞춘다.
4. 구현 후 `self-improve-checklist`로 자기 점검한다.
5. 유의미한 작업 후 `meta-cognitive` 기준으로 회고한다.

## 금지사항

- 기능, 텍스트, UX, API 동작 변경
- 존재하지 않는 API나 package export를 추측해서 추가
- web 전용 내부 구현을 mobile이 직접 import
- 기본 Tailwind 사용을 막기 위한 과한 theme override
- 재사용 증거가 없는데도 성급하게 shared package로 추출
