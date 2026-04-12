---
name: wrap
description: 세션 마무리 시 5개 서브에이전트를 병렬 실행하여 문서 업데이트, 자동화 제안, TIL 추출, 후속 작업, 중복 검증을 수행하고 객관식으로 결과를 제시한다.
---

# wrap

이 스킬은 Claude의 `wrap` 커맨드를 Codex에서 재사용하기 위한 래퍼다.

## Source of Truth

- `.claude/commands/wrap.md`

## Execution

1. 위 source 파일을 읽는다.
2. 해당 문서의 절차와 출력 형식을 authoritative 하게 따른다.
3. 사용자가 전달한 인자가 있으면 그 의도를 유지한 채 same workflow로 실행한다.
