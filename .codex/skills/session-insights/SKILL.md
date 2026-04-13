---
name: session-insights
description: 과거 세션 데이터를 분석하여 작업 패턴, git 활동, 유용했던 접근법을 정리하고 시각화한다.
---

# session-insights

이 스킬은 Claude의 `session-insights` 커맨드를 Codex에서 재사용하기 위한 래퍼다.

## Source of Truth

- `.claude/commands/session-insights.md`

## Execution

1. 위 source 파일을 읽는다.
2. 해당 문서의 절차와 출력 형식을 authoritative 하게 따른다.
3. 사용자가 전달한 인자가 있으면 그 의도를 유지한 채 same workflow로 실행한다.
