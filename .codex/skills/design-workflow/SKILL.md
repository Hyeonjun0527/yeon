---
name: design-workflow
description: UI 작업 시 디자인 방향을 먼저 정하고 21st 도구로 구현 레퍼런스를 연결하는 절차.
---

# design-workflow

이 스킬은 Claude의 `design-workflow` 커맨드를 Codex에서 재사용하기 위한 래퍼다.

## Source of Truth

- `.claude/commands/design-workflow.md`

## Execution

1. 위 source 파일을 읽는다.
2. 해당 문서의 절차와 출력 형식을 authoritative 하게 따른다.
3. 사용자가 전달한 인자가 있으면 그 의도를 유지한 채 same workflow로 실행한다.
