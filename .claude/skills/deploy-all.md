---
name: deploy-all
description: 검증 → 커밋 → push → PR(develop) → 머지 → PR(main) → 머지까지 전체 배포 플로우.
user_invocable: true
---

# Deploy

검증부터 origin/develop, origin/main 반영까지 일사천리로 수행한다.

## 전제 조건

- 구현이 완료된 상태여야 한다.
- 현재 브랜치가 develop에서 분기한 작업 브랜치여야 한다.
- develop이나 main에서 직접 실행하지 않는다.
- **동시 작업 인식**: push 직전 반드시 `git fetch origin && git rebase origin/develop`을 실행한다. 다른 에이전트가 먼저 develop에 머지했을 수 있다. develop → main PR 생성 전에도 동일하게 확인한다.

## 플로우

### 1. 검증

순서대로 실행한다. 모든 단계가 green이어야 다음으로 진행한다.

1. `pnpm lint`
2. `pnpm prettier:fix` (스크립트 존재 시)
3. `pnpm --filter @yeon/web exec tsc --noEmit`
4. `pnpm --filter @yeon/web build`

### 2. 커밋

```bash
git add <변경 파일만 선별>
git commit
```

- `git add .`은 사용하지 않는다. 변경 파일만 pathspec으로 선별한다.
- 커밋 메시지는 한국어로 작성한다.
- 변경 대상 + 핵심 동작 변화 + 수정 의도가 드러나게 쓴다.
- 모호한 메시지(`fix: 수정`, `refactor: 정리`) 금지.
- **커밋 전 untracked 파일 확인 필수**: `git status`에서 `??`로 표시된 파일이 있는데, 커밋할 파일이 해당 파일을 import하면 Docker 빌드가 실패한다. 스테이징 전에 반드시 `git status --short | grep "^??"` 로 미커밋 파일을 확인하고, import 관계가 있는 파일은 함께 커밋한다.

### 3. Push

```bash
git push -u origin <branch-name>
```

- 새 브랜치의 첫 push는 반드시 `-u`로 upstream을 연결한다.

### 4. PR → develop 머지

```bash
gh pr create --base develop --head <branch-name> --title "<제목>" --body "$(cat <<'EOF'
## Summary
<변경 요약>

## Test plan
<검증 방법>
EOF
)"

gh pr merge <pr-number> --merge
```

- PR 생성 후 바로 develop에 머지한다.

### 5. PR → main 머지

develop 머지가 완료되면 develop → main PR을 생성한다.

```bash
gh pr create --base main --head develop --title "<제목>" --body "$(cat <<'EOF'
## Summary
develop → main 반영

<변경 요약>
EOF
)"

gh pr merge <pr-number> --merge
```

- 이미 develop → main PR이 열려 있으면 기존 PR을 머지한다.

### 6. 로컬 동기화

```bash
git fetch origin
git switch develop
git rebase origin/develop
```

## 중단 조건

- 검증 실패 시: 수정 후 재실행.
- push 실패 시: conflict 해결 후 재시도.
- PR/머지 실패 시: 원인을 사용자에게 보고.

## 이 플로우는 멈추지 않는다

개발 완료 필수 원칙에 따라 전체 흐름을 일사천리로 수행한다.
실패한 단계가 있으면 그 시점에서 사용자에게 보고한다.
