# AGENTS.md — 이 저장소 공용 SSOT

이 파일은 **이 저장소에서 Claude CLI와 Codex CLI가 공유하는 공용 규칙의 단일 source of truth**다.
`CLAUDE.md`와 `CLAUDE.local.md`는 여기 본문을 복제하지 않고, **포인터 + 각자 고유 환경 설정**만 둔다.
규칙 변경은 반드시 이 파일에서만 한다.

> 전역 공용 규칙은 `~/.codex/AGENTS.md` (실제 파일)에 있으며 `~/.shared-agent-rules.md`는 여기로의 symlink다. 프로젝트 규칙이 전역과 충돌하면 이 파일의 명시적 조문이 우선한다.

## §0. TL;DR (세션 시작 시 5줄 요약)

1. **모든 로그**: `personal_space/ai-log/YYYY-MM-DD/N-작업-{claude|codex}_{HHMM}-{HHMM}_{주제}_[작업중].md` (완료 시 실제 종료시각으로 rename + `_[완료]` suffix).
2. **착수 전**: 같은 날짜/전일 `[작업중]` 문서 확인 → 상대 주체 작업 범위와 겹치면 재분할.
3. **큰 작업**: "Claude/Codex 두 주체로 분할 가능한가?" 먼저 검토.
4. **규칙 변경**: 이 파일(또는 전역 `~/.codex/AGENTS.md`)에서만. 포인터 파일(`CLAUDE.md`)에 본문 복제 금지. 새 스킬 추가 시 `bin/sync-skills.sh` 실행.
5. **SSOT 점검**: `bin/verify-ssot.sh`로 건전성, `bin/repair-ssot.sh`로 복구. pre-commit hook(`.githooks/pre-commit`)이 자동 검증 — 활성화: `git config core.hooksPath .githooks`.

## §0.5. SSOT 운영 도구 (요약)

| 도구 | 역할 |
|---|---|
| `bin/sync-skills.sh` | `.claude/commands/<n>.md` → `.codex/skills/<n>/SKILL.md` wrapper + README 자동 재생성. `--check`로 drift 점검, `--force`로 전체 재작성. |
| `bin/verify-ssot.sh` | 전역·프로젝트 SSOT 전체 건전성 검사. pre-commit에서 자동 호출. |
| `bin/repair-ssot.sh` | symlink 끊김·포인터 누락·wrapper 드롭 시 자동 복구. |
| `bin/compare-settings.sh` | Claude `settings.json` vs Codex `config.toml` 시각적 비교 (JSON↔TOML 포맷 차이로 완전 자동 동기화 불가, 수동 보조). |
| `bin/setup.sh` | 저장소 clone/worktree 직후 최초 1회 실행 — `core.hooksPath` 설정 + 실행권한 + `scripts/hooks/` 를 `~/.claude/hooks/` 로 복사 + `~/.claude/settings.json` PostToolUse hook 등록 + 초기 sync + SSOT 검증. |
| `scripts/hooks/` | Claude Code hook 템플릿 (git tracked). `setup.sh` 가 사용자 홈으로 복사. 저장소 수정 시 `setup.sh` 재실행으로 갱신. |
| `.github/workflows/ssot-check.yml` | PR/push 시 CI 에서 SSOT + 스킬 wrapper 자동 검증. 로컬 pre-commit 우회해도 여기서 차단. |
| `.githooks/pre-commit` | 커밋 전 SSOT + 스킬 wrapper + lint + typecheck + db-drift 자동 점검. |
| `~/.claude/hooks/reminder.sh` | 매 프롬프트마다 규칙 주입 + SSOT integrity 경고 + AGENTS.md 로드 지시. |

## 왜 AGENTS.md가 SSOT인가

- Codex CLI는 CWD에서 상위로 올라가며 `AGENTS.md`를 세션 시작 시 로드한다 — 포인터 없이 직접 읽힌다.
- Claude CLI는 `CLAUDE.md`를 읽지만 `CLAUDE.md`가 `AGENTS.md` 포인터를 포함하면 같은 내용에 접근 가능하다.
- 따라서 **Codex 측 기본 파일을 SSOT**로 삼고, Claude 측은 포인터로 참조하는 구조가 drift를 원천 차단한다.
- 공용 규칙 본문을 `CLAUDE.md` 또는 `AGENT-RULES.md` 같은 별도 파일로 복제하는 시도는 **금지**한다.

---

# 1. Meta Rules (작업 로그·병렬 운영·동등성)

## 1.1 작업 로그 원칙 (모든 작업·모든 스킬 공통, 최우선)

- 모든 계획문서, 백로그, PR 초안, 작업 로그, 세션 기록의 기본 저장 위치는 `personal_space/ai-log/YYYY-MM-DD/`.
- 계획/설계/영속 문서는 `personal_space/docs/`.
- 2026-04-23 부로 최상위 `ai-log/`, `docs/`는 `personal_space/` 아래로 이동. **`personal_space/` 바깥에 새 로그를 만들지 않는다.**
- 실행 주체 기반 파일명:
  - 작업중: `N-작업-{claude|codex}_{시작HHMM}-{예상종료HHMM}_{주제}_[작업중].md`
  - 완료: `N-작업-{claude|codex}_{시작HHMM}-{실제종료HHMM}_{주제}_[완료].md` (rename)
- 완료 처리 시 반드시 (1) 파일명의 종료시각을 실제 시각으로 교체, (2) suffix를 `_[작업중]` → `_[완료]`로 rename, (3) 문서 내부 "실제 종료" 필드 동기화.
- 작업 시작 전 의무: `ls personal_space/ai-log/<오늘>/` + 전일 `[작업중]` 문서 열람 → 상대 주체(Claude/Codex) 작업 범위 파악 → 파일/디렉토리 범위 겹치면 재분할.

## 1.2 병렬 CLI 운영 규칙 (Claude ↔ Codex)

- **큰 작업(다중 파일·다중 도메인)은 먼저 "Claude/Codex 두 주체로 분할 가능한가?"를 검토**하고 분할 계획을 제시한 뒤 착수. 분할 불가 판단은 이유를 로그에 남긴다.
- 같은 파일/모듈은 두 주체가 동시에 건드리지 않는다. 범위 겹치면 재분할 후 착수.
- 같은 워크트리에서 두 CLI를 동시에 돌리지 않는다 (git index 충돌).
- push 직전 `git fetch origin && git rebase origin/develop`로 상대 주체 머지 반영 확인.
- 워크트리 배치: Claude는 C 워크트리(`yeon-c`) 고정. Codex 배치는 작업 시작 시 `[작업중]` 문서에 명시.

