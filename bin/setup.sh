#!/usr/bin/env bash
# setup.sh — clone / worktree 직후 최초 1회 실행.
# 1) core.hooksPath = .githooks (pre-commit 활성화)
# 2) 스크립트 실행 권한
# 3) ~/.claude/hooks/ 에 저장소 템플릿 복사 (reminder.sh, post-tool-sync.sh)
# 4) ~/.claude/settings.json 에 PostToolUse hook 등록 (없을 때만)
# 5) 초기 sync-skills + verify-ssot
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo "[setup] core.hooksPath = .githooks 설정"
git config core.hooksPath .githooks

echo "[setup] 스크립트 실행 권한 부여"
chmod +x bin/*.sh .githooks/* scripts/hooks/*.sh 2>/dev/null || true

# --- Claude Code hook 설치 (critical-2 대응) ---
# hook 파일은 사용자 홈에 있어야 작동. 저장소의 scripts/hooks/ 템플릿을 복사한다.
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
CLAUDE_HOOKS_DIR="$CLAUDE_DIR/hooks"
mkdir -p "$CLAUDE_HOOKS_DIR"
for src in "$REPO_ROOT"/scripts/hooks/*.sh; do
  [ -f "$src" ] || continue
  dst="$CLAUDE_HOOKS_DIR/$(basename "$src")"
  if cp -f "$src" "$dst" 2>/dev/null; then
    chmod +x "$dst" 2>/dev/null || true
    echo "[setup] hook 설치: $dst"
  else
    echo "[setup] ⚠️ hook 복사 실패: $dst" >&2
  fi
done

# --- ~/.claude/settings.json 에 PostToolUse block 등록 ---
SETTINGS="$CLAUDE_DIR/settings.json"
if [ -f "$SETTINGS" ] && command -v jq >/dev/null 2>&1; then
  has_post_tool=$(jq -r '
    (.hooks.PostToolUse // [])
    | map(.hooks // [])
    | flatten
    | map(.command // "")
    | map(select(test("post-tool-sync\\.sh")))
    | length
  ' "$SETTINGS" 2>/dev/null || echo "0")
  if [ "$has_post_tool" = "0" ]; then
    tmp=$(mktemp)
    jq '
      .hooks = (.hooks // {})
      | .hooks.PostToolUse = ((.hooks.PostToolUse // []) + [
          {
            "matcher": "Write|Edit|MultiEdit",
            "hooks": [
              {"type": "command", "command": "bash ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/hooks/post-tool-sync.sh"}
            ]
          }
        ])
    ' "$SETTINGS" > "$tmp" && mv "$tmp" "$SETTINGS"
    echo "[setup] ~/.claude/settings.json 에 PostToolUse hook 등록"
  else
    echo "[setup] PostToolUse hook 이미 등록됨 — skip"
  fi
elif [ ! -f "$SETTINGS" ]; then
  echo "[setup] ⚠️ $SETTINGS 없음. Claude Code 최초 실행 후 재실행하세요."
elif ! command -v jq >/dev/null 2>&1; then
  echo "[setup] ⚠️ jq 미설치. settings.json PostToolUse hook 등록을 건너뜁니다."
  echo "   수동 추가 필요: $REPO_ROOT/scripts/hooks/README.md 참조"
fi

# --- 초기 sync + 검증 ---
echo ""
echo "[setup] 초기 스킬 동기화"
bin/sync-skills.sh || echo "⚠️ sync-skills 실패"

echo ""
echo "[setup] SSOT 건전성 점검"
if bin/verify-ssot.sh; then
  echo ""
  echo "✅ setup 완료."
  echo "   - pre-commit hook 활성화 (SSOT drift 자동 차단)"
  echo "   - Claude Code PostToolUse hook 활성화 (.claude/commands/* 편집 시 자동 sync + staged)"
  echo "   - 전역 reminder hook 활성화 (매 요청 시 SSOT 경로 + 규칙 주입)"
else
  echo ""
  echo "⚠️ SSOT 문제 감지. bin/repair-ssot.sh 실행 후 재시도하세요."
  exit 1
fi
