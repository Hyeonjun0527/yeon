#!/usr/bin/env bash
# PostToolUse hook — .claude/commands/ 또는 .claude/skills/ 파일 Write/Edit 직후
# 해당 저장소의 bin/sync-skills.sh 를 자동 실행해 .codex/skills/<n>/SKILL.md wrapper 를 갱신한다.
# critical-2 대응: Claude 의 수동 sync 호출 순응도에 의존하지 않는 구조적 강제.

set +e

input=$(cat 2>/dev/null || echo "{}")

# file_path 추출 (jq 우선, fallback grep)
file_path=""
if command -v jq >/dev/null 2>&1; then
  file_path=$(echo "$input" | jq -r '.tool_input.file_path // .tool_input.path // empty' 2>/dev/null)
fi
if [ -z "$file_path" ]; then
  file_path=$(echo "$input" | grep -oE '"file_path"[[:space:]]*:[[:space:]]*"[^"]+"' | head -1 \
    | sed -E 's/.*"file_path"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/')
fi

# .claude/commands/ 또는 .claude/skills/ 경로만 반응
case "$file_path" in
  */.claude/commands/*|*/.claude/skills/*)
    dir=$(dirname "$file_path")
    repo_root=$(cd "$dir" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null)
    if [ -n "$repo_root" ] && [ -x "$repo_root/bin/sync-skills.sh" ]; then
      result=$("$repo_root/bin/sync-skills.sh" 2>&1)
      # 실제 변경이 있었던 경우에만 stdout 에 보고 + 원본이 staged 면 wrapper/README 도 자동 staged
      if echo "$result" | grep -qE '생성: [1-9]|갱신: [1-9]|README 자동 갱신'; then
        echo "[post-tool-sync] 스킬 SSOT 변경 감지 → Codex wrapper 자동 sync + staged"
        echo "$result" | tail -5
        # critical-1 대응: 원본 .claude/(commands|skills)/*.md 가 이미 staged 인 경우에만
        # 대응 .codex/skills/* 와 README 를 함께 staged (커밋 단위 일치 유지).
        if git -C "$repo_root" diff --cached --name-only | grep -qE '^\.claude/(commands|skills)/'; then
          git -C "$repo_root" add ".codex/skills/" 2>/dev/null || true
        fi
      fi
    fi
    ;;
esac
