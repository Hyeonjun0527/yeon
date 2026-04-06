# Codex Project Context

## Repository Snapshot

- 이름: `yeon`
- 형태: `pnpm` workspace monorepo
- 현재 기본 브랜치: `main`
- 목표 운영 모델: `develop` = 통합/QA, `main` = 운영
- 현재 상태: 웹, 모바일, 공유 패키지 구조를 먼저 세운 초기 스캐폴드 단계

## Branch Workflow Note

- 2026-04-06 기준 이 저장소 원격에는 `origin/main`만 있다.
- `study-platform-client`와 같은 운영 절차를 쓰기 위해서는 첫 통합 단계에서 `develop`을 `main`에서 생성해 push해야 한다.
- 그 뒤부터는 `origin/develop` 기준 브랜치, stacked branch, stacked PR 규칙을 적용한다.

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
- 백로그 문서는 `personal_space/YYYY-MM-DD/N-..._BACKLOG.md`에 작성한다.
- 루트 스크립트가 아직 비어 있을 수 있으므로 실행 전에 항상 해당 `package.json`을 먼저 확인한다.
