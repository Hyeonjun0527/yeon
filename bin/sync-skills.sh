#!/usr/bin/env bash
# sync-skills.sh — Claude <-> Codex 스킬 SSOT 동기화 도구.
#
# 기능:
# - .claude/commands/<n>.md (또는 .claude/skills/<n>.md) 를 SSOT 로 간주
# - .codex/skills/SHARED/<n>/SKILL.md wrapper 를 자동 생성·갱신
# - .codex/skills/README.md 의 "현재 미러링된 이름" + "Vendored OMC Skills" 섹션 자동 재생성
# - .claude/commands/ 와 .claude/skills/ 에 같은 이름 중복 파일이 있고 내용 다르면 경고
# - .codex/skills/ 쪽에 SHARED도 아니고 OMX direct 목록에도 없는 스킬 감지
#
# 사용:
#   bin/sync-skills.sh          # 모든 스킬 sync (누락·drift 갱신)
#   bin/sync-skills.sh --force  # 기존 wrapper 전부 표준 템플릿으로 강제 재작성
#   bin/sync-skills.sh --check  # 점검만, 생성·갱신 안 함 (drift 있으면 exit 1)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="$REPO_ROOT/.claude"
CODEX_DIR="$REPO_ROOT/.codex"
CODEX_SHARED_SKILLS_DIR="$CODEX_DIR/skills/SHARED"

FORCE=0
CHECK_ONLY=0
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    --check) CHECK_ONLY=1 ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

render_expected() {
  local name="$1"
  local source_rel="$2"
  local description="$3"
  cat <<EOF
---
name: $name
description: |-
$(printf '%s\n' "$description" | sed 's/^/  /')
---

# $name

이 파일은 **Codex 측 얇은 wrapper**다. 절차의 실제 출처는 아래 SSOT 파일이다.

## Source of Truth

- \`$source_rel\`

## Execution

**첫 단계로 반드시 source 파일을 Read 하라.** 본 wrapper 의 요약이나 지시어만으로 절차를 수행하지 말 것.

1. \`Read("$source_rel")\` 을 즉시 호출하여 전체 내용을 받는다.
2. 그 문서의 절차, 체크리스트, 출력 형식을 authoritative 하게 그대로 따른다.
3. 사용자가 전달한 인자(\$ARGUMENTS)가 있으면 그 의도를 유지한 채 동일 workflow 로 실행한다.
4. 이 wrapper 는 \`bin/sync-skills.sh\` 가 자동 생성한다. 직접 수정하지 말고 SSOT 파일을 편집한다.
EOF
}

extract_description() {
  local source_file="$1"
  awk '
    BEGIN {
      in_frontmatter = 0
      in_description_block = 0
      has_output = 0
    }

    NR == 1 && $0 == "---" {
      in_frontmatter = 1
      next
    }

    in_frontmatter && $0 == "---" {
      exit
    }

    !in_frontmatter {
      exit
    }

    in_description_block {
      if ($0 ~ /^  /) {
        line = $0
        sub(/^  /, "", line)
        if (has_output) {
          printf "\n"
        }
        printf "%s", line
        has_output = 1
        next
      }

      if ($0 == "") {
        if (has_output) {
          printf "\n"
        }
        has_output = 1
        next
      }

      exit
    }

    /^description:[[:space:]]*[>|][+-]?[[:space:]]*$/ {
      in_description_block = 1
      next
    }

    /^description:[[:space:]]*/ {
      line = $0
      sub(/^description:[[:space:]]*/, "", line)
      printf "%s", line
      exit
    }
  ' "$source_file"
}

# 본문 파일 판정: frontmatter (`---` 로 시작) 가 있으면 full body, 없으면 thin slash trigger.
# Claude Code 관례: .claude/commands/<n>.md 는 slash trigger 역할일 수 있고,
# .claude/skills/<n>.md 가 실제 본문을 담을 수 있다. 반대 패턴도 존재.
# sync-skills.sh 는 **본문을 담은 파일** 을 SSOT 로 선택해서 Codex wrapper 가 올바른 파일을 읽게 한다.
is_full_skill_body() {
  [ -f "$1" ] && head -1 "$1" 2>/dev/null | grep -q '^---$'
}

# === Claude 측 SSOT 스킬 수집 (frontmatter 기반 판정) ===
declare -A skills
all_names=$(
  {
    find "$CLAUDE_DIR/commands" -maxdepth 1 -type f -name "*.md" 2>/dev/null
    find "$CLAUDE_DIR/skills" -maxdepth 1 -type f -name "*.md" 2>/dev/null
  } | while read -r f; do basename "$f" .md; done | LC_ALL=C sort -u
)

while IFS= read -r name; do
  [ -z "$name" ] && continue
  skl_file="$CLAUDE_DIR/skills/$name.md"
  cmd_file="$CLAUDE_DIR/commands/$name.md"
  # 우선순위: 본문을 담은 파일(full body). skills 와 commands 둘 다 full body 면 commands 우선.
  if is_full_skill_body "$cmd_file"; then
    skills[$name]=".claude/commands/$name.md"
  elif is_full_skill_body "$skl_file"; then
    skills[$name]=".claude/skills/$name.md"
  elif [ -f "$cmd_file" ]; then
    skills[$name]=".claude/commands/$name.md"
  elif [ -f "$skl_file" ]; then
    skills[$name]=".claude/skills/$name.md"
  fi
done <<< "$all_names"

# === 저장소 내부 drift 감지: commands/skills 둘 다 full body 인데 내용 다를 때만 경고 ===
duplicate_warnings=()
for name in "${!skills[@]}"; do
  cmd_file="$CLAUDE_DIR/commands/$name.md"
  skl_file="$CLAUDE_DIR/skills/$name.md"
  if is_full_skill_body "$cmd_file" && is_full_skill_body "$skl_file"; then
    if ! cmp -s "$cmd_file" "$skl_file"; then
      duplicate_warnings+=("$name: commands/$name.md 와 skills/$name.md 둘 다 본문을 갖고 있고 내용 다름 → 저장소 drift (한쪽으로 통일 필요)")
    fi
  fi
done

# === Codex 측 역방향 스캔 (orphan / OMX direct / SHARED 분류) ===
# OMX direct 판정은 README 의 명시적 "OMX Direct Skills" 목록을 ground truth 로 사용.
# SHARED 아래 skill은 사용자 제작/프로젝트 공유/imported 스킬로 보고 orphan 검사에서 제외한다.
README_FILE="$CODEX_DIR/skills/README.md"
known_direct=()
if [ -f "$README_FILE" ]; then
  # README 의 OMX Direct 섹션 안에 있는 단어들을 수집 (섹션 마커 또는 ```txt 블록 감지)
  while IFS= read -r line; do
    # 빈 줄/주석/섹션 헤더 스킵
    [ -z "$line" ] && continue
    case "$line" in
      '#'*|'- source:'*|'- 현재 가져온'*|'```'*) continue ;;
    esac
    # bullet 또는 plain 이름 추출
    name_candidate=$(echo "$line" | sed -E 's/^[-*]?[[:space:]]*`?([a-zA-Z0-9_-]+)`?[[:space:]]*$/\1/' | tr -d '[:space:]')
    if [ -n "$name_candidate" ] && echo "$name_candidate" | grep -qE '^[a-zA-Z0-9_-]+$'; then
      known_direct+=("$name_candidate")
    fi
  done < <(awk '/^## OMX Direct Skills/,/^## [^O]|^---$/' "$README_FILE" | grep -E '^[[:space:]]*[a-zA-Z0-9_-]+[[:space:]]*$|^- `[a-zA-Z0-9_-]+`' 2>/dev/null)
