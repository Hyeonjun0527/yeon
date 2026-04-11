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
- **`apps/web`에서 서버 데이터 fetch는 반드시 TanStack Query(`useQuery`, `useMutation`)를 사용한다.** 수동 `fetch + useState + useEffect` 조합은 금지한다. 이미 존재하는 수동 fetch 코드를 수정하는 경우 함께 마이그레이션한다.

### Completion Criteria

- 코드 수정 후에는 변경 범위에 맞는 lint, format, typecheck, test, build를 가능한 범위에서 실행한다.
- 검증 순서는 `study-platform-client`와 같은 흐름을 유지한다.
  1. lint fix
  2. format fix
  3. typecheck
  4. `pnpm --filter @yeon/web build` (Next.js 빌드) — **반드시 실행**
  5. 필요 시 test
- **커밋 전 untracked 파일 확인 필수**: `git status --short | grep "^??"` 로 미커밋 파일을 확인한다. 커밋할 파일이 `??` 파일을 import하면 로컬 타입체크는 통과하지만 Docker 빌드가 실패한다. import 관계가 있는 파일은 반드시 함께 커밋한다.
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

### 배포 도메인

- `yeon.world` — 운영 서버 (`main` 브랜치 기준 배포)
- `dev.yeon.world` — 개발용 배포 서버 (`develop` 브랜치 기준 배포)

### Worktree 운영 정책

- 이 저장소는 최대 3개의 worktree를 사용한다.
  - **A**: 기존 레포 (메인 작업 디렉터리)
  - **B**: 워킹트리 2 (사용자가 경로를 지정)
  - **C**: 워킹트리 3 (사용자가 경로를 지정)
- 각 에이전트는 사용자가 명시적으로 A, B, C 중 하나를 지정하면 해당 worktree에서만 작업한다.
- 에이전트는 자의적으로 worktree를 새로 만들거나, 지정되지 않은 worktree로 이동하지 않는다.
- 각 작업은 `origin/develop`에서 브랜치를 새로 만들어 시작한다.
- 작업 시작 전 반드시 `git fetch origin` → `git rebase origin/develop`을 수행하여 항상 최신 develop 기준으로 작업한다.

### Worktree 병렬 작업 안전 규칙 (절대 강제)

아래 규칙은 두 개 이상의 워크트리에서 동시에 작업할 때 변경사항 유실을 원천 차단하기 위한 것이다. 예외 없이 적용한다.

#### 금지 사항

1. **같은 브랜치를 두 워크트리에서 동시에 체크아웃하지 않는다.** git index가 공유되어 커밋 내용이 꼬인다.
2. **어떤 워크트리에서도 `develop` 브랜치에 직접 커밋하지 않는다.** develop은 PR 머지로만 변경된다.
3. **rebase 없이 push하지 않는다.** 다른 워크트리의 PR이 먼저 머지되었을 수 있다.
4. **`--force-push`는 금지한다.** 다른 워크트리에서 참조 중인 커밋이 사라질 수 있다.

#### 필수 절차

1. **브랜치 생성 시점**: 각 워크트리는 반드시 `origin/develop`에서 독립 브랜치를 만든다. 브랜치 이름이 겹치지 않도록 한다.
2. **작업 시작 전**: `git fetch origin && git rebase origin/develop` — 다른 워크트리의 머지 결과를 반영한다.
3. **push 직전**: `git fetch origin && git rebase origin/develop` — 작업 중 다른 워크트리가 먼저 머지했을 수 있으므로 다시 한번 rebase한다.
4. **PR 머지 직전**: GitHub에서 충돌이 없는지 확인한다. 충돌이 있으면 로컬에서 rebase → force-push(`--force-with-lease`만 허용) → 재확인 후 머지한다.
5. **상대 워크트리 PR 머지 직후**: 아직 작업 중인 워크트리에서 즉시 `git fetch origin && git rebase origin/develop`을 수행하여 기준점을 갱신한다.

#### 머지 순서 규칙

