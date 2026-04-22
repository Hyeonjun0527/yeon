#!/usr/bin/env bash
# compare-settings.sh — Claude settings.json vs Codex config.toml 시각적 비교 도구.
# JSON ↔ TOML 포맷 차이로 완전 자동 동기화는 불가. 이 스크립트는 "diff view" 만 제공.
# minor-1 (이름 명확화): 이전의 sync-settings.sh 는 실제로 sync 하지 않고 비교만 했으므로 이름 교정.

set -uo pipefail

CLAUDE="$HOME/.claude/settings.json"
CODEX="$HOME/.codex/config.toml"

section() { echo ""; echo "=== $1 ==="; }

section "Claude ~/.claude/settings.json: env + hooks + plugins"
if [ -f "$CLAUDE" ]; then
  if command -v jq >/dev/null 2>&1; then
    jq '{ env: .env, hooks_events: (.hooks|keys), plugins: .enabledPlugins }' "$CLAUDE" 2>/dev/null || echo "(jq 파싱 실패)"
  else
    grep -A5 '"env"' "$CLAUDE" 2>/dev/null || echo "(jq 미설치)"
  fi
else
  echo "(파일 없음)"
fi

section "Claude settings.json: MCP 서버 목록"
if [ -f "$CLAUDE" ] && command -v jq >/dev/null 2>&1; then
  jq '.mcpServers // {}' "$CLAUDE" 2>/dev/null | grep -E '^\s*"' | sed 's/^\s*//;s/:.*$//' | LC_ALL=C sort
else
  echo "(jq 필요)"
fi

section "Codex ~/.codex/config.toml: MCP 서버 이름 목록"
if [ -f "$CODEX" ]; then
  grep -E '^\[mcp_servers\.[^]]+\]$' "$CODEX" | sed 's/\[mcp_servers\.\(.*\)\]/\1/' | LC_ALL=C sort | uniq
else
  echo "(파일 없음)"
fi

section "Codex config.toml: 모델·personality"
if [ -f "$CODEX" ]; then
  grep -E '^(model|model_reasoning_effort|service_tier|personality)' "$CODEX" 2>/dev/null || true
fi

echo ""
echo "---"
echo "두 목록의 MCP 서버 이름 일치 여부를 시각적으로 비교하세요."
echo "완전 자동 동기화 불가 근거는 AGENTS.md §1.3 참조 (JSON ↔ TOML 포맷 차이)."
