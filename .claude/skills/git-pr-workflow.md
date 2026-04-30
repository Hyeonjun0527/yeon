---
name: git-pr-workflow
description: Yeon main-only 브랜치, 커밋, push, PR, merge 운영 절차. develop은 잠정 중단 상태로 기본 사용 금지.
user_invocable: true
---

# Git / PR Workflow — Yeon main-only

## 현재 정책

- `develop`은 잠정 중단 상태다.
- 기본 base는 `origin/main`, 기본 PR target은 `main`이다.
- `develop`, `origin/develop`, `dev.yeon.world`는 사용자가 명시적으로 재활성화하거나 지정한 경우에만 사용한다.
- 직접 `main` push는 금지. 작업 브랜치 → push → PR(main) → merge가 기본이다.

## 시작

```bash
git status --short --branch
git fetch origin
git switch -c <type>/<name>-<N> origin/main
```

이미 작업 브랜치가 있으면 새 브랜치를 만들지 말고 현재 브랜치에서 이어간다. 단, 사용자가 명시적으로 새 브랜치를 요청하면 `origin/main`에서 분기한다.

## 작업 중 안전

- 다른 에이전트 변경을 되돌리지 않는다.
- 같은 파일 동시 수정이 보이면 semantic conflict 여부를 확인한다.
- 자기 파일만 stage한다. `git add .` 지양.
- 커밋 전 untracked 파일 확인:

```bash
git status --short | grep '^??' || true
```

## push 전

```bash
git fetch origin
git rebase origin/main
# 필요 시 검증 후
git push -u origin <branch>
```

rebase 후 기존 원격 브랜치를 갱신해야 하면 본인 브랜치에만 `--force-with-lease`를 사용한다.

## PR

```bash
gh pr create --base main --head <branch> --title "<구체적 제목>" --body-file <body-file>
gh pr edit <pr-number> --add-assignee Hyeonjun0527
```

PR 본문 최소 항목:

- 작업 내용
- 변경 이유
- 검증 방법
- base/head 브랜치
- main-only 정책 준수 여부

## merge

- PR checks가 green이어야 한다.
- merge 직전 필요하면 `git fetch origin && git rebase origin/main` 후 push한다.
- merge 후 운영 배포가 필요한 작업은 main workflow run을 확인한다.