## 1.3 Codex ↔ Claude 동등성 원칙

- 두 주체는 언제나 같은 설정 정보를 가진다. 규칙/설정을 한 쪽에만 수정하지 않는다.
- 미러 관계:
  - **전역 SSOT**: `~/.codex/AGENTS.md` (실제 파일), `~/.shared-agent-rules.md`는 symlink, `~/.claude/CLAUDE.md`는 포인터 섹션만
  - **프로젝트 SSOT**: 이 파일 (`AGENTS.md`). `CLAUDE.md`는 포인터만 + OMC skill 기호 등 Claude-only 짧은 언급
  - **스킬**: `.claude/skills/<name>.md` 또는 `.claude/commands/<name>.md`가 source, `.codex/skills/<name>/SKILL.md`는 wrapper. `bin/sync-skills.sh`가 wrapper 자동 생성.
- **전역 vs 프로젝트 역할 분리**: 전역 `~/.codex/AGENTS.md`는 **meta-rule과 선언**만(작업 로그·동등성 원칙 공통 뼈대). 프로젝트 AGENTS.md는 **구체 적용과 프로젝트 특화 규칙**. 충돌 시 프로젝트 조문이 우선.
- **메모리 ↔ AGENTS.md 동기화**: Claude `memory/*.md`는 Codex가 접근 불가하다. 사용자가 장기 지시("평생 기억해")를 내리면 Claude 메모리 저장과 **동시에** 반드시 이 파일(또는 전역 SSOT)에도 같은 조문을 기록한다. 메모리 단독 저장은 동등성 원칙 위반.
- Settings 예외: `~/.claude/settings.json`(JSON) ↔ `~/.codex/config.toml`(TOML)은 포맷 차이로 완전 SSOT 불가. 양쪽 다 수동 갱신. `bin/sync-settings.sh`로 두 설정의 MCP 서버 목록을 시각적 비교 가능.
- 규칙 변경 직후 반드시 `bin/verify-ssot.sh` 실행. 포인터/symlink 끊기면 `bin/repair-ssot.sh` 즉시 실행.
- 포인터 파일(`CLAUDE.md`, `~/.claude/CLAUDE.md`)에 본문을 복제하려는 시도는 거부한다.

## 1.4 Codex wrapper 에서의 필수 Read (C3 대응)

`.codex/skills/<name>/SKILL.md`는 wrapper일 뿐 절차의 출처가 아니다. Codex 는 wrapper 를 읽는 즉시 **첫 단계로 `Read(".claude/commands/<n>.md")` 또는 `Read(".claude/skills/<n>.md")` 를 호출**해야 한다. wrapper 안의 요약만으로 스킬을 수행하면 실제 절차와 크게 달라진다. 이 규칙은 `bin/sync-skills.sh` 가 생성하는 wrapper 템플릿에 포함되어 있다.

## 1.5 작업 문서 표준 헤더

```markdown
# 작업-{claude|codex} | 주제명

- 주체: Claude CLI / Codex CLI
- 워크트리: A / B / C
- 브랜치: feat/<branch-name>
- 작업창(예상): HH:MM ~ HH:MM
- 실제 시작: HH:MM
- 실제 종료: _(작업중)_  ← 완료 시 실제 시각 기록
- 상태: 작업중 / 완료

## 파일·디렉토리 범위 (whitelist)
## 절대 건드리지 않을 범위 (상대 주체 담당)
## 상대 주체 현황 스냅샷
## 차수별 작업내용
```

---

# 2. 저장소 운영 / 브랜치 / 커밋 / PR

## 2.1 저장소 운영 상태

- 이 저장소는 `study-platform-client`의 브랜치, 커밋, push, PR 운영 방식을 그대로 채택한다.
- 원격 상태는 2026-04-06 기준 `origin/main`만 존재한다. 첫 통합 단계에서 `main`에서 `develop`을 생성해 push.
- `develop`은 develop 서버 기준 브랜치, `main`은 운영 기준 브랜치다.
- **배포 도메인**: `yeon.world` (운영, main), `dev.yeon.world` (개발, develop).
- 이 저장소는 `pnpm` workspace monorepo다.

## 2.2 항상 수행 (작업 시작 시)

1. 아래 파일을 먼저 확인한다.
   - `AGENTS.md` (이 파일, SSOT)
   - `AGENTS.local.md` (존재할 때만)
   - `CLAUDE.md` (Claude 측 포인터 + OMC 기호)
   - `CLAUDE.local.md` (개인 환경/습관)
   - `.claude/agents/README.md`, `.codex/project-context/README.md`
2. `.claude/skills/`, `.claude/memory/`, `.claude/agents/` 파일 목록으로 현재 규칙 구성을 파악한다.
3. `.claude` 하위 파일 전체를 매번 읽지 않고, 요청과 직접 관련된 파일만 지연 로딩.
4. git 관련 작업은 `.claude/skills/git-pr-workflow.md`를 함께 확인.
5. 코드 변경 작업에는 `.claude/agents/code-quality-guardian.md`를 동반 적용.
6. UI/UX 작업은 `ui-ux-pro-max` → 21st 도구 → `.claude/skills/design-eye.md` 순서로 검토.

## 2.3 Worktree 병렬 작업 안전 규칙 (절대 강제)

### 워크트리 배치
- 최대 3개: **A**(기본, `/home/osuma/coding_stuffs/yeon`), **B**(사용자 지정), **C**(사용자 지정).
- 사용자가 A/B/C를 명시 지정하면 그 worktree에서만 작업. 자의적으로 worktree를 만들거나 옮기지 않는다.
- 3개 초과 생성 금지.

### 금지 사항
1. 같은 브랜치를 두 워크트리에서 동시에 체크아웃하지 않는다 (git index 공유로 커밋 꼬임).
2. 어떤 워크트리에서도 `develop` 브랜치에 직접 커밋하지 않는다 (PR 머지로만 변경).
3. rebase 없이 push하지 않는다.
4. `--force-push`는 금지. `--force-with-lease`만 허용.

### 필수 절차
1. 브랜치 생성: 각 워크트리는 `origin/develop`에서 독립 브랜치를 만든다.
2. 작업 시작 전: `git fetch origin && git rebase origin/develop`.
3. push 직전: 같은 명령으로 다시 rebase (작업 중 다른 워크트리가 먼저 머지했을 수 있음).
4. PR 머지 직전: GitHub에서 충돌 확인 → 로컬 rebase → `--force-with-lease` → 재확인 → 머지.
5. 상대 워크트리 PR 머지 직후: 즉시 fetch + rebase로 기준점 갱신.

