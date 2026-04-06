# AGENTS.md

이 저장소에서 Codex와 Claude는 `.claude`와 `.codex/project-context`를 공용 운영 메모리처럼 사용한다.

## 저장소 운영 상태

- 이 저장소는 `study-platform-client`의 브랜치, 커밋, push, PR 운영 방식을 그대로 채택한다.
- 다만 이 저장소의 원격 상태는 2026-04-06 기준 `origin/main`만 존재한다.
- 따라서 첫 통합 단계에서는 `main`에서 `develop`을 생성해 push하고, 그 뒤부터는 아래 규칙을 그대로 따른다.
- `develop`은 develop 서버 기준 브랜치, `main`은 운영 기준 브랜치로 사용한다.

## 항상 수행 (작업 시작 시)

1. 아래 파일을 먼저 확인한다.
   - `AGENTS.local.md` (존재할 때만)
   - `CLAUDE.md`
   - `CLAUDE.local.md`
   - `.claude/agents/README.md`
   - `.codex/project-context/README.md`
2. `.claude/skills/`, `.claude/memory/`, `.claude/agents/`의 파일 목록을 확인해 현재 규칙 구성을 파악한다.
3. `.claude` 하위 파일 전체를 매번 모두 읽지 않는다. 요청과 직접 관련된 파일만 지연 로딩한다.
4. git 관련 작업이 있으면 `.claude/skills/git-pr-workflow.md`를 함께 확인한다.
5. `AGENTS.local.md`는 사용자 개인 환경, 장비 정보, 비공개 운영 메모를 두는 용도로 사용한다.
6. `AGENTS.local.md`가 없으면 조용히 건너뛴다.

## UI 작업 시작 규칙

- UI/UX 작업은 바로 컴포넌트를 찍지 않는다.
- 먼저 `ui-ux-pro-max`로 디자인 시스템을 정리한다.
- 그 다음 21st 도구로 레퍼런스 탐색, 컴포넌트 생성, 리파인을 진행한다.
- UI 작업이 포함되면 `.claude/skills/design-eye.md` 기준으로 한 번 더 검토한다.
- 구현은 반드시 현재 저장소 구조와 기존 시각 언어에 맞게 다시 맞춘다.
- 이 저장소에서는 기본 Tailwind 유틸리티 사용을 금지하지 않는다.
- `global.css` 또는 `globals.css`에서 기본 Tailwind scale을 막는 방식으로 설계하지 않는다.

## 커밋 요청 고정 절차

- 사용자가 커밋을 요청하면 아래 순서를 반드시 그대로 따른다.
  1. 자기 작업 파일만 `git add <path>`로 골라서 add 한다.
  2. `git add .`은 사용하지 않는다.
  3. add 하자마자 빠르게 `git commit`을 먼저 한다.
  4. 작업 브랜치 커밋 후 가능한 한 빨리 `develop`에 머지한다.
  5. `develop` 기준으로 `yarn lint`
  6. `develop` 기준으로 `yarn prettier`
  7. `develop` 기준으로 `yarn typecheck`
- 현재 저장소는 다중 에이전트 동시 작업 상황을 기본으로 보고, 다른 에이전트 변경과 섞이지 않게 자기 파일만 staging 한다.
- 이 저장소는 하나의 레포를 매우 빠르게 동시 작업하는 환경이고 `git worktree` 사용이 금지되어 있으므로, 작업 브랜치에서 자기 범위 커밋을 만든 뒤에는 가능한 한 빨리 `develop`에 머지한다.
- `develop` 통합 이후 검증 순서와 운영 감각은 `study-platform-client`와 동일하게 유지한다.
- 이 저장소는 `pnpm` 모노레포이므로 위 `yarn` 흐름은 현재 workspace의 `package.json`에 맞춰 `pnpm --filter ...`, `turbo run ... --filter=...`, 또는 루트의 `pnpm lint`, `pnpm prettier:fix`, `pnpm typecheck`로 치환한다.
- 현재 workspace에 해당 스크립트가 아직 없으면 없는 척 대체하지 말고, 부재 사실과 영향 범위를 먼저 공유한다.
- 통합 검증이 실패하면 실패 내용을 즉시 공유하고, 같은 브랜치나 후속 브랜치에서 수정 커밋으로 이어간다.
- 커밋 메시지는 반드시 한국어로 작성한다.
- 커밋 메시지는 반드시 구체적으로 작성한다.
- 커밋 메시지에는 최소한 변경 대상, 핵심 동작 변화, 수정 의도가 드러나야 한다.
- `fix: 수정`, `fix: 리뷰 반영`, `refactor: 정리`, `chore: 반영`처럼 모호한 메시지는 금지한다.
- 가능하면 `type: 영역 + 무엇을 왜 바꿨는지`가 드러나게 적는다.

