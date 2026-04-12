---
name: design-eye
description: 10년차 디자이너/기획자/프론트엔드의 안목으로 UI를 판단하고 개선하는 스킬.
---

# design-eye

이 스킬은 Claude의 `design-eye` 커맨드를 Codex에서 재사용하기 위한 래퍼다.

## Source of Truth

- `.claude/commands/design-eye.md`

## Execution

1. 위 source 파일을 읽는다.
2. 해당 문서의 절차와 출력 형식을 authoritative 하게 따른다.
3. 사용자가 전달한 인자가 있으면 그 의도를 유지한 채 same workflow로 실행한다.