### 머지 순서
- 두 워크트리가 **같은 파일 수정**: 변경 범위 작은 PR 먼저 머지 → 남은 워크트리 rebase.
- **서로 다른 파일만 수정**: 순서 무관.

### 작업 범위 분리 원칙
- 병렬 작업 시작 전 각 워크트리 범위를 **파일 또는 디렉토리 단위로 분리**.
- 부득이 같은 파일을 수정하면 수정 영역(함수, 섹션) 겹치지 않게 사전 합의.
- 범위가 겹칠 수밖에 없는 작업은 병렬 금지, 순차 처리.

## 2.4 브랜치·커밋·머지 절대 원칙

### 2.4.0 단일 브랜치 연속 작업 원칙 (최우선, 사용자 명시 override)

**사용자가 `ship` / `deploy-all` / `commit` / "새 브랜치에서 해" 같은 명시 명령을 내리기 전까지는 현재 작업 중인 feat 브랜치를 절대 떠나지 않는다.** 보안/신규 기획/백로그 작성/리팩터/코드 수정 등 무엇이 들어와도 브랜치를 분리하지 말고 같은 브랜치에 **누적**해서 작업한다.

이 조문은 아래 "모든 작업은 origin/develop 에서 새 브랜치" 규약을 **override**한다. 브랜치를 쪼개고 싶은 상황이어도 사용자 명시 지시 없이는 그렇게 하지 않는다.

- 새 작업 요청이 와도 `git switch`, `git checkout -b`, `git worktree add` 금지.
- "브랜치 분리해서 정리하는 게 깔끔해 보인다"는 이유로 자발적 분리 금지.
- 같은 브랜치에 누적되어 PR 단위가 커지는 건 사용자가 감수하기로 결정한 사항.
- 커밋은 사용자의 `commit`/`ship` 명령이 있을 때만. 그 전엔 working tree 누적.
- 사용자가 직접 "새 브랜치에서 해", "feat/X 브랜치 만들어"라고 명시한 경우에만 브랜치 전환.

### 2.4.1 일반 규약 (단, §2.4.0 override 적용)

- 브랜치 생성이 명시적으로 지시된 경우: `git switch -c <type>/<name>-<N> origin/develop`.
- **모든 작업은 반드시 커밋 → push → PR → develop 머지까지 완료** (단, 커밋 시점은 §2.4.0).
- 다른 에이전트가 이미 작업한 브랜치가 있으면 그 위에 올려서 PR/머지.
- 브랜치명은 `<type>/<name>-<N>` 형태. suffix 숫자 필수. `split/` prefix는 기본 규칙으로 사용하지 않는다.
- 새 landing 단위의 첫 브랜치만 최신 `origin/develop`에서 분기. 같은 landing 단위의 후속 수정은 기존 브랜치 유지.
- 별도 landing 단위가 필요할 때만 현재 브랜치를 base로 stacked branch (이것도 §2.4.0 하에서는 사용자 명시 지시 전까지 금지).

## 2.5 변경 단위 운영 규칙

- 기본: `1 landing 단위 = 1브랜치 = 1PR`. `landing 단위` = "함께 리뷰되고 함께 머지되어야 하는 최소 변경 묶음".
- 서로 다른 책임을 한 작업에 섞지 않는다 (예: API 계약 + UI + 스타일 + 리팩토링 한 커밋 금지).
- 하나의 green 단위로 자를 수 없으면 구현을 밀지 말고 더 작은 단위로 재분할.
- 같은 landing 단위의 구현 보완/리뷰 반영/검증 보완/연계 수정은 같은 브랜치·같은 PR에서 처리.
- 여러 에이전트가 같은 landing 단위 동시 작업 허용 — 같은 브랜치에서 통합.
- 별도 PR이나 별도 머지 순서가 필요한 후속 작업만 stacked PR로 분리.
- 사용자가 `develop에 반영`, `develop에 올려`, `develop에 붙여`, `dev에 반영`이라고 요청하면 **브랜치→커밋→push→PR→머지 전체 규칙**을 수행하는 뜻으로 해석. direct merge/push 아님.
- 명시적 지시 없는 한 `깨진 중간 상태 커밋`, `direct develop merge`, `direct main merge` 금지.

## 2.6 커밋 요청 고정 절차

사용자가 커밋 요청 시:
1. 자기 작업 파일만 `git add <path>`. `git add .` 금지 (다른 에이전트 변경과 섞임 방지).
2. add 직후 빠르게 `git commit`.
3. 작업 브랜치 커밋 후 빨리 `develop`에 머지.
4. `develop` 기준으로 `pnpm lint` → `pnpm prettier:fix` → `pnpm typecheck`.

커밋 메시지:
- 반드시 한국어, 구체적으로.
- 최소한 변경 대상 + 핵심 동작 변화 + 수정 의도가 드러나야 한다.
- `fix: 수정`, `fix: 리뷰 반영`, `refactor: 정리`, `chore: 반영` 같은 모호한 메시지 금지.
- 가능하면 `type: 영역 + 무엇을 왜 바꿨는지`.

## 2.7 green 검증 규칙

- 모든 커밋은 단독 checkout 시 동작 가능한 상태여야 한다. "다음 브랜치 올라와야 동작" 커밋 금지.
- 커밋 전 기본 순서: `lint --fix` → `prettier:fix` → `typecheck` → 필요 시 `build` → `git add` → `git commit`.
- 스크립트가 없으면 미실행 사유 먼저 공유.
- 다중 에이전트 동시 작업 시 통합 검증 기준 브랜치는 `develop`.

## 2.8 push 규칙

- green 검증 후 push.
- 새 브랜치 첫 push는 `git push -u origin <branch>` (upstream 연결).
- stacked branch는 아래쪽 PR 먼저 존재하도록 순차 push.
- rebase/restack 후 push는 본인 브랜치만 `--force-with-lease`.
- 명시적 지시 없는 한 `develop`/`main`에 직접 push 금지.

## 2.9 PR 규칙 + 고정 절차

- 각 브랜치는 정확히 하나의 PR에 대응. 후속 수정은 기존 PR에 반영.
- 첫 작업 PR의 base는 `develop`. stacked PR은 직전 PR을 base.
- assignee는 항상 `Hyeonjun0527`. 비어 있으면 즉시 수정.
- PR 제목·본문은 구체적으로. 본문 최소: 작업 내용 / 변경 이유 / 검증 방법 / 브랜치 정보(base, head, 순번).

