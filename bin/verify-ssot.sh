#!/usr/bin/env bash
# verify-ssot.sh — SSOT 구조 전체 건전성 점검. 문제 발견 시 exit 1.
# major-3 대응: .git 없는 환경에서 graceful degradation.

set -uo pipefail

PROJECT_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --project-only) PROJECT_ONLY=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

FAIL=0
pass() { echo "  ✓ $1"; }
fail() { echo "  ✗ $1"; FAIL=1; }
warn() { echo "  ⚠ $1"; }

GLOBAL="$HOME/.codex/AGENTS.md"
SHARED="$HOME/.shared-agent-rules.md"
CLAUDE_GLOBAL="$HOME/.claude/CLAUDE.md"

if [ "$PROJECT_ONLY" = 1 ]; then
  echo "=== 전역 SSOT 검증 건너뜀 (--project-only, CI 환경 등) ==="
  echo ""
else

echo "=== 전역 SSOT ==="
if [ -f "$GLOBAL" ] && [ ! -L "$GLOBAL" ]; then
  pass "~/.codex/AGENTS.md 는 실제 파일"
else
  fail "~/.codex/AGENTS.md 가 실제 파일이 아님"
fi

if [ -L "$SHARED" ]; then
  lnk=$(readlink -f "$SHARED" 2>/dev/null || echo "")
  canonical=$(readlink -f "$GLOBAL" 2>/dev/null || echo "")
  if [ -n "$lnk" ] && [ "$lnk" = "$canonical" ]; then
    pass "~/.shared-agent-rules.md 는 ~/.codex/AGENTS.md 로의 symlink"
  else
    fail "~/.shared-agent-rules.md symlink target 불일치 ($lnk != $canonical)"
  fi
else
  fail "~/.shared-agent-rules.md 가 symlink 가 아님 (reminder.sh 가 자동 복구 시도하지만 실패한 상태)"
fi

if [ -f "$CLAUDE_GLOBAL" ] && grep -qE 'shared-agent-rules|codex/AGENTS\.md' "$CLAUDE_GLOBAL"; then
  pass "~/.claude/CLAUDE.md 가 전역 SSOT 포인터 포함"
else
  fail "~/.claude/CLAUDE.md 가 전역 SSOT 포인터 미포함"
fi

fi  # end PROJECT_ONLY guard

echo ""
echo "=== 프로젝트 SSOT ==="
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "")
if [ -z "$REPO_ROOT" ] || [ ! -d "$REPO_ROOT/.git" ]; then
  warn "git 저장소가 아니어서 프로젝트 SSOT 점검 건너뜀 (전역만 확인)"
  echo ""
  if [ $FAIL -eq 0 ]; then
    echo "✅ 전역 SSOT OK (프로젝트 검사는 git 저장소에서만 작동)"
  else
    echo "❌ 전역 SSOT 문제"
  fi
  exit $FAIL
fi

PROJECT_AGENTS="$REPO_ROOT/AGENTS.md"
PROJECT_CLAUDE="$REPO_ROOT/CLAUDE.md"

if [ -f "$PROJECT_AGENTS" ]; then
  pass "$PROJECT_AGENTS 존재"
else
  fail "$PROJECT_AGENTS 없음"
fi

if [ -f "$PROJECT_CLAUDE" ] && grep -q 'AGENTS\.md' "$PROJECT_CLAUDE"; then
  pass "$PROJECT_CLAUDE 가 AGENTS.md 포인터 포함"
else
  fail "$PROJECT_CLAUDE 가 AGENTS.md 포인터 미포함"
fi

# core.hooksPath 가 .githooks 로 설정되었는지 (critical-1 후속 검증)
hooks_path=$(git -C "$REPO_ROOT" config core.hooksPath 2>/dev/null || echo "")
if [ "$hooks_path" = ".githooks" ]; then
  pass "core.hooksPath = .githooks (pre-commit 자동 활성화됨)"
else
  warn "core.hooksPath 가 .githooks 로 설정되지 않음. 'bin/setup.sh' 를 실행하세요."
fi

if [ -x "$REPO_ROOT/bin/sync-skills.sh" ]; then
  pass "bin/sync-skills.sh 실행 가능"
else
  fail "bin/sync-skills.sh 실행 불가"
fi

echo ""
echo "=== 스킬 동기화 ==="
if [ -x "$REPO_ROOT/bin/sync-skills.sh" ]; then
  if "$REPO_ROOT/bin/sync-skills.sh" --check >/tmp/sync-skills-check.out 2>&1; then
    pass "로컬 스킬 wrapper 모두 동기화"
  else
    fail "스킬 wrapper drift 감지"
    echo "    --- check 결과 ---"
    sed 's/^/    /' /tmp/sync-skills-check.out
  fi
fi

echo ""
if [ $FAIL -eq 0 ]; then
  echo "✅ SSOT 전체 건전성 OK"
else
  echo "❌ SSOT 문제 감지. bin/repair-ssot.sh 실행 후 재검사하세요."
fi
exit $FAIL