## 코드 수정 브랜치 시작 규칙

- 코드 수정이 필요한 작업은 "무엇을 함께 landing할 것인가"를 기준으로 브랜치와 PR 단위를 정한다.
- 새 landing 단위의 첫 브랜치는 시작 전에 최신 `origin/develop`를 기준으로 새로 만든다.
- `origin/develop`가 아직 없으면 먼저 `main`에서 `develop`을 만들고 push한 뒤, 작업 브랜치를 분기한다.
- 이미 열려 있는 브랜치와 PR이 현재 수정까지 함께 머지되어야 하는 범위라면 그 브랜치에서 계속 작업한다.
- 별도 리뷰나 머지 타이밍이 필요한 후속 작업만 기존 작업 브랜치를 base로 stacked branch로 분리한다.
- 여러 에이전트가 같은 landing 단위를 동시에 작업해야 하면 같은 브랜치에서 함께 작업하고, 충돌은 그 브랜치에서 해결한다.
- 작업을 위해 별도 git worktree를 새로 만들지 않는다.
- 특히 `~/coding_stuffs` 아래에 현재 저장소의 sibling 디렉터리 형태 worktree를 추가 생성하는 행위를 금지한다.
- 병렬 작업, 충돌 회피, 임시 검증을 이유로도 worktree를 만들지 말고 현재 작업 디렉터리와 현재 브랜치 규칙 안에서 해결한다.
- 이 제약 때문에 작업 브랜치에서 커밋이 끝난 변경은 오래 들고 있지 말고 가능한 한 빨리 `develop`에 흡수해, 다음 작업도 최신 `develop` 기준으로 이어간다.
- 사용자가 명시적으로 worktree 생성을 지시한 경우에만 예외를 검토한다.
- 브랜치명은 항상 의미 있는 이름 뒤에 `-1`, `-2`, `-3` 같은 숫자 suffix를 붙인다.
- 같은 주제의 후속 작업이 별도 브랜치가 필요하면 직전 작업 브랜치를 base로 삼아 suffix 숫자를 올려 진행한다.

## 변경 단위 운영 규칙

- 기본 원칙은 `1 landing 단위 = 1브랜치 = 1PR`이다.
- 여기서 `landing 단위`는 "함께 리뷰되고 함께 머지되어야 하는 최소 변경 묶음"을 뜻한다.
- 서로 다른 책임을 한 작업에 섞지 않는다.
  - 예: API 계약 변경 + UI 구조 변경 + 스타일 정리 + 리팩토링을 한 커밋에 같이 넣지 않는다.
- 현재 변경을 하나의 green 단위로 자를 수 없으면 구현을 계속 밀지 말고, 먼저 더 작은 작업 단위로 재분할한다.
- 하나의 브랜치가 언제나 반드시 하나의 수정만 담아야 한다고 가정하지 않는다.
- 같은 landing 단위의 구현 보완, 리뷰 반영, 검증 보완, 함께 머지되어야 하는 연계 수정은 같은 브랜치와 같은 PR에서 함께 다룰 수 있다.
- 여러 에이전트가 같은 landing 단위를 동시에 작업하는 것도 허용한다. 이 경우 각 에이전트 변경은 같은 브랜치에서 통합하고, 충돌 해결 결과도 그 브랜치의 커밋에 포함한다.
- 별도 PR이나 별도 머지 순서가 필요한 후속 작업만 stacked PR 방식으로 분리한다.
- 사용자가 `develop에 반영`, `develop에 올려`, `develop에 붙여`, `dev에 반영`처럼 요청하면, 그 의미는 이 문서에 적힌 브랜치, 커밋, push, PR 규칙 전체를 수행하라는 뜻으로 해석한다.
- 즉, 해당 요청은 현재 작업 브랜치를 `develop`에 바로 merge하거나 direct push 하라는 뜻이 아니다.
- 별도 명시가 없는 한 반드시 아래 순서로 처리한다.
  1. 함께 landing할 변경 묶음인지 먼저 판단한다.
  2. 새 landing 단위면 최신 `origin/develop`에서 첫 브랜치를 만든다.
  3. 같은 landing 단위면 기존 브랜치와 PR에서 계속 작업한다.
  4. 별도 landing 단위가 필요하면 그때 stacked branch와 stacked PR로 분리한다.
  5. 각 브랜치 단위를 검증 후 push한다.
  6. 필요 시 `develop` 기준으로 순차 landing 한다.