PR 생성 절차:
1. 최신 브랜치 상태 push.
2. `gh pr create --base <base> --head <head> --title "<구체적 제목>" --body-file <본문파일>`.
3. `gh pr edit <pr> --add-assignee Hyeonjun0527`.
4. PR 본문이 길거나 여러 차수면 `personal_space/ai-log/YYYY-MM-DD/...PR_DRAFT.md`에 먼저 작성.
5. PR 열린 뒤 base, head, assignee, 본문 필수 항목 재확인.

앞 PR이 머지되면 뒤 PR은 최신 `origin/develop` 기준으로 재rebase + 검증 후 머지.

## 2.10 개발 완료 필수 원칙

개발 코드 작업 종료 시:
1. 테스트 (lint, typecheck, build).
2. 커밋.
3. push.
4. PR 생성 (또는 기존 PR에 push).
5. `develop` 머지 (`gh pr merge`).

사용자 확인 없이 자동 진행. 실패 단계는 그 시점에 보고. 브랜치명에 `-1`, `-2`, ... suffix 필수.

## 2.11 예외 규칙

- `1브랜치 1PR`로 안전하게 다룰 수 없으면 임의로 진행하지 않는다.
- backlog 문서에 재분할안을 작성하고 사용자 확인 후 진행.
- 명시적 재지시 없는 한 `깨진 중간 상태 커밋`, `direct merge` 금지.

## 2.12 다중 에이전트 동시 작업 규칙

- 많은 에이전트가 동시에 작업할 수 있음. 파일이 갑자기 수정되어도 놀라지 않고 다른 에이전트 변경으로 간주.
- 다른 에이전트 변경 우선 존중. 텍스트 충돌/semantic conflict 없으면 되돌리거나 덮어쓰지 않는다.
- 자기 담당 파일만 pathspec으로 `git add`. `git add .` 금지.
- 같은 파일 함께 만지면 "마지막 작성자 승리" 대신 최소 범위만 다시 맞춘다.
- `merge conflict`뿐 아니라 상태 전이/공용 DTO/공용 정책/공용 쿼리 의미가 어긋나면 `semantic conflict`로 본다.

---

# 3. 제품 / 프로젝트 컨텍스트

## 3.1 Project Overview

`yeon`은 **20~30대 성인 대상 부트캠프/프로그램을 운영하는 교육기관용 플랫폼**이다.
코딩 부트캠프, 디자인 스쿨, 데이터 분석 과정 등 성인 교육 프로그램 맥락. 학교·초중고 학원이 아니다.

### 핵심 기능
- **멘토링 녹음 + AI 요약**: 1:1 상담, 멘토링, 수업 기록을 녹음하고 AI로 자동 전사·요약
- **수강생 관리**: 스페이스(기수/프로그램) 단위 그룹핑
- **스페이스**: 사용자 정의 관리 단위 (예: "백엔드 3기", "디자인 스쿨 2026 상반기")

### 용어 규칙

| 사용하지 않는 표현 | 올바른 표현 | 비고 |
| --- | --- | --- |
| 학생 | 수강생 (member) | 20~30대 성인 |
| 학년 | 트랙/과정 (track) | 백엔드, 프론트엔드, 데이터 등 |
| 보호자/학부모 | 해당 없음 | 성인 대상 |
| 반 (수학A반) | 스페이스 (space) | 기수, 프로그램, 코호트 |
| 년도 탭 | 스페이스 탭 | 사용자 생성·관리 |
| 강사 | 멘토/운영자 | |
| 상담 | 멘토링/1:1 상담 | |

### 대상 사용자
- **운영자**: 부트캠프/프로그램 운영 담당자
- **멘토**: 수강생과 1:1 멘토링을 진행하는 교육자
- **수강생**: 20~30대 성인 (보호자 개념 없음)

## 3.2 현재 제품 집중 방향

- 우선 제품 가설: 단순 `상담 요약 기능`이 아니라 `상담 기록 워크스페이스`.
- `녹음/업로드 -> 고품질 STT -> 원문 전체 열람 -> 구조화 요약 -> 원문 기반 AI 채팅 -> 학생별 누적 기록` 흐름을 먼저 닫는다.
- 원문 텍스트는 부가 자료가 아니라 신뢰의 source of truth. 요약만 보여주는 방향으로 후퇴하지 않는다.
- STT 품질, 원문 누락 여부, 긴 상담 처리 안정성 > 장식 기능.
- AI 요약은 실무형 구조: `핵심 상담 내용` / `학생 문제 포인트` / `보호자 요청사항` / `다음 액션`. `다음 액션`은 판단이 아니라 추천이며 사용자가 수정/삭제/추가 가능해야 한다.
- 상담 AI 채팅은 일반 지식형 챗봇이 아니라 **현재 선택 상담 원문 근거**로 답하는 문서 탐색 보조.
- 기본 화면: 왼쪽 상담 리스트 / 가운데 원문 중심 본문 / 오른쪽 AI 채팅.
- 과한 감정 판정, 근거 없는 학생 평가, 자동 확정 판단 피한다.
- 학생별 기록 누적·검색·접근 권한은 제품 신뢰성의 일부.

## 3.3 모노레포 구조

- `apps/web`: Next.js 앱, 웹 전용 UI, 웹 전용 orchestration.
- `apps/mobile`: Expo 앱. 공용 HTTP API만 소비.
- `packages/*`: 런타임 독립 계약, 순수 도메인 로직, 토큰, 유틸리티.
- 별도 `apps/api`는 아직 두지 않는다.
- 공용 React UI 패키지도 아직 만들지 않는다.

---

# 4. Architecture / 경계

## 4.1 Workspace Boundaries

### apps/web
- Next.js App Router 앱
- 웹 전용 UI와 orchestration
- public HTTP endpoint: `src/app/api` 아래
- web-private flow만 `Server Actions` 허용
- server-only 구현: `src/server`

### apps/mobile
- Expo 앱
- `apps/web/src/server` import 금지
- 웹과 공용 기능은 public HTTP API로만 접근

### packages/api-contract
- request/response schema와 runtime validation 계약의 source of truth
- web route handler와 mobile/web client 모두 이 계약 기준

### packages/api-client
- typed fetch / client wrapper
- `api-contract`에는 의존 가능, app 내부 구현엔 의존 금지