- 두 워크트리가 **같은 파일을 수정**한 경우, 변경 범위가 작은 PR을 먼저 머지한다.
- 먼저 머지된 후, 나머지 워크트리에서 rebase하여 충돌을 해결하고 push한다.
- 두 워크트리가 **서로 다른 파일만 수정**한 경우, 순서 무관하게 머지해도 안전하다.

#### 작업 범위 분리 원칙

- 병렬 작업을 시작하기 전에 각 워크트리의 작업 범위를 **파일 또는 디렉토리 단위로 분리**한다.
- 부득이하게 같은 파일을 수정해야 하면, 수정 영역(함수, 섹션)이 겹치지 않도록 사전에 합의한다.
- 범위가 겹칠 수밖에 없는 작업은 병렬로 진행하지 않고 순차 처리한다.

### 브랜치·커밋·머지 절대 원칙

- **모든 작업은 반드시 `origin/develop`에서 새 브랜치를 만들어 시작한다.** 아무리 사소한 수정이라도 예외 없다.
- 브랜치 생성 명령어: `git switch -c <type>/<name> origin/develop` (예: `git switch -c feat/add-upload origin/develop`)
- **모든 작업은 반드시 커밋 → push → PR → develop 머지까지 완료한다.** 아무리 작은 변경이라도 로컬에만 두지 않는다.
- 이 두 원칙이 깨지면 여러 에이전트가 같은 기준(`origin/develop`)을 보고 작업할 수 없다. 절대 위반하지 않는다.
- 개발 병목을 최소화하기 위해 중간에 멈추지 않는다.
- 다른 에이전트가 이미 작업한 브랜치가 있으면 그 위에 올려서 PR/머지까지 완료한다.
- 상세 절차는 `AGENTS.md`의 "개발 완료 필수 원칙" 섹션을 따른다.

## Project Overview

`yeon`은 **20~30대 성인 대상 부트캠프/프로그램을 운영하는 교육기관용 플랫폼**이다.
코딩 부트캠프, 디자인 스쿨, 데이터 분석 과정 등 성인 교육 프로그램 맥락이며, 학교·초중고 학원이 아니다.

### 핵심 기능

- **멘토링 녹음 + AI 요약**: 1:1 상담, 멘토링, 수업 기록을 녹음하고 AI로 자동 전사·요약
- **수강생 관리**: 스페이스(기수/프로그램) 단위로 수강생을 그룹핑하고 관리
- **스페이스**: 사용자가 직접 생성하는 관리 단위 (예: "백엔드 3기", "디자인 스쿨 2026 상반기")

### 용어 규칙

이 프로젝트에서는 부트캠프 맥락에 맞는 용어를 사용한다.

| 사용하지 않는 표현 | 올바른 표현 | 비고 |
|---|---|---|
| 학생 | 수강생 (member) | 20~30대 성인 |
| 학년 | 트랙/과정 (track) | 백엔드, 프론트엔드, 데이터 등 |
| 보호자/학부모 | 해당 없음 | 성인 대상, 보호자 개념 없음 |
| 반 (수학A반) | 스페이스 (space) | 기수, 프로그램, 코호트 등 사용자 정의 단위 |
| 년도 탭 | 스페이스 탭 | 사용자가 직접 생성·관리 |
| 강사 | 멘토/운영자 | |
| 상담 | 멘토링/1:1 상담 | |

### 대상 사용자

- **운영자**: 부트캠프/프로그램 운영 담당자
- **멘토**: 수강생과 1:1 멘토링을 진행하는 교육자
- **수강생**: 20~30대 성인 (보호자 개념 없음)

### 모노레포 구조

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

0. **코드를 작성하기 전에 현대적인 디자인을 먼저 구상한다.** 레이아웃, 위계, 여백, 색상, 상태 전이를 머릿속에서 그린 뒤 코드로 옮긴다. 섣불리 코딩부터 시작하지 않는다.
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