- 사용자가 명시적으로 direct merge 또는 direct push를 지시하지 않는 한, `develop`에 바로 머지하는 방식은 금지한다.

## 브랜치 규칙

- 새 landing 단위의 첫 브랜치만 최신 `origin/develop`에서 분기한다.
- 같은 landing 단위의 후속 수정은 기존 브랜치에서 계속 진행할 수 있다.
- 별도 landing 단위가 필요할 때만 현재 작업 브랜치를 base로 stacked branch를 만든다.
- 작업 브랜치명은 반드시 suffix 숫자를 붙인다.
- `split/` prefix는 기본 규칙으로 사용하지 않는다.
  - 예: `web-auth-session-1`
  - 예: `web-auth-session-2`
- suffix 숫자 없는 작업 브랜치명은 금지한다.
- 같은 주제의 후속 작업이 별도 브랜치로 나뉘면 브랜치명을 유지하되 suffix만 올려 stacked branch로 만든다.
- 여러 에이전트가 같은 브랜치에서 동시에 작업하는 것은 허용한다.
- 텍스트 `merge conflict`는 물론, 같은 브랜치에서 충돌 없이 합쳐졌더라도 상태 전이, 공용 DTO, 공용 정책, 공용 쿼리 의미가 어긋나면 `semantic conflict`로 보고 다시 맞춘다.

## 커밋 규칙

- 각 작업 브랜치에는 그 브랜치가 담당하는 landing 단위의 커밋만 둔다.
- 같은 landing 단위를 진행하면서 생긴 구현 보완, 리뷰 반영, 검증 보완, 충돌 해결 커밋은 기존 브랜치에 계속 추가해도 된다.
- 여러 에이전트가 같은 브랜치에서 작업한 결과도 같은 브랜치의 커밋들로 통합한다.
- 서로 다른 landing 단위이거나 별도 리뷰 단위로 봐야 하는 변경이면 새 브랜치와 새 PR로 분리한다.
- 최종 머지 전에는 필요하면 rebase나 squash로 커밋 흐름을 정리할 수 있지만, "무조건 1커밋"을 기본 규칙으로 강제하지는 않는다.
- 커밋 메시지는 반드시 한국어로, 변경 대상 + 핵심 동작 변화 + 수정 의도가 드러나게 구체적으로 작성한다.
- `fix: 수정`, `refactor: 정리`, `chore: 반영`처럼 모호한 메시지는 금지한다.

## 다중 에이전트 동시 작업 규칙

- 현재 저장소에 매우 많은 에이전트가 동시에 붙어 있을 수 있으므로, 작업 중 갑자기 파일이 수정되어도 기본적으로 다른 에이전트의 변경으로 간주하고 놀라지 않는다.
- 다른 에이전트가 먼저 만진 변경은 우선 존중한다. 텍스트 충돌이 없고 semantic conflict도 없다면 임의로 되돌리거나 덮어쓰지 않는다.
- 자기 작업이 빨리 끝났다면 자기 담당 파일만 pathspec으로 `git add` 해서 빠르게 커밋한다.
- 이 상황에서는 다른 에이전트가 건드린 파일까지 습관적으로 `git add .` 하거나 함께 커밋하지 않는다.
- 같은 파일을 함께 만지는 중이라면 마지막 작성자가 이긴다는 식으로 밀어붙이지 말고, 필요한 최소 범위만 다시 맞춘 뒤 커밋한다.

## green 검증 규칙

- 모든 커밋은 단독으로 checkout 했을 때 앱이나 저장소 구조가 동작 가능한 상태여야 한다.
- "다음 브랜치가 올라와야만 동작하는 중간 상태" 커밋은 금지한다.
- 커밋 전에는 기본적으로 아래 순서로 검증한다.
  1. `lint --fix`
  2. `prettier:fix` 또는 동등한 format fix
  3. `typecheck`
  4. 필요 시 `build`
  5. `git add .`
  6. `git commit`