### packages/domain
- 순수 비즈니스 개념만. DB/auth session/filesystem/framework runtime 코드 금지

### packages/design-tokens
- 색상/여백/타이포 cross-platform 상수. React 컴포넌트 금지

### packages/utils
- 작은 순수 헬퍼. 특정 앱/런타임 가정 금지

## 4.2 Dependency Direction

- `apps/web/src/app`은 route shell로서 `features`, `components`, `server` 진입점 사용 가능.
- `apps/web/src/features`는 `components` 사용 가능.
- `apps/web/src/components`는 `features`나 `app`에 의존 금지.
- `apps/mobile/app`은 `src/features`, `src/components` 사용 가능.
- `apps/mobile/src/features`는 `components` 사용 가능.
- `apps/*`는 `packages/*` import 가능.
- `packages/*`는 `apps/*` import 금지.
- `apps/mobile`은 `apps/web/src/server` import 금지.
- import cycle 회피를 위해 `packages/*`를 쓰레기통처럼 사용하지 않는다.

## 4.3 Folder Direction

웹:
```
apps/web/src/
  app/          # routes, layouts, route handlers
  components/   # reusable web UI
  features/     # feature-oriented slices
  server/       # actions, services, repositories, validators
  lib/          # app-local helpers
  types/        # app-local types
```

모바일:
```
apps/mobile/
  app/              # Expo Router routes
  src/components/   # reusable native UI
  src/features/     # feature-oriented slices
  src/services/     # API consumption and orchestration
  src/providers/    # app providers
  src/theme/        # token-to-native mapping
```

## 4.4 아키텍처 경계 원칙

- `apps/web/src/app`: 라우팅, layout, metadata, route handler, server boundary.
- `apps/web/src/features`: 웹 유스케이스 단위 UI와 orchestration.
- `apps/web/src/components`: 도메인 비의존 웹 공용 UI.
- `apps/web/src/server`: server-only 구현.
- `apps/mobile/app`: Expo Router 경계.
- `apps/mobile/src/features`: 모바일 유스케이스 단위 UI와 상태.
- `apps/mobile/src/services`: 공용 API 소비, 재시도, 토큰 저장, 모바일 orchestration.
- `packages/*`: 런타임 독립 공유 자산만.

---

# 5. 구현 원칙

## 5.1 Implementation Principles

- 파일 위치와 API 계약이 확인되면 탐색을 길게 끌지 말고 구현 시작.
- 존재하지 않는 API, route handler, package export를 추측해서 만들지 않는다.
- 같은 파일을 여러 번 왕복 수정 금지. 한 번에 정리.
- 루트 `package.json`에 없는 스크립트는 있다고 가정하지 않는다. 항상 실제 `package.json`과 해당 workspace의 `package.json`을 먼저 확인.
- 브랜치/커밋/push/PR 운영은 이 문서(§2)와 `.claude/skills/git-pr-workflow.md` 따름.
- **`apps/web`에서 서버 데이터 fetch는 반드시 TanStack Query(`useQuery`, `useMutation`).** 수동 `fetch + useState + useEffect` 금지. 기존 수동 fetch 수정 시 함께 마이그레이션.
- 값이 진실의 원천이 되도록 설계. API 계약 SSOT는 `packages/api-contract`.
- raw 문자열 분기 남발 금지. 같은 의미를 두 번 이상 비교하면 상수 객체로 승격.
- 한 파일 내부 일회성 구현까지 과잉 추상화 금지.
- TypeScript `enum`은 런타임 산출물이 실제로 필요한 경우만. 기본은 `as const` 객체 + literal union.
- Single Responsibility. 정책 선언/상태 해석/부수효과 실행/UI 렌더 분리.
- 깊은 `if` 중첩보다 의미 있는 상태 변수, 조기 반환, 매핑 테이블, 보조 함수/컴포넌트.
- 과한 추상화 피한다. 하나의 앱에서만 쓰는 걸 섣불리 `packages/*`로 올리지 않는다.
- 로그/오류 메시지/실패 이유는 특별한 외부 계약 없는 한 **한국어** 기본.

## 5.2 Execution Efficiency Rules

- 오래 걸리는 탐색/빌드/테스트/에이전트 작업은 가능하면 background + 독립 작업 먼저.
- Background 위임은 기다리는 동안 할 독립 작업이 실제로 있을 때만. 다음 판단이 결과에 즉시 의존하면 foreground.
- 장시간 대기 들어가면 타임아웃까지 기다리지 말고 현재 완료 범위와 남은 대기 이유 먼저 공유.
- Background 탐색이 `<system-reminder>` 안 오면 degraded로 보고 현재 상태 공유 후 로컬 grep/read/ast-grep 또는 foreground 재실행.
- 큰 요청도 짧은 실행 단위로 나눠 각 단계 끝마다 결과 공개.
- 같은 탐색 반복 금지. 한 번 확인한 내용은 재사용. 막히면 다른 접근 전환.
- 장시간 무응답 금지. 진행 불가면 현재 상태와 다음 액션 짧게 보고.
- 외부 에이전트 결과 알림만 기다리며 응답을 끝내지 않는다. 알림 없으면 fallback.

## 5.3 Completion Criteria

- 코드 수정 후 변경 범위에 맞는 lint, format, typecheck, test, build 가능 범위 내 실행.
- 검증 순서:
  1. lint fix
  2. format fix
  3. typecheck
  4. `pnpm --filter @yeon/web build` (Next.js 빌드) — **반드시 실행**
  5. 필요 시 test
- **커밋 전 untracked 파일 확인 필수**: `git status --short | grep "^??"`. `??` 파일을 import하면 로컬 타입체크는 통과해도 Docker 빌드 실패. import 관계 파일은 반드시 함께 커밋.
- **CSS Modules 제약**: `.module.css`에서 `*`, `html`, `body` 전역 셀렉터 단독 사용 금지. `.page *` 같은 로컬 클래스로 스코프. Turbopack은 "Selector is not pure" 에러로 거부.
- workspace에 스크립트가 없으면 없는 척 채우지 말고 검증 불가 이유 명시.
- 문서 전용 변경은 최소한 `git diff --check` 형식 검증.

## 5.4 DB Schema 변경 원칙

