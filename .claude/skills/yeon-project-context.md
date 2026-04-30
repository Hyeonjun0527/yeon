---
name: yeon-project-context
description: Yeon 프로젝트의 제품 맥락, 모노레포 경계, 구현 규칙, UI/DB/검증 세부 지식. AGENTS.md가 지시할 때만 선택적으로 읽는다.
user_invocable: true
---

# Yeon Project Context

이 스킬은 `AGENTS.md`에서 제거한 낮은 빈도 세부 지식의 SSOT다. 제품/아키텍처/구현 판단이 필요할 때만 읽는다.

## 1. 제품 맥락

`yeon`은 20~30대 성인 대상 부트캠프/프로그램 운영자를 위한 교육기관 플랫폼이다.

핵심 기능:

- 멘토링/1:1 상담/수업 기록 녹음, STT, AI 요약
- 수강생 관리
- 스페이스(기수/프로그램/코호트) 단위 그룹핑
- 카드/타자/상담 등 학습 보조 서비스

용어:

- `학생` 대신 `수강생(member)`.
- `학년` 대신 `트랙/과정(track)`.
- `반` 대신 `스페이스(space)`.
- `강사`는 맥락에 따라 `멘토/운영자`.
- 보호자/학부모 중심 표현은 성인 대상 제품에 부적합하다.

상담 기록 방향:

- 원문 텍스트는 신뢰의 source of truth다. 요약만 남기는 방향으로 후퇴하지 않는다.
- 기본 흐름: 녹음/업로드 → 고품질 STT → 원문 전체 열람 → 구조화 요약 → 원문 기반 AI 채팅 → 수강생별 누적 기록.
- AI 판단은 근거 없는 평가나 자동 확정이 아니라 사용자가 수정 가능한 추천/보조여야 한다.

## 2. 모노레포 경계

- `apps/web`: Next.js App Router, 웹 UI/orchestration, public API route, server-only 구현은 `src/server`.
- `apps/mobile`: Expo 앱. `apps/web/src/server` import 금지. 공용 HTTP API만 소비.
- `packages/api-contract`: request/response schema와 runtime validation 계약 SSOT.
- `packages/api-client`: typed fetch/client wrapper. 앱 내부 구현에 의존 금지.
- `packages/domain`: 순수 비즈니스 개념만. DB/auth/filesystem/framework runtime 금지.
- `packages/design-tokens`: cross-platform token. React 컴포넌트 금지.
- `packages/utils`: 작은 순수 helper. 앱/런타임 가정 금지.

의존 방향:

- `apps/*` → `packages/*` 가능.
- `packages/*` → `apps/*` 금지.
- `apps/mobile` → `apps/web/src/server` 금지.
- `apps/web/src/components`는 `features`나 `app`에 의존하지 않는다.
- 공용 package를 쓰레기통처럼 사용하지 않는다.

## 3. 구현 규칙

- 파일 위치와 API 계약이 확인되면 과도한 탐색 없이 구현한다.
- 존재하지 않는 route/package export/API를 추측해서 만들지 않는다.
- `apps/web`의 서버 데이터 fetch는 TanStack Query(`useQuery`, `useMutation`)를 기본으로 한다. 수동 `fetch + useState + useEffect`는 피한다.
- 반복 raw 문자열 분기는 상수 객체로 승격한다.
- TypeScript `enum`은 런타임 산출물이 실제 필요한 경우만. 기본은 `as const` 객체 + literal union.
- 깊은 if 중첩보다 조기 반환, 의미 있는 상태 변수, 매핑 테이블, 보조 함수/컴포넌트를 선호한다.
- 한국어 제품이므로 사용자-facing 오류/로그 메시지는 특별한 외부 계약이 없으면 한국어 기본.

Feature 구조 권장:

```txt
features/<feature-name>/
  <feature-name>.tsx
  <feature-name>.module.css
  types.ts
  constants.ts
  utils.ts(x)
  hooks/
    index.ts
    use-<name>.ts
  components/
    index.ts
    <component-name>.tsx
```

파일 크기 경고 기준:

- React 컴포넌트 300줄
- 커스텀 훅 200줄
- 서버 서비스 500줄
- CSS module 600줄

## 4. 렌더 상태/Empty State

잘못된 상태 조합을 표현할 수 없게 `ViewState` discriminated union을 사용한다.

```ts
type ViewState<T> =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "ready"; data: T };
```

금지:

- `!loading && data.length === 0` 직접 분기
- `query.data ?? []` 후 empty 판정
- 초기 phase/status를 `empty`로 두기

## 5. UI / 스타일링

- UI 작업 전 레이아웃/위계/여백/색상/상태 전이를 먼저 설계한다.
- 관련 스킬: `design-workflow` → `ui-ux-pro-max`/21st 도구 → `design-eye`.
- 기본 Tailwind 유틸리티는 허용하되, 반복 의미가 생기는 색상/여백/반경/그림자는 점진적으로 토큰화한다.
- 동적 Tailwind 클래스 생성(`bg-${color}-500`) 금지.
- `.module.css`에서 `*`, `html`, `body` 전역 셀렉터 단독 사용 금지. 로컬 클래스로 scope한다.

## 6. DB / Migration

`apps/web/src/server/db/schema/**` 수정 시 같은 commit에 migration SQL 포함.

- 생성: `pnpm --filter @yeon/web db:generate --name=<설명적 이름>`
- 로컬 검증: `pnpm --filter @yeon/web db:check:drift`
- `drizzle-kit push`는 일회성 로컬 실험에만 사용한다.
- 운영 배포 migration은 idempotent 해야 한다.
  - `CREATE TABLE IF NOT EXISTS`
  - `ADD COLUMN IF NOT EXISTS`
  - `CREATE INDEX IF NOT EXISTS`
  - constraint는 `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; WHEN duplicate_table THEN null; END $$;`

## 7. 검증

명령은 루트와 workspace `package.json`에서 실제 존재 여부를 확인한 뒤 실행한다.

일반 코드 변경 기본 순서:

1. lint/fix
2. format
3. typecheck
4. `pnpm --filter @yeon/web build`
5. 필요한 test

커밋 전:

- `git status --short | grep "^??"`로 untracked import 누락 확인.
- 자기 작업 파일만 pathspec으로 stage. `git add .` 지양.

## 8. 리뷰 렌즈

- 상태 정합성
- source of truth 위치
- server/client 경계
- web/mobile 재사용 경계
- API 계약 drift
- cleanup 누락과 stale derived state
- partial update와 race condition

코드가 “그럴듯한지”보다 “거짓 상태가 남을 수 있는지”를 기준으로 검토한다.