- 현재 저장소에 스크립트가 아직 없으면 검증 미실행 사유를 먼저 공유하고, 그 상태로 커밋할지 사용자와 맞춘다.
- 다중 에이전트 동시 작업 환경에서는 통합 검증의 기준 브랜치를 `develop`으로 본다.
- 즉, 작업 브랜치 커밋 후 빠르게 `develop`에 머지하고 `develop`에서 `pnpm lint`, `pnpm prettier:fix`, `pnpm typecheck` 순서를 반복하는 것을 기본값으로 삼는다.

## push 규칙

- 각 브랜치는 green 검증 후 push한다.
- 새 브랜치의 첫 push는 반드시 upstream을 연결한다.
  - 예: `git push -u origin web-auth-session-1`
- 같은 landing 단위의 후속 수정은 같은 브랜치에 커밋하고 같은 PR에 push한다.
- stacked branch는 아래쪽 PR이 먼저 존재하도록 순서대로 push한다.
- rebase나 restack 이후 다시 push할 때는 본인 브랜치에 한해 `--force-with-lease`만 사용한다.
- 사용자가 명시적으로 direct push를 지시하지 않는 한 `develop` 또는 `main`에 직접 push하지 않는다.

## PR 규칙

- 각 브랜치는 정확히 하나의 PR에 대응한다.
- 같은 브랜치의 후속 수정은 기존 PR에 계속 반영한다.
- 첫 작업 PR의 base는 `develop`이다.
- 별도 landing 단위로 분리된 후속 작업 PR만 직전 작업 PR을 base로 하는 stacked PR 방식으로 만든다.
- 하나의 PR에는 여러 관련 수정과 여러 에이전트 작업 결과가 함께 들어갈 수 있다.
- PR 생성 시 assignee는 항상 `Hyeonjun0527`(최현준)으로 지정한다.
- assignee가 비어 있거나 다른 사용자로 되어 있으면 즉시 `Hyeonjun0527`로 수정한다.
- PR 제목과 본문은 반드시 구체적으로 작성한다.
- PR 본문에는 최소한 아래를 포함한다.
  - 작업 내용
  - 변경 이유
  - 검증 방법
  - 브랜치 정보(`base`, `head`, `순번`)
- 앞 PR이 머지되면 뒤 PR은 최신 `origin/develop` 기준으로 다시 맞추고, 수정 범위 관련 테스트와 빌드를 재확인한 뒤 머지한다.

## PR 생성 고정 절차

- PR 생성 전 반드시 최신 브랜치 상태를 push한다.
- 가능하면 `gh` CLI를 사용해 비대화형으로 생성한다.
  1. `git push -u origin <head-branch>`
  2. `gh pr create --base <base-branch> --head <head-branch> --title "<구체적인 제목>" --body-file <본문파일>`
  3. `gh pr edit <pr-number 또는 head-branch> --add-assignee Hyeonjun0527`
- PR 본문 초안이 길거나 여러 차수로 나뉘면 `personal_space/YYYY-MM-DD/...PR_DRAFT.md`에 먼저 작성한 뒤 `--body-file`로 사용한다.
- PR을 연 뒤에는 base, head, assignee, 본문 필수 항목이 모두 맞는지 다시 확인한다.

## 예외 규칙

- 하나의 landing 단위를 `1브랜치 1PR`로 안전하게 다룰 수 없으면 임의로 진행하지 않는다.
- 먼저 backlog 문서에 재분할안을 작성하고, 같은 브랜치로 유지할지 stacked로 나눌지, 머지 순서를 사용자와 확인한 뒤 진행한다.
- 사용자의 명시적 재지시가 없는 한 `깨진 중간 상태 커밋`, `direct develop merge`, `direct main merge`로 전환하지 않는다.

## 브랜치 배포 기준

- `develop` 브랜치는 develop 서버 기준 브랜치다.
- `main` 브랜치는 운영 서버 기준 브랜치다.
- 이 저장소는 2026-04-06 기준 `origin/develop`가 아직 없으므로 첫 통합 단계에서 생성해야 한다.

## 개발 계획 / 백로그 규칙

