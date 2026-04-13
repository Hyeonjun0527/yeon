---
name: code-review
description: critical/major/minor 구조화 코드 리뷰 절차와 상태 정합성 중심 체크리스트.
---

# code-review

이 스킬은 Claude의 `code-review` 커맨드를 Codex에서 재사용하기 위한 래퍼다.

## Source of Truth

- `.claude/commands/code-review.md`

## Execution

1. 위 source 파일을 읽는다.
2. 해당 문서의 절차와 출력 형식을 authoritative 하게 따른다.
3. 사용자가 전달한 인자가 있으면 그 의도를 유지한 채 same workflow로 실행한다.