fi

is_known_direct() {
  local n="$1"
  for v in "${known_direct[@]:-}"; do
    [ "$v" = "$n" ] && return 0
  done
  return 1
}

codex_only=()
direct=()
shared=()
if [ -d "$CODEX_DIR/skills" ]; then
  while IFS= read -r -d '' skillmd; do
    skill_dir="$(dirname "$skillmd")"
    name="$(basename "$skill_dir")"
    parent="$(basename "$(dirname "$skill_dir")")"

    if [ "$parent" = "SHARED" ]; then
      shared+=("$name")
      continue
    fi

    if [ -n "${skills[$name]:-}" ]; then
      codex_only+=("$name (legacy 위치: 사용자 제작 스킬은 .codex/skills/SHARED/$name/SKILL.md 로 이동해야 함)")
    else
      if is_known_direct "$name"; then
        direct+=("$name")
      elif grep -q 'Source of Truth' "$skillmd" 2>/dev/null && grep -q '\.claude/' "$skillmd" 2>/dev/null; then
        codex_only+=("$name (orphan: Claude 대응 SSOT 없음 — README OMX Direct 목록에도 없음)")
      else
        codex_only+=("$name (미분류: README OMX Direct 목록에 추가하거나 SHARED로 이동하세요)")
      fi
    fi
  done < <(find "$CODEX_DIR/skills" -maxdepth 3 -mindepth 2 -type f -name "SKILL.md" -print0 2>/dev/null)
fi

