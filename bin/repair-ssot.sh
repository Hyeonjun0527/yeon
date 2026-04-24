#!/usr/bin/env bash
# repair-ssot.sh — SSOT 구조 손상 감지 및 복구.
# 에디터 저장으로 symlink 가 실제 파일로 바뀌었거나, 포인터가 끊어진 경우 자동 복구.

set -euo pipefail

GLOBAL="$HOME/.codex/AGENTS.md"
SHARED="$HOME/.shared-agent-rules.md"

echo "=== 전역 SSOT 복구 점검 ==="

if [ ! -f "$GLOBAL" ]; then
  echo "❌ $GLOBAL 이 존재하지 않습니다. SSOT 자동 복구 불가."
  echo "   git 이력 또는 백업에서 수동으로 재생성하세요."
  exit 1
fi

if [ -L "$GLOBAL" ]; then
  echo "❌ $GLOBAL 이 실제 파일이 아닌 symlink 입니다. 잘못된 상태."
  echo "   symlink 방향이 뒤집혔습니다. 수동 조사 필요:"
  ls -la "$GLOBAL"
  exit 1
fi

echo "✓ $GLOBAL 은 정상 실제 파일"

# shared-agent-rules.md 검사
if [ -L "$SHARED" ]; then
  target=$(readlink -f "$SHARED")
  canonical_global=$(readlink -f "$GLOBAL")
  if [ "$target" = "$canonical_global" ]; then
    echo "✓ $SHARED symlink 정상 → $target"
  else
    echo "⚠️ symlink target 불일치. 재생성 중..."
    rm -f "$SHARED"
    ln -s "$GLOBAL" "$SHARED"
    echo "✓ 복구: $SHARED → $GLOBAL"
  fi
elif [ -e "$SHARED" ]; then
  # symlink 가 아닌 실제 파일 — 에디터 저장으로 끊긴 케이스
  echo "⚠️ $SHARED 가 symlink 가 아닌 실제 파일입니다 (에디터 저장으로 끊긴 듯)."
  backup="$SHARED.backup-$(date +%Y%m%d-%H%M%S)"
  mv "$SHARED" "$backup"
  ln -s "$GLOBAL" "$SHARED"
  echo "✓ 백업: $backup"
  echo "✓ 복구: $SHARED → $GLOBAL"
  echo ""
  echo "백업 vs 현재 GLOBAL diff:"
  if diff -q "$backup" "$GLOBAL" >/dev/null 2>&1; then
    echo "  (내용 동일 — 백업 삭제해도 무방)"
  else
    echo "  (내용 다름 — 수동으로 머지 후 ~/.codex/AGENTS.md 에 반영 필요)"
    echo "  diff 보기: diff $backup $GLOBAL"
  fi
else
  echo "⚠️ $SHARED 없음. symlink 생성 중..."
  ln -s "$GLOBAL" "$SHARED"
  echo "✓ 생성: $SHARED → $GLOBAL"
fi

echo ""
echo "=== 프로젝트 SSOT 복구 점검 ==="
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
PROJECT_AGENTS="$REPO_ROOT/AGENTS.md"

if [ -f "$PROJECT_AGENTS" ]; then
  echo "✓ $PROJECT_AGENTS 존재"
else
  echo "⚠️ $PROJECT_AGENTS 없음. 이 저장소의 SSOT 가 사라졌습니다."
  exit 1
fi

echo ""
echo "=== 스킬 wrapper 재동기화 ==="
if [ -x "$REPO_ROOT/bin/sync-skills.sh" ]; then
  "$REPO_ROOT/bin/sync-skills.sh"
else
  echo "(bin/sync-skills.sh 실행 불가 — 실행 권한 확인 필요)"
fi

echo ""
echo "✓ SSOT 복구 완료."
