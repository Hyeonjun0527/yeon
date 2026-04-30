---
name: ship
description: 검증 → 커밋 → push → PR(main) → 머지까지 수행하는 Yeon main-only ship 플로우.
user_invocable: true
---

# Ship — main-only

## 전제

- 구현이 완료된 상태여야 한다.
- `develop`은 잠정 중단이므로 사용하지 않는다.
- base/target은 `main`이다.
- 직접 `main` push 금지. PR을 사용한다.

## 1. 검증

`validate` 스킬 기준으로 실행한다. 코드 변경이면 보통:

1. lint/fix
2. format
3. typecheck
4. `pnpm --filter @yeon/web build`
5. 필요한 test

## 2. 커밋

```bash
git status --short --branch
git status --short | grep '^??' || true
git add <변경 파일만 선별>
git commit
```

- `git add .` 지양.
- 커밋 메시지는 한국어로 구체적으로 작성한다.
- Lore trailers가 필요한 세션이면 포함한다.

## 3. push

```bash
git fetch origin
git rebase origin/main
git push -u origin <branch>
```

## 4. PR(main) 생성/갱신

```bash
gh pr create --base main --head <branch> --title "<제목>" --body-file <body-file>
gh pr edit <pr> --add-assignee Hyeonjun0527
```

기존 PR이 있으면 새 PR을 만들지 말고 기존 PR에 push한다.

## 5. merge 및 확인

- PR checks 확인 후 merge.
- 운영 반영 작업이면 GitHub Actions main workflow와 `https://yeon.world` health를 확인한다.
