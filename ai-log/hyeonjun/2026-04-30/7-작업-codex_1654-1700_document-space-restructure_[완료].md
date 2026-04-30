# 작업-codex | document-space-restructure

- 주체: Codex CLI
- 워크트리: A `/home/osuma/coding_stuffs/yeon`
- 브랜치: `chore/document-space-restructure-1`
- 작업창(예상): 16:54 ~ 17:00
- 실제 시작: 16:54
- 실제 종료: 17:00
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)

- `personal_space/**` 제거 및 재배치
- `docs/**` 공식 문서 구조
- `ai-log/**` AI 협업 기록 구조
- `AGENTS.md`, `CLAUDE.local.md`, `.claude/skills/*`, `scripts/hooks/reminder.sh`, `.dockerignore`

## 절대 건드리지 않을 범위

- 앱 런타임 코드
- DB schema/migration
- 배포 secret/env
- `.codex/hooks` untracked symlink

## 상대 주체 현황 스냅샷

- `develop` 잠정 중단, main-only 정책 유지.
- 기존 AI 작업 로그는 `ai-log/hyeonjun/`으로 이동.

## 차수별 작업내용

1. `personal_space/docs`의 공식 문서를 `docs/architecture`, `docs/seo`, `docs/projects`, `docs/deployment`, `docs/guides`, `docs/contest`, `docs/account`, `docs/design`으로 재배치.
2. 개발 백로그를 `docs/product/backlog/`와 `docs/product/backlog/history/YYYY-MM-DD/`로 분리.
3. AI 협업 과정 기록을 `ai-log/hyeonjun/YYYY-MM-DD/`, `ai-log/yeon/`으로 분리.
4. 새 `docs/README.md`, `ai-log/README.md`, 각 공식 문서 섹션 README와 백로그 주제 파일을 추가.
5. `AGENTS.md`, `CLAUDE.local.md`, hook reminder, session/wrap skill의 경로 규칙을 `personal_space` 제거 후 구조로 갱신.

## 검증

- `pnpm exec prettier --check ...` (symlink command 파일 제외)
- `git diff --check`
- `bash bin/sync-skills.sh --check`
- `bash bin/verify-ssot.sh --project-only`
- `bash -n scripts/hooks/reminder.sh`

## 후속

- PR을 main 대상으로 생성·머지한다.
