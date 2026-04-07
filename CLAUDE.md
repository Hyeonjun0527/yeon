# CLAUDE.md

이 파일은 이 저장소에서 작업하는 AI 코딩 에이전트를 위한 공용 구현 기준 문서다.
개인 작업 습관과 세부 리뷰 기준은 `CLAUDE.local.md`가 보완한다.

## Core Rules

### Implementation Principles

- 파일 위치와 API 계약이 확인되면 탐색을 길게 끌지 말고 구현을 시작한다.
- 존재하지 않는 API, route handler, package export를 추측해서 만들지 않는다.
- 같은 파일을 여러 번 왕복 수정하지 말고, 발견한 문제는 가능한 한 한 번에 정리하는 것을 기본 원칙으로 삼는다.
- 루트 `package.json`에 없는 스크립트는 있다고 가정하지 않는다. 항상 실제 `package.json`과 해당 workspace의 `package.json`을 먼저 확인한다.
- 브랜치, 커밋, push, PR 운영은 `AGENTS.md`와 `.claude/skills/git-pr-workflow.md`를 따른다.

### Completion Criteria

- 코드 수정 후에는 변경 범위에 맞는 lint, format, typecheck, test, build를 가능한 범위에서 실행한다.
- 검증 순서는 `study-platform-client`와 같은 흐름을 유지한다.
  1. lint fix
  2. format fix
  3. typecheck
  4. `pnpm --filter @yeon/web build` (Next.js 빌드) — **반드시 실행**
  5. 필요 시 test
- **CSS Modules 제약**: `.module.css` 파일 안에서 `*`, `html`, `body` 같은 전역 셀렉터를 단독 사용할 수 없다. 반드시 로컬 클래스(`.page *` 등)로 스코프해야 한다. Turbopack은 "Selector is not pure" 에러로 빌드를 거부한다.
- 현재 workspace에 스크립트가 아직 정의되지 않았다면 없는 척 채우지 말고, 검증이 불가능한 이유를 명시한다.
- 문서 전용 변경이라면 최소한 `git diff --check` 수준의 형식 검증은 수행한다.

### Styling Rules

- 이 저장소는 기본 Tailwind 유틸리티 사용을 허용한다.
- `global.css` 또는 `globals.css`에서 기본 Tailwind spacing, radius, shadow, font scale을 막는 식의 설정은 하지 않는다.
- 토큰은 의미가 반복되기 시작할 때 추가한다. 기본 scale을 대체하기 위해 억지로 토큰을 강제하지 않는다.
- 기존 scale로 충분하면 `p-4`, `text-sm`, `rounded-lg`, `gap-6` 같은 기본 클래스를 그대로 사용한다.
- dynamic Tailwind class 생성은 금지한다.
- arbitrary value는 기존 scale이나 토큰으로 표현되지 않고 반복 가능성이 명확할 때만 사용한다.

## Repository Operating Model

- 이 저장소는 `pnpm` workspace monorepo다.
- `study-platform-client`와 동일하게 `develop`을 develop 서버 기준 통합 브랜치, `main`을 운영 브랜치로 둔다.
- 2026-04-06 기준 원격에는 `origin/main`만 있으므로, 첫 PR 흐름에 들어가기 전에 `develop`을 `main`에서 생성해 push하는 것을 전제로 한다.

### Worktree 운영 정책

- 이 저장소는 최대 3개의 worktree를 사용한다.
  - **A**: 기존 레포 (메인 작업 디렉터리)
  - **B**: 워킹트리 2 (사용자가 경로를 지정)
  - **C**: 워킹트리 3 (사용자가 경로를 지정)
- 각 에이전트는 사용자가 명시적으로 A, B, C 중 하나를 지정하면 해당 worktree에서만 작업한다.
- 에이전트는 자의적으로 worktree를 새로 만들거나, 지정되지 않은 worktree로 이동하지 않는다.
- 각 작업은 `origin/develop`에서 브랜치를 새로 만들어 시작한다.
- 작업 시작 전 반드시 `git fetch origin` → `git rebase origin/develop`을 수행하여 항상 최신 develop 기준으로 작업한다.

### 브랜치·커밋·머지 절대 원칙

