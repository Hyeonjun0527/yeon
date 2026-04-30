---
name: deploy-all
description: Yeon main-only 운영 배포 플로우. 검증 → 커밋 → push → PR(main) → 머지 → 운영 배포 확인.
user_invocable: true
---

# Deploy All — main-only production

`develop`은 잠정 중단 상태다. 이 스킬은 `main`을 통해 production(`yeon.world`)에 반영한다.

## 플로우

1. 변경 범위 확인: `git status --short --branch`.
2. 검증: `validate` 스킬 기준으로 lint/typecheck/build/test를 실행.
3. 커밋: 자기 작업 파일만 stage.
4. 최신 main 반영:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
5. push:
   ```bash
   git push -u origin <branch>
   ```
6. PR 생성:
   ```bash
   gh pr create --base main --head <branch> --title "<제목>" --body-file <body-file>
   gh pr edit <pr> --add-assignee Hyeonjun0527
   ```
7. PR checks 확인 후 merge.
8. 운영 배포 run 확인:
   ```bash
   gh run list --workflow "Build, Push, and Deploy Docker Image" --branch main --limit 5
   gh run watch <run-id> --exit-status
   ```
9. 운영 health 확인:
   ```bash
   curl -sS -L -o /tmp/yeon-home.html -w 'home_http=%{http_code}\n' https://yeon.world
   curl -sS -L https://yeon.world/api/health
   ```

## 금지

- 사용자가 명시하지 않는 한 `develop` PR/merge/deploy를 만들지 않는다.
- `main` 직접 push 금지.
