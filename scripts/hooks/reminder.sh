#!/usr/bin/env bash
# UserPromptSubmit hook — SSOT 경로 안내 + silent auto-repair + AGENTS.md 강제 로드 지시.
set +e

TODAY=$(date +%Y-%m-%d)
GLOBAL="$HOME/.codex/AGENTS.md"
SHARED="$HOME/.shared-agent-rules.md"

# --- Silent auto-repair of global symlink (critical-3 대응) ---
# symlink 가 끊어지거나 잘못된 target 이면 조용히 재생성. Claude 의 수동 조치에 의존하지 않는다.
if [ -f "$GLOBAL" ] && [ ! -L "$GLOBAL" ]; then
  canonical_global=$(readlink -f "$GLOBAL" 2>/dev/null || echo "$GLOBAL")
  link_target=""
  if [ -L "$SHARED" ]; then
    link_target=$(readlink -f "$SHARED" 2>/dev/null || echo "")
  fi
  if [ "$link_target" != "$canonical_global" ]; then
    rm -f "$SHARED" 2>/dev/null
    ln -s "$GLOBAL" "$SHARED" 2>/dev/null || true
  fi
fi

# --- Integrity report (auto-repair 이후 잔여 문제만 보고) ---
integrity="ok"
if [ ! -f "$GLOBAL" ] || [ -L "$GLOBAL" ]; then
  integrity="전역 AGENTS.md 가 실제 파일이 아님"
elif [ ! -L "$SHARED" ]; then
  integrity="shared-agent-rules.md 가 symlink 아님 (자동 복구 실패 — 권한 또는 경로 이슈)"
elif [ "$(readlink -f "$SHARED" 2>/dev/null)" != "$(readlink -f "$GLOBAL" 2>/dev/null)" ]; then
  integrity="shared-agent-rules.md symlink target 불일치"
fi

# --- 프로젝트 AGENTS.md 탐색 (git toplevel 범위로 제한, major-4 대응) ---
project_agents=""
project_root=$(cd "$PWD" 2>/dev/null && git rev-parse --show-toplevel 2>/dev/null)
if [ -n "$project_root" ] && [ -f "$project_root/AGENTS.md" ]; then
  project_agents="$project_root/AGENTS.md"
fi

cat <<EOF
[REMINDER]
SSOT(전역): $GLOBAL
SSOT(프로젝트): ${project_agents:-(git 저장소 외부 또는 AGENTS.md 없음)}
스킬 SSOT: .claude/commands/<n>.md → PostToolUse hook 이 Write/Edit 후 자동 sync. 수동 필요 시 bin/sync-skills.sh.

### 세션 최초 1회 필수 Read (Claude 는 AGENTS.md 를 자동 로드하지 않는다)
아직 아래 파일을 Read 하지 않았다면 **지금 즉시** Read 하라. CLAUDE.md 는 포인터일 뿐이다.
  Read("$GLOBAL")
EOF
[ -n "$project_agents" ] && echo "  Read(\"$project_agents\")"

cat <<EOF

### 핵심 3조
1. 로그: ai-log/{person}/${TODAY}/N-작업-{claude|codex}_{HHMM}-{HHMM}_{주제}_[작업중].md → 완료 시 종료시각 rename + _[완료] suffix.
2. 착수 전: 상대 주체 [작업중] 문서 확인. 범위 겹치면 재분할.
3. 큰 작업: Claude/Codex 분할 검토 먼저.

규칙 변경은 SSOT 파일에서만. 포인터에 본문 복제 금지.

EOF

if [ "$integrity" != "ok" ]; then
  echo "⚠️ SSOT 무결성 문제 (자동 복구 실패): $integrity"
  echo "   수동 복구: bash <repo>/bin/repair-ssot.sh"
  echo ""
fi

echo "해제: OMC_SKIP_HOOKS 에 reminder 추가."