- **모든 작업은 반드시 `origin/develop`에서 새 브랜치를 만들어 시작한다.** 아무리 사소한 수정이라도 예외 없다.
- 브랜치 생성 명령어: `git switch -c <type>/<name> origin/develop` (예: `git switch -c feat/add-upload origin/develop`)
- **모든 작업은 반드시 커밋 → push → PR → develop 머지까지 완료한다.** 아무리 작은 변경이라도 로컬에만 두지 않는다.
- 이 두 원칙이 깨지면 여러 에이전트가 같은 기준(`origin/develop`)을 보고 작업할 수 없다. 절대 위반하지 않는다.
- 개발 병목을 최소화하기 위해 중간에 멈추지 않는다.
- 다른 에이전트가 이미 작업한 브랜치가 있으면 그 위에 올려서 PR/머지까지 완료한다.
- 상세 절차는 `AGENTS.md`의 "개발 완료 필수 원칙" 섹션을 따른다.

## Project Overview

`yeon`은 Next.js 웹 앱과 향후 Expo 모바일 앱을 함께 가져가는 모노레포다.

- `apps/web`은 Next.js 앱과 웹 전용 UI, 웹 전용 orchestration을 담당한다.
- `apps/mobile`은 Expo 앱 자리이며 공용 HTTP API만 소비한다.
- `packages/*`는 런타임에 독립적인 계약, 순수 도메인 로직, 토큰, 유틸리티를 담는다.
- 별도 `apps/api`는 아직 두지 않는다.
- 공용 React UI 패키지도 아직 만들지 않는다.

## Current Command Reality

현재 루트 `package.json`에는 workspace 메타데이터만 있고, 실행 스크립트는 아직 충분히 부트스트랩되지 않았다.

- 명령을 실행하기 전 항상 해당 workspace의 `package.json`을 먼저 확인한다.
- 스크립트가 생긴 뒤에는 `pnpm --filter <workspace> <script>` 또는 `turbo run <script> --filter=<workspace>` 형태를 우선 사용한다.
- 루트 스크립트가 없는데 있다고 가정해 `pnpm lint`, `pnpm dev`를 무조건 실행하지 않는다.

## Architecture

### Workspace Boundaries

- `apps/web`
  - Next.js App Router 앱
  - 웹 전용 UI와 웹 전용 orchestration 담당
  - public HTTP endpoint는 `src/app/api` 아래에 둔다
  - web-private flow에 한해서만 `Server Actions` 사용 가능
  - server-only 구현은 `src/server`에 둔다

- `apps/mobile`
  - Expo 앱
  - `apps/web/src/server`를 import하지 않는다
  - 웹과 공용으로 써야 하는 기능은 public HTTP API로만 접근한다

- `packages/api-contract`
  - request / response schema와 runtime validation 계약의 source of truth
  - web route handler와 mobile/web client 모두 이 계약을 기준으로 맞춘다

- `packages/api-client`
  - typed fetch / client wrapper
  - `api-contract`에는 의존할 수 있지만 app 내부 구현에는 의존하지 않는다

- `packages/domain`
  - 순수 비즈니스 개념만 둔다
  - DB, auth session, filesystem, framework runtime 코드는 넣지 않는다

- `packages/design-tokens`
  - 색상, 여백, 타이포그래피 같은 cross-platform design constant를 둔다
  - React 컴포넌트는 아직 넣지 않는다

- `packages/utils`
  - 작은 순수 헬퍼만 둔다
  - 특정 앱이나 런타임 가정이 들어간 코드는 두지 않는다

### Dependency Direction

- `apps/web/src/app`은 route shell로서 `apps/web/src/features`, `apps/web/src/components`, `apps/web/src/server`의 진입점을 사용할 수 있다.
- `apps/web/src/features`는 `apps/web/src/components`를 사용할 수 있다.
- `apps/web/src/components`는 `apps/web/src/features`나 `apps/web/src/app`에 의존하지 않는다.
- `apps/mobile/app`은 `apps/mobile/src/features`와 `apps/mobile/src/components`를 사용할 수 있다.
- `apps/mobile/src/features`는 `apps/mobile/src/components`를 사용할 수 있다.
- `apps/*`는 `packages/*`를 import할 수 있다.
- `packages/*`는 `apps/*`를 import하지 않는다.

### Folder Direction

웹은 아래 방향을 기본으로 삼는다.

```txt
apps/web/src/
  app/          # routes, layouts, route handlers
  components/   # reusable web UI
  features/     # feature-oriented slices
  server/       # actions, services, repositories, validators
  lib/          # app-local helpers
  types/        # app-local types
```

모바일은 아래 방향을 기본으로 삼는다.

```txt
apps/mobile/
  app/              # Expo Router routes
  src/components/   # reusable native UI
  src/features/     # feature-oriented slices
  src/services/     # API consumption and orchestration
  src/providers/    # app providers
  src/theme/        # token-to-native mapping
```

## UI / UX Workflow

UI 작업은 아래 순서를 기본값으로 사용한다.

