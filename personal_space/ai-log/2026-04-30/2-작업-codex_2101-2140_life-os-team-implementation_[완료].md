# 작업-codex | Life OS MVP team implementation

- 주체: Codex CLI / OMX Team leader
- 워크트리: A (/home/osuma/coding_stuffs/yeon) + team auto worktrees
- 브랜치: main (leader), workers use OMX team worktrees
- 작업창(예상): 21:01 ~ 23:00
- 실제 시작: 21:01
- 실제 종료: 21:40
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)

- apps/web/src/app/life-os/\*\*
- apps/web/src/features/life-os/\*\*
- apps/web/src/app/api/v1/life-os/\*\*
- apps/web/src/server/repositories/life-os-\*.ts
- apps/web/src/server/services/life-os-\*.ts
- apps/web/src/server/db/schema/life-os\*.ts
- apps/web/src/server/db/migrations/\*\* (schema 변경 시)
- packages/api-contract/src/life-os\*.ts (필요 시)
- .omx/state/team/\*\* runtime state
- personal*space/ai-log/2026-04-30/2-작업-codex_2101-2300_life-os-team-implementation*[작업중].md

## 절대 건드리지 않을 범위 (상대 주체 담당)

- 상담/수강생/기존 sheetIntegrations 도메인 의미 변경 금지
- AGENTS/CLAUDE governance 파일 변경 금지
- main에 직접 커밋/푸시 금지(사용자 별도 지시 전까지)

## 상대 주체 현황 스냅샷

- 현재 `main...origin/main`, untracked `.codex/hooks`, `personal_space/` 존재
- ralplan 승인 완료: `.omx/plans/ralplan-life-os-service.md`, PRD/test-spec 존재

## 차수별 작업내용

1. OMX team 5명 실행 및 팀 상태 확인
2. worker 산출물 통합
3. lint/typecheck/test/build 및 필요 시 수정
4. visual acceptance evidence 정리

## 완료 요약

- stalled OMX team은 `omx team shutdown --force --confirm-issues`로 정리.
- `/life-os` 스프레드시트형 웹 화면을 유지하면서 도메인 분석 로직을 `@yeon/domain/life-os`로 이동.
- 모바일 앱 출시를 위해 `@yeon/api-contract/life-os`, `@yeon/api-client` 메서드, `/api/v1/life-os/*` HTTP API를 추가.
- `life_os_days` 테이블과 idempotent migration `0033_add_life_os_days.sql` 추가.
- Expo 앱 탭에 `Life OS` 모바일 화면을 추가해 앱 출시 시 동일한 기록 경험을 얹을 수 있게 함.

## 검증

- `pnpm --filter @yeon/domain test -- src/life-os.test.ts`
- `pnpm --filter @yeon/api-contract exec vitest run src/__tests__/life-os.test.ts`
- `pnpm --filter @yeon/web exec vitest run src/features/life-os/utils.test.ts`
- `pnpm --filter @yeon/domain typecheck`
- `pnpm --filter @yeon/api-contract typecheck`
- `pnpm --filter @yeon/api-client typecheck`
- `pnpm --filter @yeon/web typecheck`
- `pnpm --filter @yeon/web lint`
- `pnpm --filter @yeon/api-contract lint`
- `pnpm --filter @yeon/api-client lint`
- `pnpm --filter @yeon/web db:check:drift`
- `pnpm --filter @yeon/web build`
- `pnpm --filter @yeon/mobile lint`
- `pnpm --filter @yeon/mobile typecheck`
- `pnpm exec prettier --check <Life OS changed files>`
- `git diff --check`