- **schema 파일(`apps/web/src/server/db/schema/**`) 수정 시 반드시 같은 commit에 마이그레이션 SQL 포함.** `pnpm --filter @yeon/web db:generate --name=<설명적 이름>` 후 결과 SQL 검토.
- **`drizzle-kit push`는 일회성 로컬 실험에만.** commit에서 마이그레이션 누락 시 schema/snapshot/`drizzle.__drizzle_migrations` 3중 drift 발생.
- **마이그레이션 SQL은 멱등(idempotent)으로.** develop/main push 시 자동 운영 배포(`.github/workflows/docker-image.yml` → `scripts/migrate.sh`) 실행.
  - `CREATE TABLE` → `CREATE TABLE IF NOT EXISTS`
  - `ADD COLUMN` → `ADD COLUMN IF NOT EXISTS`
  - `CREATE INDEX`/`DROP INDEX` → `IF [NOT] EXISTS`
  - `ADD CONSTRAINT`: `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN null; WHEN duplicate_table THEN null; END $$;`. `duplicate_object`만 잡으면 unique constraint에서 `duplicate_table`로 깨진다.
- **검증 파이프라인**
  - 로컬: `pnpm --filter @yeon/web db:check:drift` (또는 루트 `pnpm validate`).
  - pre-commit: schema/migrations staged 시 자동 실행.
  - CI: `.github/workflows/db-drift.yml`.
- **머지 전 운영 DB 상태 확인.** drift 복구 마이그레이션은 운영 DB가 로컬/스테이징과 같은 상태인지 사전 점검.

## 5.5 Implementation Guardrails

- 공용 기능이 필요한데 web-only `Server Actions`로 먼저 닫지 않는다.
- `apps/mobile`에서 필요한 기능이면 처음부터 public HTTP API + shared contract.
- `packages/*`는 앱 내부 구현 상세에 의존 금지.
- 하나의 앱에서만 쓰는 UI/로직은 성급하게 shared package로 추출 금지.
- design token과 domain model 섞지 않는다.
- 반복되는 값은 source of truth로 승격, 한 파일 내부 일회성 디테일까지 과잉 추상화 금지.

## 5.6 Current Command Reality

- 루트 `package.json`에 workspace 메타데이터 위주. 실행 스크립트는 workspace별로 확인.
- 명령 실행 전 항상 해당 workspace의 `package.json` 먼저 확인.
- 스크립트가 있으면 `pnpm --filter <workspace> <script>` 또는 `turbo run <script> --filter=<workspace>` 우선.
- 루트 스크립트가 없는데 있다고 가정해 `pnpm lint`, `pnpm dev` 무조건 실행 금지.

---

# 6. Feature Structure / 명명

## 6.1 Feature Directory Structure

```
features/<feature-name>/
  <feature-name>.tsx          # 루트 조합 컴포넌트 (훅 호출 → 컴포넌트 연결)
  <feature-name>.module.css   # CSS Modules (공유 변수·미디어 쿼리 포함)
  types.ts
  constants.ts
  utils.ts(x)
  hooks/
    index.ts                  # 배럴 익스포트
    use-<name>.ts             # 커스텀 훅 (하나의 관심사)
  components/
    index.ts
    <component-name>.tsx      # 프레젠테이션 컴포넌트
```

### 파일 크기 경고 기준

| 대상 | 경고 기준 | 분리 방향 |
| --- | --- | --- |
| React 컴포넌트 | 300줄 | 커스텀 훅 추출 또는 하위 컴포넌트 분리 |
| 커스텀 훅 | 200줄 | 보조 함수를 utils로 분리하거나 훅을 쪼갬 |
| 서버 서비스 | 500줄 | 엔진·리포지토리·오케스트레이터로 역할 분리 |
| CSS 모듈 | 600줄 | 섹션 주석 정리, 미사용 클래스 정기 제거 |

### 커스텀 훅 규칙
- 훅 하나는 하나의 관심사만 (녹음, 오디오 재생, 목록 조회 등).
- 훅 파일명: `use-<관심사>.ts`.
- 루트 컴포넌트는 훅 호출 + 결과를 하위 컴포넌트 prop 전달하는 조합 역할만.
- 훅끼리 직접 import 금지. 의존 필요 시 루트에서 결과를 파라미터로 전달.

### 컴포넌트 분리 규칙
- 프레젠테이션 컴포넌트는 상태 직접 관리 금지, props로만 받음.
- CSS 모듈 하나인 경우 모든 컴포넌트가 공유 CSS import 가능. 공유 클래스·미디어 쿼리 교차 참조 많으면 무리하게 분할 금지.
- Props 인터페이스는 컴포넌트 파일 안에서 export.

### 서버 서비스 분리 규칙
- 500줄 넘기면 3계층 분리:
  - **엔진** (`*-engine.ts`): 외부 API 호출, 복잡한 알고리즘 (전사, 분석 등)
  - **리포지토리** (`*-repository.ts`): DB CRUD, Row→DTO 매핑, 유효성 검사
  - **서비스** (`*-service.ts`): 비즈니스 오케스트레이션, 스케줄링, export 함수
- export 시그니처 유지하면 route handler 변경 없이 분할 가능.

## 6.2 코드 일관성 — 명명 규칙

**목표: 누가 작성했는지 알 수 없는 코드. 판단 기준이 파일마다 달라지지 않는 코드.**

| 대상 | 규칙 | 예 |
| --- | --- | --- |
| 파일명 | kebab-case | `use-records.ts`, `student-list-screen.tsx` |
| 컴포넌트 | PascalCase | `StudentCard`, `EmptyState` |
| 훅 | camelCase, `use` 접두사 | `useRecords`, `useMemberList` |
| 상수 | UPPER_SNAKE_CASE | `POLL_INTERVAL_MS` |
| 타입/인터페이스 | PascalCase | `HomeViewState`, `Member` |
| 불리언 변수 | `is`/`has`/`can` 접두사 | `isLoading`, `hasError`, `canSubmit` |
| 이벤트 핸들러 | `handle` 접두사 | `handleSelectRecord`, `handleStartRecording` |

## 6.3 컴포넌트 내부 작성 순서

```ts
// 1. context / 외부 훅
// 2. 로컬 useState
// 3. ref
// 4. 파생값 (useMemo, 인라인 계산)
// 5. useEffect
// 6. 이벤트 핸들러 (useCallback)
// 7. return JSX
```

이 순서를 어기면 읽는 사람이 흐름을 역추적해야 한다.

## 6.4 데이터 fetch 일관성

- 서버 데이터는 무조건 `useQuery` / `useMutation`. 수동 fetch + useEffect 조합 금지.
- `useEffect` 안에서 `fetch()` 직접 호출 금지 — ESLint로 강제.
- `useEffect` async 콜백 금지 — ESLint로 강제.

