---
name: validate
description: Yeon 변경 후 실행하는 검증 파이프라인. 코드 변경은 lint/format/typecheck/build/test, 문서·규칙 변경은 SSOT/sync/diff 검증.
user_invocable: true
---

# Validate

## 먼저 확인

- 루트와 workspace `package.json`에서 실제 스크립트를 확인한다.
- 없는 스크립트를 있다고 가정하지 않는다.

## 코드 변경 기본 순서

1. lint/fix
2. format
3. typecheck
4. `pnpm --filter @yeon/web build`
5. 필요한 test

## 문서/규칙/스킬 변경 기본 순서

```bash
git diff --check
bash bin/sync-skills.sh --check
bash bin/verify-ssot.sh --project-only
```

스킬 source를 바꿨다면 먼저:

```bash
bash bin/sync-skills.sh
```

## DB schema 변경

`yeon-project-context`의 DB/Migration 섹션을 읽고 migration 생성 및 drift check를 수행한다.