| 대상           | 경고 기준 | 분리 방향                                  |
| -------------- | --------- | ------------------------------------------ |
| React 컴포넌트 | 300줄     | 커스텀 훅 추출 또는 하위 컴포넌트 분리     |
| 커스텀 훅      | 200줄     | 보조 함수를 utils로 분리하거나 훅을 쪼갬   |
| 서버 서비스    | 500줄     | 엔진·리포지토리·오케스트레이터로 역할 분리 |
| CSS 모듈       | 600줄     | 섹션 주석 정리, 미사용 클래스 정기 제거    |

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

## 코드 일관성 원칙

**목표: 누가 작성했는지 알 수 없는 코드. 판단 기준이 파일마다 달라지지 않는 코드.**

접근 방식이 여럿인 상황에서는 이 문서가 정한 방식을 따른다. 개인 선호로 혼용하지 않는다.

### 명명 규칙

| 대상 | 규칙 | 예 |
|---|---|---|
| 파일명 | kebab-case | `use-records.ts`, `student-list-screen.tsx` |
| 컴포넌트 | PascalCase | `StudentCard`, `EmptyState` |
| 훅 | camelCase, `use` 접두사 | `useRecords`, `useMemberList` |
| 상수 | UPPER_SNAKE_CASE | `POLL_INTERVAL_MS` |
| 타입/인터페이스 | PascalCase | `HomeViewState`, `Member` |
| 불리언 변수 | `is`/`has`/`can` 접두사 | `isLoading`, `hasError`, `canSubmit` |
| 이벤트 핸들러 | `handle` 접두사 | `handleSelectRecord`, `handleStartRecording` |

### 컴포넌트 내부 작성 순서

```ts
// 1. context / 외부 훅
// 2. 로컬 useState
// 3. ref
// 4. 파생값 (useMemo, 인라인 계산)
// 5. useEffect
// 6. 이벤트 핸들러 (useCallback)
// 7. return JSX
```

이 순서를 어기면 읽는 사람이 흐름을 역추적해야 한다.

### 데이터 fetch 일관성

- 서버 데이터: 무조건 `useQuery` / `useMutation` (수동 fetch + useEffect 조합 금지)
- `useEffect` 안에서 `fetch()` 직접 호출 금지 — ESLint로 강제
- `useEffect` async 콜백 금지 — ESLint로 강제

### 렌더 상태 일관성

- 페이지/피처 단위로 `ViewState` discriminated union 하나를 정의한다
- 렌더는 오직 `viewState.kind` 하나만 보고 분기한다
- boolean 여러 개 직접 조합 금지 — ESLint로 부분 강제

### 에러 처리 일관성

- API 에러 메시지는 한국어로 작성한다
- 컴포넌트에서 `try/catch`로 직접 에러를 삼키지 않는다. `useQuery`의 `error` 상태나 `ViewState.kind === 'error'`로 올린다
- 에러 바운더리는 route 레벨에 두고, 피처 내부에서 중복 선언하지 않는다

### 타입 단언 (`as`) 규칙

- `as` 단언은 타입 시스템이 구조적으로 보장하지 못하는 경우에만 사용한다
- `as any`는 금지. 어쩔 수 없는 경우 `as unknown as T`로 명시적으로 표현하고 주석으로 이유를 단다
- 렌더 조건이 이미 타입을 좁히는 상황에서 하는 cast(`viewState.kind as 'processing' | 'ready'`)는 허용한다

### 커밋 원칙

MVP 속도 우선. 커밋 단위는 크게 가도 된다.

- 커밋 메시지는 한국어로 작성한다. 접두사(`feat:`, `fix:` 등)는 쓰면 좋지만 강제하지 않는다
- feat/fix/refactor/docs를 한 커밋에 섞어도 된다. 개발 흐름을 끊지 않는다
- 검증(lint → typecheck → build) 없이 커밋하지 않는다 — 이것만 지킨다

## Empty State 렌더 원칙

"주의해서 짠다"로는 empty flash를 막을 수 없다.
**잘못된 상태 조합 자체를 표현할 수 없게 구조를 바꿔야 한다.**

