---
name: git-pr-workflow
description: `study-platform-client`와 동일한 commit, push, PR, stacked PR 운영 절차.
user_invocable: true
---

# Git / PR Workflow

## 운영 모델

- develop 서버 기준 통합 브랜치: `develop`
- 운영 브랜치: `main`
- 첫 landing 단위의 첫 브랜치는 최신 `origin/develop`에서 분기한다.
- 별도 landing 단위가 필요할 때만 stacked branch와 stacked PR로 분리한다.

## 현재 저장소 상태

- 2026-04-06 기준 이 저장소 원격에는 `origin/main`만 있다.
- 따라서 첫 통합 단계에서는 `main`에서 `develop`을 생성해 push한 뒤, 그 다음부터 이 규칙을 그대로 적용한다.

## 커밋 절차

1. lint fix
2. format fix
3. typecheck
4. `git add .`
5. `git commit`

- 스크립트가 아직 없으면 없는 척 대체하지 말고 먼저 공유한다.
- 커밋 메시지는 반드시 한국어로, 변경 대상 + 핵심 동작 변화 + 수정 의도가 드러나게 작성한다.

## push 절차

1. 검증이 green인지 확인한다.
2. 첫 push면 `git push -u origin <branch>`
3. 후속 수정은 같은 브랜치에 계속 push한다.
4. restack이나 rebase 뒤에는 본인 브랜치에 한해 `--force-with-lease`만 사용한다.

## PR 절차

1. 첫 PR의 base는 `develop`
2. stacked PR의 base는 직전 작업 브랜치
3. `gh pr create --base <base> --head <head> --title "<title>" --body-file <file>`
4. `gh pr edit <pr> --add-assignee Hyeonjun0527`

## PR 본문 필수 항목

- 작업 내용
- 변경 이유
- 검증 방법
- 브랜치 정보(`base`, `head`, `순번`)

## 금지사항

- direct `develop` push
- direct `main` push
- suffix 없는 작업 브랜치명
- 깨진 중간 상태 커밋
- 서로 다른 landing 단위를 한 PR에 섞는 것

## 동시 작업 인식

이 저장소에는 여러 에이전트가 동시에 작업 중일 수 있다.

- **작업 시작 전**: `git fetch origin && git rebase origin/develop` — 다른 에이전트가 먼저 머지한 내용을 반영한다.
- **push 직전**: 다시 한번 `git fetch origin && git rebase origin/develop` — 작업 중에 다른 에이전트가 머지했을 수 있다.
- **같은 파일 수정 충돌 시**: 로컬에서 rebase로 충돌을 해결하고, `--force-with-lease`로 push한다. `--force`는 금지.
- **브랜치명 충돌 방지**: 다른 에이전트가 사용 중인 브랜치명과 겹치지 않도록 작업 단위가 명확히 드러나는 이름을 사용한다.
