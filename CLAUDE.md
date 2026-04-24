# CLAUDE.md — Claude CLI 포인터

이 파일은 Claude CLI 전용 포인터 파일이다. **이 저장소의 공용 규칙은 `AGENTS.md`에만 정의된다.**

## 최우선: AGENTS.md 먼저 읽기

- **작업 시작 전 반드시 `AGENTS.md` 를 먼저 읽는다.**
- 작업 로그 원칙, 병렬 CLI 운영 규칙, Codex ↔ Claude 동등성 원칙, Architecture, 구현 원칙, 스타일링, Empty State, Review Lens, 백로그 규칙 등 **모든 공용 규칙**은 `AGENTS.md`에 있다.
- 이 파일에 공용 규칙 본문을 복제하면 drift를 유발한다 — 금지. 새 규칙은 반드시 `AGENTS.md`에서만 편집한다.
- Codex는 `AGENTS.md`를 직접 로드하고, Claude는 이 포인터를 통해 같은 파일을 본다 — SSOT 하나로 두 주체가 동일한 정보를 가진다.
- 전역 공용 규칙은 `~/.codex/AGENTS.md` (실제 파일). `~/.shared-agent-rules.md`는 symlink. `~/.claude/CLAUDE.md`에는 전역 포인터 섹션만 있다.

## Claude CLI 전용 기호 / OMC skill 참고

- 이 저장소는 OMC(oh-my-claudecode) 레이어를 사용한다. 공용 규칙에 더해 Claude 측에서만 의미 있는 skill 기호가 있다:
  - `/oh-my-claudecode:ralph`, `/oh-my-claudecode:autopilot`, `/oh-my-claudecode:cancel` 등 OMC 표준 skill
  - `/ralph-strict` — 이 저장소 로컬 스킬 (ralph에 deep-interview + code-review 의무화)
  - `/validate`, `/ship`, `/deploy-all`, `/code-review`, `/wrap` 등 로컬 스킬
- Codex 측 대응 wrapper는 `.codex/skills/<name>/SKILL.md`에 자동 생성된다 (`bin/sync-skills.sh`).
- hook: `~/.claude/hooks/reminder.sh`가 매 UserPromptSubmit에서 SSOT 경로와 핵심 규칙을 주입한다. Codex는 hook 없이 `AGENTS.md`를 세션 시작 로드로 동일 정보를 받는다.