- 코드 수정, 리팩토링, 설계 변경, API 추가, DDL 변경, 구조 변경처럼 실제 개발 작업에 들어가기 전에는 반드시 먼저 백로그 문서를 작성한다.
- 백로그 문서는 `실제 개발 작업에 착수할 때` 또는 사용자가 `개발 계획`이나 `차수별 실행안`을 요청했을 때 작성한다.
- 반대로 단순 질의응답, 설명, 코드 읽기, 조사, 리뷰, 문서 정리, 현황 보고만 있는 요청에는 백로그 문서를 자동으로 만들지 않는다.
- 백로그 문서는 항상 `personal_space/YYYY-MM-DD/N-적당한이름_BACKLOG.md` 경로에 작성한다.
- `N-`은 해당 날짜 디렉터리 안에서의 생성 순번이다.
- 같은 날짜에 첫 백로그는 `1-...`, 두 번째는 `2-...`, 세 번째는 `3-...`로 만든다.
- 완료한 백로그는 기존 번호를 유지한 채 파일명에 `(완)`을 붙여 보관한다.
- 개발 계획은 자유 서술형 메모가 아니라 `차수` 단위 backlog 형식으로 작성한다.
- 각 차수는 "AI가 한 번의 프롬프트로 끝까지 수행할 수 있는 정도"의 분량으로 자른다.
- 각 차수에는 최소한 아래 항목이 있어야 한다.
  - `작업내용`
  - `논의 필요`
  - `선택지`
  - `추천`
  - `사용자 방향`
- `사용자 방향`은 기본적으로 빈칸으로 둔다.
- `사용자 방향`이 비어 있으면 별도 사용자 결정이 없는 상태로 해석하고, 구현은 `추천` 기준으로 진행한다.

## 필요 시 지연 로딩

요청 목적과 직접 관련된 파일만 추가로 읽는다. 다만 작업 시작 시 필수 파일과 `retrospective.md`는 예외로 본다.

- 설계 / 컴포넌트 작업: `.claude/skills/design-workflow.md`, `.claude/skills/component-patterns.md`, `.claude/skills/design-eye.md`
- Next.js / App Router 작업: `.claude/skills/nextjs-patterns.md`
- Expo / React Native 작업: `.claude/skills/expo-patterns.md`
- 모노레포 / 패키지 경계 작업: `.claude/skills/monorepo-patterns.md`
- git / commit / push / PR 작업: `.claude/skills/git-pr-workflow.md`
- 구현 전후 점검: `.claude/skills/self-improve-checklist.md`
- 회고 / 개선 작업: `.claude/skills/retrospective.md`
- 재발 방지 참고: `.claude/memory/anti-patterns.md`, `.claude/memory/bug-patterns.md`
- 과거 회고 참고: `.claude/memory/retrospective-log.md`
- 역할 분리가 필요한 경우: `.claude/agents/*.md`

## 로딩 우선순위

1. 사용자의 현재 요청
2. `AGENTS.md`
3. `CLAUDE.md`
4. `CLAUDE.local.md`
5. `.claude/skills/*`, `.claude/memory/*`, `.claude/agents/*`
6. `.codex/project-context/*`

## 구현 원칙

- 값이 진실의 원천(source of truth)이 되도록 설계한다.
- API 계약의 진실의 원천은 `packages/api-contract`다. 앱별 로컬 타입이 별도로 진화하지 않게 유지한다.
- 모바일과 웹이 함께 쓰는 기능은 `apps/web/src/app/api` 같은 공용 HTTP 경계와 `packages/api-contract`를 통해 노출한다.
- 웹 전용 사적 흐름만 `Server Actions`를 사용한다.
- `apps/mobile`은 `apps/web/src/server`를 import하지 않는다.
- `packages/domain`, `packages/utils`, `packages/design-tokens`는 런타임 독립성을 유지한다.
- raw 문자열을 분기 곳곳에 흩뿌리지 않는다. 같은 의미를 두 번 이상 비교하거나 기록해야 하면 상수 객체로 승격한다.
- 반대로 한 파일 내부 구현에서만 잠깐 쓰이고 재사용 경계도 없는 값까지 전부 상수화하지 않는다.
- TypeScript `enum`은 런타임 산출물이 실제로 필요한 경우에만 사용한다. 기본값은 `as const` 객체와 literal union 조합이다.
- Single Responsibility Principle을 지킨다. 정책 선언, 상태 해석, 부수효과 실행, UI 렌더링을 분리한다.
- 조건 분기를 줄인다. 깊은 `if` 중첩보다 의미 있는 상태 변수, 조기 반환, 상태별 결정 함수, 매핑 테이블, 작은 보조 함수나 컴포넌트 분리를 우선한다.
- 과한 추상화를 피한다. 아직 하나의 앱에서만 쓰이는 것을 섣불리 `packages/*`로 올리지 않는다.
- 로그 메시지, 오류 메시지, 실패 이유 문자열은 특별한 외부 계약이 없는 한 한국어를 기본으로 한다.