## 6.5 렌더 상태 일관성

- 페이지/피처 단위로 `ViewState` discriminated union 하나 정의.
- 렌더는 오직 `viewState.kind` 하나만 보고 분기.
- boolean 여러 개 직접 조합 금지.

## 6.6 에러 처리 일관성

- API 에러 메시지는 한국어.
- 컴포넌트에서 `try/catch`로 에러 삼키지 않는다. `useQuery`의 `error` 상태나 `ViewState.kind === 'error'`로 올린다.
- 에러 바운더리는 route 레벨. 피처 내부 중복 선언 금지.

## 6.7 타입 단언 (`as`) 규칙

- `as`는 타입 시스템이 구조적으로 보장 못 하는 경우만.
- `as any` 금지. 어쩔 수 없을 때 `as unknown as T`로 명시 + 주석.
- 렌더 조건이 타입을 좁힌 상황의 cast(`viewState.kind as 'processing' | 'ready'`)는 허용.

---

# 7. UI / 스타일링

## 7.1 UI / UX Workflow

UI 작업 순서:
0. **코드 작성 전 현대적 디자인 먼저 구상.** 레이아웃/위계/여백/색상/상태 전이를 머릿속에서 그린 뒤 코드로.
1. `ui-ux-pro-max`로 디자인 시스템·UX 기준.
2. 21st 도구로 영감 수집/컴포넌트 생성.
3. `.claude/skills/design-eye.md` 기준 AI 티·위계·CTA·레이아웃 재검토.
4. 결과물을 저장소 구조와 스타일링 원칙에 맞게 정리.

생성 도구 코드를 그대로 신뢰 금지. 경계, 접근성, 상태 처리, import 구조 직접 검증.

## 7.2 Styling Rules

- 기본 Tailwind 유틸리티(`p-4`, `gap-6`, `rounded-lg`, `text-sm`) 허용.
- 반복 의미 생기는 색상/여백/반경/그림자만 점진적 토큰화.
- 기본 Tailwind scale 비활성화하기 위해 `global.css` theme 덮어쓰기 금지.
- `globals.css`/전역 스타일은 토큰, 최소 reset, 서드파티 전용 스타일만.
- 화면 전용/기능 전용/임시 수정용 스타일을 전역 CSS에 추가 금지.
- Tailwind 클래스는 가능한 한 정적 문자열. ``className={`p-${size}`}``, `bg-${color}-500` 같은 **동적 Tailwind class 생성 금지**.
- arbitrary value는 기존 scale/토큰으로 표현 못 하고 반복 가능성 명확할 때만 제한적으로.
- 반복 스타일 패턴은 `className` 복붙 대신 공통 UI 컴포넌트/variant로 승격.
- `div`/`button` 등에 즉석 Tailwind 조합 추가 전 기존 디자인 시스템 컴포넌트 재사용 확인.

## 7.3 스타일 이슈 디버깅 규칙

스타일 미적용 시 순서:
1. DOM에 해당 `className`이 실제로 붙어 있는지.
2. 해당 Tailwind 유틸리티 CSS가 생성됐는지.
3. 다른 CSS 선택자/전역 스타일이 덮어쓰는지.
4. `padding`, `margin`, `height`, `overflow`, `flex`, `box-sizing` 때문에 체감상 안 보이는지.

확인 없이 `!important`, 인라인 스타일, 불필요 래퍼로 덮지 않는다.

---

# 8. Empty State 렌더 원칙

"주의해서 짠다"로는 empty flash를 막을 수 없다. **잘못된 상태 조합 자체를 표현할 수 없게 구조를 바꾼다.**

`loading=false && data=[]`처럼 "미확정인지 진짜 빈 결과인지 알 수 없는" 조합이 코드에 존재하면 깜빡임 가능성은 살아있다.

## 8.1 단일 ViewState discriminated union

```ts
type ViewState<T> =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "ready"; data: T };
```

boolean 여러 개 직접 조합 금지. 반드시 변환 함수 하나 거침:

```ts
function toViewState<T>(query: UseQueryResult<T[]>): ViewState<T[]> {
  if (query.isPending) return { kind: "loading" };
  if (query.isError) return { kind: "error", message: "불러오기에 실패했습니다." };
  if (!query.data || query.data.length === 0) return { kind: "empty" };
  return { kind: "ready", data: query.data };
}
```

```tsx
const state = toViewState(membersQuery);
switch (state.kind) {
  case "loading": return <LoadingScreen />;
  case "error": return <ErrorScreen message={state.message} />;
  case "empty": return <EmptyScreen />;
  case "ready": return <StudentList items={state.data} />;
  default: { const _: never = state; return _; }
}
```

## 8.2 금지 패턴

```ts
// ❌ boolean 조합 직접 렌더
if (!loading && data.length === 0) return <EmptyState />
// ❌ data ?? [] 후 empty 판정
const members = query.data ?? [];
if (!loading && members.length === 0) return <EmptyState />
// ❌ phase/status 초기값 "empty"
const [phase, setPhase] = useState<Phase>("empty")
```

## 8.3 여러 query

```ts
function toMembersViewState(
  spacesQuery: UseQueryResult<{ spaces: Space[] }>,
  membersQuery: UseQueryResult<{ members: Member[] }>,
): ViewState<Member[]> {
  if (spacesQuery.isPending || membersQuery.isPending) return { kind: "loading" };
  if (spacesQuery.isError) return { kind: "error", message: "공간 정보를 불러오지 못했습니다." };
  if (membersQuery.isError) return { kind: "error", message: "수강생 정보를 불러오지 못했습니다." };
  const members = membersQuery.data?.members ?? [];
  if (members.length === 0) return { kind: "empty" };
  return { kind: "ready", data: members };
}
```

TanStack Query의 `enabled` 의존 체인으로 waterfall 위임 시 변환 함수가 더 단순.

---

# 9. Review / 회고 / 검증

## 9.1 Review Lens

- 상태 정합성
- source of truth 위치
- server/client 경계
- web/mobile 재사용 경계
- API 계약 drift 가능성
- cleanup 누락과 stale derived state
- partial update와 race condition

코드가 "그럴듯해 보이는지"보다 "거짓 상태가 남을 수 있는지"를 기준으로 검토.

## 9.2 코드 리뷰 원칙

