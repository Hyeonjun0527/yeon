# Codex Project Context

## Repository Snapshot

- 이름: `yeon`
- 형태: `pnpm` workspace monorepo
- 현재 기본 브랜치: `main`
- 목표 운영 모델: `develop` = develop 서버, `main` = 운영 서버
- 현재 상태: 웹, 모바일, 공유 패키지 구조를 먼저 세운 초기 스캐폴드 단계

## Branch Workflow Note

- 2026-04-07 기준 원격에는 `origin/main`, `origin/develop`이 모두 있다.
- 새 landing 단위는 최신 `origin/develop` 기준 브랜치로 시작한다.
- stacked branch와 stacked PR이 필요한 경우에만 직전 작업 브랜치를 base로 분리한다.

## Boundary Summary

- `apps/web`: Next.js 앱과 웹 전용 서버 경계
- `apps/mobile`: 향후 Expo 앱
- `packages/api-contract`: 공용 API 계약의 source of truth
- `packages/api-client`: typed client
- `packages/domain`: 순수 도메인 로직
- `packages/design-tokens`: cross-platform design constants
- `packages/utils`: 순수 헬퍼

## Key Sources

- `AGENTS.md`
- `CLAUDE.md`
- `CLAUDE.local.md`
- `.claude/agents/README.md`
- `.claude/skills/git-pr-workflow.md`
- `.claude/skills/design-workflow.md`
- `.claude/skills/design-eye.md`
- `.claude/memory/anti-patterns.md`
- `.claude/memory/bug-patterns.md`
- `.claude/memory/retrospective-log.md`

## Working Rules

- 에이전트 공용 지침은 `AGENTS.md`, `CLAUDE.md`, `CLAUDE.local.md`, `.claude/*`를 우선 참조한다.
- UI 작업은 `ui-ux-pro-max`로 디자인 시스템을 먼저 잡고, 필요하면 21st 도구를 이어서 사용한다.
- 이 저장소에서는 기본 Tailwind 유틸리티 사용을 허용한다.
- `global.css` 또는 `globals.css`에서 기본 Tailwind scale을 막는 방식은 사용하지 않는다.
- 백로그 문서는 `docs/hyeonjun/YYYY-MM-DD/N-..._BACKLOG.md` 또는 `docs/yeon/YYYY-MM-DD/N-..._BACKLOG.md`에 작성한다.
- 루트 스크립트가 아직 비어 있을 수 있으므로 실행 전에 항상 해당 `package.json`을 먼저 확인한다.
- 오래 걸리는 탐색, 테스트, 빌드, 에이전트 작업은 가능한 한 백그라운드로 돌리고, 기다리는 동안 독립 작업이 없으면 상태를 먼저 공유한다.
- 백그라운드 외부 에이전트는 기다리는 동안 병렬로 할 일이 실제로 있을 때만 사용한다. 결과가 즉시 필요하면 foreground 실행을 우선한다.
- 타임아웃까지 무작정 대기하지 않는다. 장시간 대기만 남았으면 현재 완료 범위, 병목, 다음 액션을 짧게 보고한다.
- `<system-reminder>`가 오지 않는다고 해서 무한정 기다리지 않는다. 알림 경로가 깨진 것으로 보고 로컬 도구 탐색이나 foreground 재실행으로 즉시 전환한다.
- 큰 요청도 짧은 실행 단위로 나눠 진행 상황이 계속 보이게 유지한다.