## 아키텍처 경계 원칙

- `apps/web/src/app`은 라우팅, layout, metadata, route handler, server boundary를 담당한다.
- `apps/web/src/features`는 웹 유스케이스 단위 UI와 orchestration을 담당한다.
- `apps/web/src/components`는 도메인 비의존 웹 공용 UI를 담당한다.
- `apps/web/src/server`는 server-only 구현을 담당한다.
- `apps/mobile/app`은 Expo Router 경계를 담당한다.
- `apps/mobile/src/features`는 모바일 유스케이스 단위 UI와 상태를 담당한다.
- `apps/mobile/src/services`는 공용 API 소비, 재시도, 토큰 저장, 모바일 orchestration을 담당한다.
- `packages/*`는 런타임 독립 공유 자산만 둔다.
- `apps/web/src/app`은 route shell로서 `features`, `components`, `server`의 진입점을 사용할 수 있다.
- `apps/web/src/components`는 `features`나 `app`에 의존하지 않는다.
- `packages/*`는 `apps/*`를 import하지 않는다.
- `apps/mobile`은 `apps/web/src/server`를 import하지 않는다.
- import cycle을 피하려고 `packages/*`를 임시 쓰레기통처럼 사용하지 않는다.

## 스타일링 원칙

- 기본 Tailwind 유틸리티(`p-4`, `gap-6`, `rounded-lg`, `text-sm` 등) 사용을 허용한다.
- 반복 의미가 생기는 색상, 여백, 반경, 그림자만 점진적으로 토큰화한다.
- 기본 Tailwind scale을 비활성화하기 위해 `global.css`에서 theme를 덮어쓰는 방식은 사용하지 않는다.
- `globals.css` 또는 전역 스타일 파일은 토큰, 최소 reset, 서드파티 전용 스타일만 다룬다.
- 화면 전용 스타일, 특정 기능 전용 스타일, 임시 수정용 스타일을 전역 CSS에 추가하지 않는다.
- Tailwind 클래스는 가능한 한 정적 문자열로 작성한다.
- ``className={`p-${size}`}``나 `bg-${color}-500` 같은 동적 Tailwind class 생성은 금지한다.
- arbitrary value는 "기존 scale이나 토큰으로 표현할 수 없고, 반복 가능성이 분명할 때만" 제한적으로 사용한다.
- 반복되는 스타일 패턴은 `className` 복붙으로 해결하지 말고 공통 UI 컴포넌트 또는 variant로 승격한다.
- `div`, `button` 등에 즉석 Tailwind 조합을 추가하기 전에, 기존 디자인 시스템 컴포넌트 재사용 가능 여부를 먼저 확인한다.

## 스타일 이슈 디버깅 규칙

- 스타일이 적용되지 않을 때는 아래 순서를 반드시 따른다.
  1. DOM에 해당 `className`이 실제로 붙어 있는지 확인
  2. 해당 Tailwind 유틸리티 CSS가 실제로 생성되었는지 확인
  3. 다른 CSS 선택자 또는 전역 스타일이 덮어쓰는지 확인
  4. `padding`, `margin`, `height`, `overflow`, `flex`, `box-sizing` 때문에 체감상 안 보이는지 확인
- 위 확인 없이 `!important`, 인라인 스타일, 불필요한 래퍼 추가로 문제를 덮지 않는다.

## 로컬 검증 / E2E 원칙

