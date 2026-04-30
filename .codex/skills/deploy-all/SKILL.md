---
name: deploy-all
description: |-
  Yeon main-only 운영 배포 플로우. 검증 → 커밋 → push → PR(main) → 머지 → 운영 배포 확인.
---

# deploy-all

이 파일은 **Codex 측 얇은 wrapper**다. 절차의 실제 출처는 아래 SSOT 파일이다.

## Source of Truth

- `.claude/commands/deploy-all.md`

## Execution

**첫 단계로 반드시 source 파일을 Read 하라.** 본 wrapper 의 요약이나 지시어만으로 절차를 수행하지 말 것.

1. `Read(".claude/commands/deploy-all.md")` 을 즉시 호출하여 전체 내용을 받는다.
2. 그 문서의 절차, 체크리스트, 출력 형식을 authoritative 하게 그대로 따른다.
3. 사용자가 전달한 인자($ARGUMENTS)가 있으면 그 의도를 유지한 채 동일 workflow 로 실행한다.
4. 이 wrapper 는 `bin/sync-skills.sh` 가 자동 생성한다. 직접 수정하지 말고 SSOT 파일을 편집한다.
