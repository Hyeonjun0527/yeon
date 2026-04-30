# 작업-codex | OMX 스킬 외 SHARED 분리

- 주체: Codex CLI
- 워크트리: A (/home/osuma/coding_stuffs/yeon)
- 브랜치: chore/omx-shared-skill-split-1
- 작업창(예상): 16:48 ~ 17:05
- 실제 시작: 16:48
- 실제 종료: 16:53
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)
- .codex/skills/**
- bin/sync-skills.sh
- personal_space/ai-log/2026-04-30/6-*.md (커밋 제외)

## 절대 건드리지 않을 범위 (상대 주체 담당)
- 앱 런타임 코드(apps/**, packages/**)
- CI 배포 workflow

## 상대 주체 현황 스냅샷
- main-only governance PR #163/#164 머지 완료.
- 운영 배포/health 정상 확인 완료.

## 차수별 작업내용
1. 활성 OMX core skill direct child allowlist 확정.
2. 그 외 direct child skill을 SHARED로 이동.
3. sync-skills/README 기준 업데이트 및 검증.


## 완료 결과
- PR #165 머지 완료: `OMX 스킬 외 항목을 SHARED로 분리`.
- `.codex/skills/` direct child에는 OMX runtime/control skill 17개만 유지.
- non-OMX imported/legacy/helper skill 21개를 `.codex/skills/SHARED/<name>/`로 이동.
- 기존 Claude SSOT mirrored skill 21개와 합쳐 SHARED skill 총 42개.
- `bin/sync-skills.sh`는 direct child를 README `OMX Direct Skills` 기준으로 검증하고, SHARED를 공유 영역으로 인정.

## 검증
- `git diff --check` 통과.
- `bash bin/sync-skills.sh --check` 통과: 로컬 21 / OMX direct 17 / SHARED 42.
- `bash bin/verify-ssot.sh --project-only` 통과.
- `pnpm exec prettier --check .codex/skills/README.md` 통과.
- `bash -n bin/sync-skills.sh` 통과.
- direct allowlist verification script 통과.
- pre-commit hook lint/typecheck 통과.
- PR #165 SSOT Check 통과.

## 남은 참고사항
- `.codex/hooks` symlink와 작업 로그는 로컬 산출물로 커밋 제외.
- pre-commit 중 `sed: ... unknown option to s` 메시지는 기존 hook의 비치명 출력이며 commit/check는 성공.