# === wrapper 생성·갱신 ===
created=0
updated=0
ok=0
missing_or_drift=()
sorted_local=$(printf '%s\n' "${!skills[@]}" | LC_ALL=C sort)
while IFS= read -r name; do
  [ -z "$name" ] && continue
  source_rel="${skills[$name]}"
  wrapper_dir="$CODEX_SHARED_SKILLS_DIR/$name"
  wrapper_file="$wrapper_dir/SKILL.md"

  description=$(extract_description "$REPO_ROOT/$source_rel" || true)
  [ -z "$description" ] && description="Claude 측 $source_rel 의 Codex wrapper."

  expected=$(render_expected "$name" "$source_rel" "$description")

  if [ -f "$wrapper_file" ]; then
    actual=$(cat "$wrapper_file")
    if [ "$actual" = "$expected" ]; then
      ok=$((ok+1))
      continue
    fi
    if [ "$CHECK_ONLY" = 1 ]; then
      missing_or_drift+=("$name (out of sync)")
      continue
    fi
    printf '%s\n' "$expected" > "$wrapper_file"
    updated=$((updated+1))
  else
    if [ "$CHECK_ONLY" = 1 ]; then
      missing_or_drift+=("$name (wrapper 없음)")
      continue
    fi
    mkdir -p "$wrapper_dir"
    printf '%s\n' "$expected" > "$wrapper_file"
    created=$((created+1))
  fi
done <<< "$sorted_local"

# === README.md 의 로컬 미러 목록 자동 재생성 (마커 기반, major-5 대응) ===
# Vendored 목록은 사람이 수동 관리하는 ground truth 이므로 sync-skills 가 건드리지 않는다.
# 마커: <!-- SYNC-SKILLS:LOCAL:BEGIN --> ... <!-- SYNC-SKILLS:LOCAL:END -->
# 마커가 없으면 갱신 안 하고 사용자에게 알림.
if [ -f "$README_FILE" ] && [ "$CHECK_ONLY" = 0 ]; then
  local_block=$(while IFS= read -r name; do [ -n "$name" ] && echo "- \`$name\`"; done <<< "$sorted_local")

  if grep -q '<!-- SYNC-SKILLS:LOCAL:BEGIN -->' "$README_FILE" && \
     grep -q '<!-- SYNC-SKILLS:LOCAL:END -->' "$README_FILE"; then
    tmp_readme=$(mktemp)
    awk -v block="$local_block" '
      BEGIN { inside = 0 }
      /<!-- SYNC-SKILLS:LOCAL:BEGIN -->/ { print; print ""; print block; print ""; inside = 1; next }
      /<!-- SYNC-SKILLS:LOCAL:END -->/ { inside = 0; print; next }
      inside { next }
      { print }
    ' "$README_FILE" > "$tmp_readme"

    if ! cmp -s "$README_FILE" "$tmp_readme"; then
      mv "$tmp_readme" "$README_FILE"
      echo "README 자동 갱신: $README_FILE (로컬 ${#skills[@]} 스킬 목록 마커 사이만)"
    else
      rm -f "$tmp_readme"
    fi
  else
    echo "⚠️ README.md 에 <!-- SYNC-SKILLS:LOCAL:BEGIN/END --> 마커가 없어 자동 갱신을 건너뜀."
    echo "   '## 현재 미러링된 이름' 섹션 앞뒤에 마커를 넣으면 자동 관리됩니다."
  fi
fi

# === 결과 보고 ===
echo "sync-skills 결과:"
echo "  로컬 스킬: ${#skills[@]}"
echo "  동일(ok): $ok / 생성: $created / 갱신: $updated"
echo "  OMX direct: ${#direct[@]}"
echo "  SHARED: ${#shared[@]}"

if [ ${#duplicate_warnings[@]} -gt 0 ]; then
  echo ""
  echo "⚠️ commands/skills 중복 drift (${#duplicate_warnings[@]}):"
  for w in "${duplicate_warnings[@]}"; do echo "  - $w"; done
fi

if [ ${#codex_only[@]} -gt 0 ]; then
  echo ""
  echo "⚠️ Codex-only orphan (${#codex_only[@]}):"
  for o in "${codex_only[@]}"; do echo "  - $o"; done
fi

if [ ${#missing_or_drift[@]} -gt 0 ]; then
  echo ""
  echo "불일치/미생성 (${#missing_or_drift[@]}):"
  for item in "${missing_or_drift[@]}"; do echo "  - $item"; done
  if [ "$CHECK_ONLY" = 1 ]; then exit 1; fi
fi

# --check 모드에서 중복/orphan 도 실패로 처리
if [ "$CHECK_ONLY" = 1 ]; then
  if [ ${#duplicate_warnings[@]} -gt 0 ] || [ ${#codex_only[@]} -gt 0 ]; then
    exit 1
  fi
fi
