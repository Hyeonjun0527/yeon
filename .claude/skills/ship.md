---
name: ship
description: 검증 → 커밋 → push → PR → develop 머지까지 일사천리로 수행하는 배포 플로우.
user_invocable: true
---

# Ship

## 전제 조건

- 구현이 완료된 상태여야 한다.
- code-quality-guardian 체크리스트를 통과한 상태여야 한다.
- **동시 작업 인식**: push 직전 반드시 `git fetch origin && git rebase origin/develop`을 실행한다. 다른 에이전트가 먼저 develop에 머지했을 수 있다. rebase 없이 push하면 충돌이 생기거나 다른 에이전트의 작업이 누락될 수 있다.

## 플로우

### 1. 검증

`validate.md` 순서대로 실행한다.

1. `pnpm lint`
2. `pnpm prettier:fix`
3. `pnpm typecheck`
4. `pnpm --filter @yeon/web build`
5. 필요 시 test

모든 단계가 green이어야 다음으로 진행한다.

### 2. 커밋

```bash
git add <변경 파일만 선별>
git commit
```

- `git add .`은 사용하지 않는다. 자기 작업 파일만 pathspec으로 선별한다.
- 커밋 메시지는 한국어로, 변경 대상 + 핵심 동작 변화 + 수정 의도가 드러나게 작성한다.
- 모호한 메시지(`fix: 수정`, `refactor: 정리`) 금지.

### 3. Push

```bash
# 첫 push
git push -u origin <branch-name>

# 후속 push
git push
```

- 새 브랜치의 첫 push는 반드시 `-u`로 upstream을 연결한다.
- rebase 이후에만 `--force-with-lease` 사용 가능.

### 4. PR 생성

```bash
gh pr create \
  --base develop \
  --head <branch-name> \
  --title "<구체적 제목>" \
  --body-file <본문파일>

gh pr edit <pr> --add-assignee Hyeonjun0527
```

- 이미 열린 PR이 있으면 기존 PR에 push.
- PR 본문 필수 항목: 작업 내용, 변경 이유, 검증 방법, 브랜치 정보.
- assignee는 항상 `Hyeonjun0527`.

### 5. Develop 머지

```bash
gh pr merge <pr> --merge
```

- PR이 생성되면 바로 develop에 머지한다.
- 머지 후 develop 기준으로 통합 검증을 다시 실행한다.
- 통합 검증이 실패하면 같은 브랜치에서 수정 커밋으로 이어간다.

## 중단 조건

- 검증 실패 시: 수정 후 재실행.
- push 실패 시: conflict 해결 후 재시도.
- PR 생성 실패 시: 원인 파악 후 재시도.
- 머지 실패 시: 원인을 사용자에게 보고.

## 이 플로우는 멈추지 않는다

- 개발 완료 필수 원칙에 따라, 이 전체 흐름은 중간에 멈추지 않고 일사천리로 수행한다.
- 실패한 단계가 있으면 그 시점에서 사용자에게 보고한다.
