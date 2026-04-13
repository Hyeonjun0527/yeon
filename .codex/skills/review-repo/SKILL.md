---
name: review-repo
description: 현재 프로젝트 코드베이스를 점검하여 실제 리뷰 포인트를 최소 0개, 최대 10개 도출한다.
---

# review-repo

이 스킬은 Claude의 `review-repo` 커맨드를 Codex에서 재사용하기 위한 래퍼다.

## Source of Truth

- `.claude/commands/review-repo.md`

## Execution

1. 위 source 파일을 읽는다.
2. 해당 문서의 절차와 출력 형식을 authoritative 하게 따른다.
3. 사용자가 전달한 인자가 있으면 그 의도를 유지한 채 same workflow로 실행한다.