- 목표: 어떤 리뷰가 와도 상태 전이, source of truth, 실패 경계, 사용자 영향까지 근거로 설명·방어할 수 있는 코드.
- 사용자가 코드리뷰 요청 시 `critical 3개 이상`, `major 3개 이상`, `minor 3개 이상` 검토 포인트를 찾는 것이 기본 목표. 실제 이슈가 그 수에 도달할 때까지 범위 확장.
- 상태 정합성 중심. 정상 흐름만 보지 말고 값 없음, decode 실패, null, undefined, empty, 이전 값, 중복 호출, 재시도, 부분 실패 먼저 의심.
- source of truth 식별. 원본과 파생 상태 구분.
- `set`/`save`/`write`/`add` 로직 보면 `delete`/`clear`/`remove`/`reset`도 함께 확인.
- 서버/클라이언트/SSR/route handler/shared package가 같은 개념 다루면 생성/갱신/삭제/fallback 규칙 일치 비교.
- 캐시/파생값/메모이즈/저장소/폼 상태는 원본 변경 시 함께 갱신·폐기되는지 확인.
- 비동기 로직은 항상 순서 뒤집힘과 race 의심.
- "맞아 보이는가" 아니라 "거짓 상태가 남을 수 있는가"가 기준.
- 리뷰 코멘트는 "어떤 불변식이 깨지는가", "어떤 사용자 영향이 생기는가", "왜 그런 버그가 생기는가"를 함께 설명.

## 9.3 로컬 검증 / E2E 원칙

- 실제 브라우저 검증은 Playwright 우선. UI 흐름 디버깅은 headed 모드.
- 로컬 서버/seed 스크립트 필요 시 먼저 저장소에 실제 명령·스크립트 있는지 확인.
- 실행 방법이 없으면 임의로 꾸며내지 말고 무엇이 비어 있는지 공유.
- 스냅샷/스크린샷만 보고 검증 완료 처리 금지. 상태 변화·네트워크·콘솔 오류까지 함께.
- 반복 로컬 검증 절차는 `.codex/skills` 또는 `.codex/guides`로 승격 검토.

## 9.4 회고 / 규칙 승격

- 같은 영역 수정이 세 번 이상 반복되거나 같은 유형 리뷰 코멘트가 반복되면 회고.
- 일반 안티패턴: `.claude/memory/anti-patterns.md`
- 버그 재발 패턴: `.claude/memory/bug-patterns.md`
- 작업 회고: `.claude/memory/retrospective-log.md`
- 반복 가능한 절차/저장소 전용 함정은 메모만 남기지 말고 `.codex/skills/<skill>/SKILL.md` 로컬 스킬로 승격 검토.

## 9.5 작업 중 공유

- 어떤 `.claude` 파일을 읽었는지 짧게 공유.
- 가이드와 실제 코드 충돌 시 코드베이스 현실에 맞춰 적용하고 근거 설명.
- 탐색/구현/검증 병렬화 가능하거나 범위가 둘 이상이면 멀티 에이전트·병렬 도구 우선 검토.
- 다중 에이전트 동시 작업 중 갑작스런 파일 수정은 다른 에이전트 변경일 수 있다고 보고 먼저 존중.
- 본인 작업과 직접 관련 없는 변경은 함부로 되돌리지 말고 소유 범위 나눠 각자 변경만 마감.

---

# 10. 개발 계획 / 백로그 규칙

- 코드 수정/리팩토링/설계 변경/API 추가/DDL 변경/구조 변경처럼 실제 개발 작업 전 반드시 백로그 문서 작성.
- 백로그는 `실제 개발 작업에 착수할 때` 또는 사용자가 `개발 계획`/`차수별 실행안` 요청 시 작성. 단순 질의응답/설명/조사/리뷰/현황 보고에는 자동 생성 금지.
- 경로: `personal_space/ai-log/YYYY-MM-DD/N-적당한이름_BACKLOG.md` (2026-04-23 이전 `personal_space/YYYY-MM-DD/...`는 하위 호환).
- `N-`은 날짜 디렉터리 내 생성 순번. 같은 날짜 첫 백로그는 `1-...`, 두 번째 `2-...`.
- 완료 백로그는 번호 유지하고 `(완)` 접미사로 보관.
- 실행 주체 기반 작업 문서는 `N-작업-{claude|codex}_{시작HHMM}-{종료HHMM}_{주제}_[작업중|완료].md` 형태 (§1.1 라이프사이클 따름).
- 개발 계획은 자유 서술형 메모 대신 `차수` 단위 backlog 형식.
- 각 차수는 "AI가 한 번의 프롬프트로 끝까지 수행할 수 있는 정도" 분량.
- 각 차수 최소 항목: `작업내용`, `논의 필요`, `선택지`, `추천`, `사용자 방향`.
- `사용자 방향`은 기본 빈칸. 비어 있으면 `추천` 기준으로 진행.

---

# 11. 로딩 우선순위 / 지연 로딩

## 11.1 로딩 우선순위

1. 사용자의 현재 요청
2. `AGENTS.md` (이 파일, 프로젝트 SSOT)
3. `AGENTS.local.md` (있을 때)
4. `CLAUDE.md` (포인터 + OMC 기호)
5. `CLAUDE.local.md` (개인 환경)
6. `.claude/skills/*`, `.claude/memory/*`, `.claude/agents/*`
7. `.codex/project-context/*`

## 11.2 필요 시 지연 로딩

요청 목적과 직접 관련된 파일만 추가로 읽는다.

- 설계/컴포넌트 작업: `.claude/skills/design-workflow.md`, `component-patterns.md`, `design-eye.md`
- Next.js/App Router: `.claude/skills/nextjs-patterns.md`
- Expo/RN: `.claude/skills/expo-patterns.md`
- 모노레포/패키지 경계: `.claude/skills/monorepo-patterns.md`
- git/commit/push/PR: `.claude/skills/git-pr-workflow.md`
- 검증 파이프라인: `.claude/skills/validate.md`
- 배포 플로우: `.claude/skills/ship.md`, `deploy-all.md`
- 코드 리뷰: `.claude/skills/code-review.md`
- 구현 전후 점검: `.claude/skills/self-improve-checklist.md`
- 회고/개선: `.claude/skills/retrospective.md`
- 재발 방지 참고: `.claude/memory/anti-patterns.md`, `.claude/memory/bug-patterns.md`
- 과거 회고: `.claude/memory/retrospective-log.md`
- 역할 분리 필요: `.claude/agents/*.md`

---

**이 파일은 git tracked. 이 저장소에 들어온 어떤 agent(Claude/Codex/다른 CLI)도 이 파일을 먼저 읽은 뒤 작업한다.**