`loading=false && data=[]`처럼 "미확정인지 진짜 빈 결과인지 알 수 없는" 조합이 코드상에 존재하는 한 깜빡임 가능성은 살아있다.

### 해결 원칙: 단일 ViewState discriminated union

페이지/피처마다 `ViewState` 타입 하나를 정의하고, 렌더는 오직 그것만 본다.

```ts
type ViewState<T> =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'empty' }
  | { kind: 'ready'; data: T }
```

렌더에서 boolean 여러 개를 직접 조합하지 않는다. 반드시 변환 함수 하나를 거친다.

```ts
// 변환 함수 — 한 군데에서만 상태를 조립
function toViewState<T>(query: UseQueryResult<T[]>): ViewState<T[]> {
  if (query.isPending) return { kind: 'loading' }
  if (query.isError)   return { kind: 'error', message: '불러오기에 실패했습니다.' }
  if (!query.data || query.data.length === 0) return { kind: 'empty' }
  return { kind: 'ready', data: query.data }
}
```

```tsx
// 렌더 — kind 하나만 본다
const state = toViewState(membersQuery)

switch (state.kind) {
  case 'loading': return <LoadingScreen />
  case 'error':   return <ErrorScreen message={state.message} />
  case 'empty':   return <EmptyScreen />
  case 'ready':   return <StudentList items={state.data} />
  default: {
    const _: never = state   // exhaustive check
    return _
  }
}
```

### 금지 패턴

```ts
// ❌ boolean 조합 직접 렌더 — 어느 조합에서 empty가 새는지 추적 불가
if (!loading && data.length === 0) return <EmptyState />

// ❌ data ?? [] 후 바로 empty 판정 — 미확정과 빈 결과를 구분 못 함
const members = query.data ?? []
if (!loading && members.length === 0) return <EmptyState />

// ❌ phase/status 초기값을 "empty"로 설정 — 첫 렌더에서 조건 통과 위험
const [phase, setPhase] = useState<Phase>("empty")
```

### 여러 query가 있을 때

```ts
function toMembersViewState(
  spacesQuery: UseQueryResult<{ spaces: Space[] }>,
  membersQuery: UseQueryResult<{ members: Member[] }>,
): ViewState<Member[]> {
  // 둘 중 하나라도 pending이면 loading
  if (spacesQuery.isPending || membersQuery.isPending) return { kind: 'loading' }
  if (spacesQuery.isError)  return { kind: 'error', message: '공간 정보를 불러오지 못했습니다.' }
  if (membersQuery.isError) return { kind: 'error', message: '수강생 정보를 불러오지 못했습니다.' }
  const members = membersQuery.data?.members ?? []
  if (members.length === 0) return { kind: 'empty' }
  return { kind: 'ready', data: members }
}
```

TanStack Query의 `enabled` 의존 체인으로 waterfall을 위임하면 변환 함수가 더 단순해진다.

```ts
const selectedSpaceId = userSelectedId ?? spacesData?.spaces[0]?.id ?? null
const membersQuery = useQuery({
  queryKey: ['members', selectedSpaceId],
  queryFn:  () => fetchMembers(selectedSpaceId!),
  enabled:  !!selectedSpaceId,  // spaces 확정 전까지 자동 pending 유지
})
```

### 요약

| 패턴 | 안전도 |
|---|---|
| boolean 여러 개 직접 조합 렌더 | 위험 — 언제든 새로운 조합 실수 가능 |
| `data ?? []` 후 empty 판정 | 위험 — 미확정/빈 결과 구분 불가 |
| ViewState discriminated union + 변환 함수 | 안전 — 잘못된 상태 조합을 코드로 표현할 수 없음 |

## Review Lens

- 상태 정합성
- source of truth 위치
- server/client 경계
- web/mobile 재사용 경계
- API 계약 drift 가능성
- cleanup 누락과 stale derived state
- partial update와 race condition

코드가 "그럴듯해 보이는지"보다 "거짓 상태가 남을 수 있는지"를 기준으로 검토한다.