1. `ui-ux-pro-max`로 디자인 시스템과 UX 기준을 먼저 잡는다.
2. 21st 도구로 영감 수집 또는 컴포넌트 생성을 진행한다.
3. `.claude/skills/design-eye.md` 기준으로 AI 티, 위계, CTA, 레이아웃을 다시 검토한다.
4. 생성된 결과물을 이 저장소 구조와 스타일링 원칙에 맞게 정리한다.

생성 도구가 만든 코드를 그대로 신뢰하지 않는다. 경계, 접근성, 상태 처리, import 구조는 직접 검증한다.

## Implementation Guardrails

- 공용 기능이 필요한데 web-only `Server Actions`로 먼저 닫아버리지 않는다.
- `apps/mobile`에서 필요한 기능이라면 처음부터 public HTTP API + shared contract로 설계한다.
- `packages/*`는 앱 내부 구현 상세에 의존하지 않는다.
- 아직 하나의 앱에서만 쓰는 UI나 로직은 성급하게 shared package로 추출하지 않는다.
- design token과 domain model은 섞지 않는다.
- 반복되는 값은 source of truth로 승격하되, 한 파일 내부의 일회성 구현 디테일까지 과잉 추상화하지 않는다.

## Feature Directory Structure

feature 디렉토리는 아래 구조를 표준으로 삼는다.

```txt
features/<feature-name>/
  <feature-name>.tsx          # 루트 조합 컴포넌트 (훅 호출 → 컴포넌트 연결)
  <feature-name>.module.css   # CSS Modules (공유 변수·미디어 쿼리 포함)
  types.ts                    # feature 전용 타입
  constants.ts                # feature 전용 상수
  utils.ts(x)                 # 순수 유틸리티 함수
  hooks/
    index.ts                  # 배럴 익스포트
    use-<name>.ts             # 커스텀 훅 (하나의 관심사만 담당)
  components/
    index.ts                  # 배럴 익스포트
    <component-name>.tsx      # 프레젠테이션 컴포넌트
```

### 파일 크기 경고 기준

아래 기준을 넘기면 분리를 검토한다. 금지가 아니라 경고다.

| 대상 | 경고 기준 | 분리 방향 |
|------|-----------|-----------|
| React 컴포넌트 | 300줄 | 커스텀 훅 추출 또는 하위 컴포넌트 분리 |
| 커스텀 훅 | 200줄 | 보조 함수를 utils로 분리하거나 훅을 쪼갬 |
| 서버 서비스 | 500줄 | 엔진·리포지토리·오케스트레이터로 역할 분리 |
| CSS 모듈 | 600줄 | 섹션 주석 정리, 미사용 클래스 정기 제거 |

### 커스텀 훅 규칙

- 훅 하나는 하나의 관심사만 담당한다 (녹음, 오디오 재생, 목록 조회 등).
- 훅 파일 이름은 `use-<관심사>.ts` 형태로 짓는다.
- 루트 컴포넌트는 훅을 호출하고 반환값을 하위 컴포넌트에 prop으로 전달하는 조합 역할만 한다.
- 훅끼리 직접 import하지 않는다. 의존이 필요하면 루트에서 결과를 파라미터로 전달한다.

### 컴포넌트 분리 규칙

- 프레젠테이션 컴포넌트는 상태를 직접 관리하지 않고 props로만 받는다.
- CSS 모듈이 하나인 경우 모든 컴포넌트가 공유 CSS를 import해도 괜찮다. 공유 클래스·미디어 쿼리 교차 참조가 많으면 무리하게 분할하지 않는다.
- 컴포넌트 Props 인터페이스는 컴포넌트 파일 안에서 export한다.

### 서버 서비스 분리 규칙

- 서비스가 500줄을 넘기면 아래 3계층으로 나눈다.
  - **엔진** (`*-engine.ts`): 외부 API 호출, 복잡한 알고리즘 (전사, 분석 등)
  - **리포지토리** (`*-repository.ts`): DB CRUD, Row→DTO 매핑, 유효성 검사
  - **서비스** (`*-service.ts`): 비즈니스 오케스트레이션, 스케줄링, export 함수
- export 시그니처를 유지하면 route handler 변경 없이 분할할 수 있다.

## Review Lens

- 상태 정합성
- source of truth 위치
- server/client 경계
- web/mobile 재사용 경계
- API 계약 drift 가능성
- cleanup 누락과 stale derived state
- partial update와 race condition

코드가 "그럴듯해 보이는지"보다 "거짓 상태가 남을 수 있는지"를 기준으로 검토한다.
