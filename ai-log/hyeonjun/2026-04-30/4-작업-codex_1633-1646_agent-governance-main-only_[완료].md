# 작업-codex | 전역 AGENTS baseline 재구축 및 main-only 스킬 정리

- 주체: Codex CLI
- 워크트리: A (/home/osuma/coding_stuffs/yeon)
- 브랜치: chore/agent-governance-main-1 → chore/skill-shared-separation-1 → main
- 작업창(예상): 16:33 ~ 18:30
- 실제 시작: 16:33
- 실제 종료: 16:46
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)
- ~/.codex/AGENTS.md (전역 baseline, git 밖)
- AGENTS.md / CLAUDE.md
- .claude/skills/**, .claude/commands/**
- .codex/skills/**, .codex/skills-archive/**
- .github/workflows/**
- bin/sync-skills.sh, bin/verify-ssot.sh, bin/repair-ssot.sh
- .omc/prd.json, .omc/progress.txt (Ralph runtime 산출물, 커밋 제외 가능)

## 절대 건드리지 않을 범위 (상대 주체 담당)
- 앱 런타임 기능 코드(apps/**, packages/**)는 이번 governance 작업에서 변경하지 않음
- 운영 DB/배포 서버 직접 수정 없음

## 상대 주체 현황 스냅샷
- 기존 카드 일괄 추가 PR #162는 main에 머지 및 운영 배포 완료.
- develop은 사용자가 잠정 중단 지시. 이번 작업은 origin/main 기준 브랜치에서 진행.

## 차수별 작업내용
1. deep-interview 결과를 PRD로 crystallize하고 ralph 상태로 전환.
2. 전역 AGENTS를 XML+Markdown baseline으로 재구축.
3. 프로젝트 AGENTS를 얇은 override로 축소하고 세부 지식은 skill로 이관.
4. main-only git/deploy 규칙과 CI trigger를 정리.
5. skills taxonomy/README/frontmatter/rename/archive로 강한 정리.
6. SSOT/sync/lint/typecheck 검증 후 main PR 생성.


## 완료 결과
- PR #163 머지: AGENTS 전역/project baseline 재구축, develop 잠정 중단/main-only 정책 반영, Yeon 세부 지식 `yeon-project-context` skill 분리, CI deploy develop 경로 제거.
- PR #164 머지: 사용자 제작/Claude SSOT 기반 Codex wrapper 21개를 `.codex/skills/SHARED/<name>/SKILL.md`로 이동하고, OMX/vendored skill direct child와 분리.
- `.codex/skills-archive/`는 기본 skill discovery에서 제외하는 parked/archive 영역으로 문서화.
- `bin/sync-skills.sh`는 앞으로 사용자 제작 wrapper를 `SHARED/` 아래 생성·검증.
- 운영 배포: GitHub Actions `Build, Push, and Deploy Docker Image` run `25153588683` 성공, `deploy_production` 성공.
- 운영 확인: `https://yeon.world` HTTP 200, `https://yeon.world/api/health` HTTP 200 / `{"status":"ok","service":"web"}`.

## 검증
- `bash bin/sync-skills.sh --check` 통과.
- `bash bin/verify-ssot.sh` 및 `--project-only` 통과.
- `git diff --check` 통과.
- workflow YAML parse 통과.
- `pnpm lint` 통과.
- `pnpm typecheck` 통과.
- PR #163/#164 SSOT Check 통과.

## 남은 참고사항
- `~/.codex/AGENTS.md`는 git 밖 전역 파일이라 PR diff에는 포함되지 않음. 현재 로컬에서는 symlink/pointer 검증 완료.
- `.codex/hooks` symlink와 `personal_space/ai-log/2026-04-30/`는 로컬 작업 산출물로 커밋하지 않음.
- develop을 다시 활성화하려면 AGENTS, git/ship/deploy skills, CI trigger를 함께 되돌려야 함.
