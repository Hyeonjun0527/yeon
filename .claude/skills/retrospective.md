---
name: retrospective
description: 반복 수정 뒤 재발 방지 규칙을 남기는 회고 절차.
user_invocable: true
---

# Retrospective

## 언제 기록하는가

- 같은 영역의 수정이 세 번 이상 반복됐을 때
- 같은 유형의 리뷰 코멘트가 다시 나왔을 때
- 구조적 판단 기준을 다음 작업에도 재사용할 가치가 있을 때

## 어디에 기록하는가

- 일반 안티패턴: `.claude/memory/anti-patterns.md`
- 버그 재발 패턴: `.claude/memory/bug-patterns.md`
- 회고 로그: `.claude/memory/retrospective-log.md`

## 무엇을 남기는가

- 증상
- 실제 원인
- 더 이른 시점에 잡을 수 있었던 신호
- 다음부터 적용할 규칙

## 동시 작업 인식

- 반복 수정이 "같은 에이전트의 실수"인지 "서로 다른 에이전트가 같은 영역을 건드려서 생긴 충돌"인지 먼저 구분한다.
- 후자라면 재발 방지 규칙보다 **작업 범위 분리 원칙**(CLAUDE.md 참조)을 먼저 점검한다.
- 다른 에이전트의 WIP 코드를 오해하여 수정한 경우도 회고 대상이다.