- 실제 브라우저 검증이 필요하면 Playwright를 우선 사용한다.
- UI 흐름 디버깅은 가능하면 headed 모드로 재현한다.
- 로컬 서버나 seed 스크립트가 필요한 경우 먼저 현재 저장소에 실제 명령과 스크립트가 있는지 확인한다.
- 실행 방법이 아직 없으면 임의로 꾸며내지 말고 무엇이 비어 있는지 먼저 공유한다.
- 스냅샷이나 스크린샷만 보고 검증 완료로 처리하지 않는다. 상태 변화와 네트워크, 콘솔 오류까지 함께 본다.
- 반복되는 로컬 검증 절차가 생기면 `.codex/skills` 또는 `.codex/guides`로 승격하는 것을 우선 검토한다.

## 코드 리뷰 원칙

- 목표는 "어떤 리뷰가 와도 상태 전이, source of truth, 실패 경계, 사용자 영향까지 근거로 설명하고 방어할 수 있는 코드"를 만드는 것이다.
- 리뷰 대응이 목적이 아니라, 리뷰어가 문제 삼을 수 있는 상태 오염 가능성 자체를 먼저 제거하는 방어적 리팩토링을 우선한다.
- 사용자가 코드리뷰를 요청하면 `critical 3개 이상`, `major 3개 이상`, `minor 3개 이상`의 검토 포인트를 찾는 것을 기본 목표로 삼고, 실제 이슈가 그 수에 도달할 때까지 범위를 넓혀 탐색한다.
- 상태 정합성 중심으로 코드를 검토한다.
- 정상 흐름만 보지 말고 값 없음, decode 실패, null, undefined, empty, 이전 값 존재, 중복 호출, 재시도, 부분 실패를 먼저 의심한다.
- 먼저 source of truth를 식별한다. 원본 상태와 파생 상태를 구분한다.
- `set`, `save`, `write`, `add` 로직을 보면 `delete`, `clear`, `remove`, `reset` 로직도 반드시 함께 확인한다.
- 서버, 클라이언트, SSR, route handler, shared package가 같은 개념을 다루면 생성, 갱신, 삭제, fallback 규칙이 같은지 비교한다.
- 캐시, 파생값, 메모이즈, 저장소, 폼 상태처럼 원본을 복제하는 구조는 원본 변경 시 함께 갱신되거나 폐기되는지 확인한다.
- 비동기 로직은 항상 순서 뒤집힘과 레이스를 의심한다.
- 리뷰 기준은 "맞아 보이는가"가 아니라 "거짓 상태가 남을 수 있는가"다.
- 리뷰 코멘트는 "어떤 불변식이 깨지는가", "어떤 사용자 영향이 생기는가", "왜 그런 버그가 생기는가"를 함께 설명한다.

## 회고 / 규칙 승격

- 같은 영역 수정이 세 번 이상 반복되거나 같은 유형의 리뷰 코멘트가 반복되면 회고를 남긴다.
- 일반 안티패턴은 `.claude/memory/anti-patterns.md`, 버그 재발 패턴은 `.claude/memory/bug-patterns.md`, 작업 회고는 `.claude/memory/retrospective-log.md`에 기록한다.
- 반복 가능한 절차나 저장소 전용 함정이 드러나면 메모만 남기지 말고 `.codex/skills/<skill>/SKILL.md` 형태의 로컬 스킬로 승격하는 것을 우선 검토한다.

## 작업 중 공유

- 어떤 `.claude` 파일을 읽었는지 짧게 공유한다.
- 가이드와 실제 코드가 충돌하면 코드베이스 현실에 맞춰 적용하고 근거를 설명한다.
- 탐색, 구현, 검증을 병렬화할 수 있거나 범위가 둘 이상으로 나뉘면 멀티 에이전트 또는 병렬 도구 사용을 우선 검토한다.
- 다중 에이전트 동시 작업 중 갑자기 파일 수정이 보이면 다른 에이전트 변경일 수 있다고 보고 먼저 존중한다.
- 본인 작업과 직접 관련 없는 변경은 함부로 되돌리지 말고, 소유 범위를 나눠 각자 변경만 빠르게 마감한다.
- 본인 작업이 끝났으면 자기 소유 파일만 add 해서 빠르게 커밋하고, 이후 검증과 후속 수정을 이어간다.
- 갑작스러운 파일 변경이 보여도 먼저 다른 에이전트의 작업일 가능성을 의심하고, 자기 범위를 벗어난 변경은 존중한 채 공유와 조정으로 해결한다.
