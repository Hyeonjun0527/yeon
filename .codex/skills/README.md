# Codex Skills — Yeon Routing Catalog

이 디렉터리는 Codex가 **필요할 때만 세부 절차를 읽기 위한 선택적 지식 모듈**이다. `AGENTS.md`는 baseline/override만 유지하고, 낮은 빈도 세부 지식은 여기에서 로드한다.

<skill_catalog_policy>

- Direct child directories under `.codex/skills/<name>/SKILL.md` are vendored/OMX-provided skills.
- User-authored shared skills live under `.codex/skills/SHARED/<name>/SKILL.md`.
- `.claude/commands/*.md` 또는 `.claude/skills/*.md`가 source of truth인 사용자 제작 스킬은 `SHARED/` 아래 thin wrapper로 유지한다.
- Vendored OMC skills는 upstream 절차를 보존하되, Yeon 정책과 충돌하면 project `AGENTS.md`의 main-only override가 우선한다.
- `.codex/skills-archive/`는 Codex 기본 skill discovery에서 빼기 위한 보관소다. AI가 자동으로 읽을 문서가 아니라, 필요할 때 사람이 다시 살리거나 참고하기 위한 parked 자료다.

</skill_catalog_policy>

## Routing first: which skill should an AI read?

### 1. Core execution workflows

Use only when the user explicitly asks for persistent or autonomous workflow behavior.

- `ralph` — persist until verified complete.
- `autopilot` — full autonomous execution pipeline.
- `team` / `ultrawork` — coordinated parallel execution.
- `ralplan` / `plan` / `deep-interview` — requirements and consensus planning.
- `cancel` — exit active workflow state.

### 2. Yeon repo-local knowledge

Use for normal Yeon development.

- `yeon-project-context` — product, architecture, implementation, DB, UI, validation details.
- `git-pr-workflow` — main-only branch/PR policy.
- `ship` — main-only PR merge flow.
- `deploy-all` — main-only production deployment.
- `validate` / `verify` — verification pipeline.
- `nextjs-patterns`, `expo-patterns`, `monorepo-patterns`, `component-patterns` — framework/boundary details.

### 3. Review, cleanup, and quality

- `code-review` — structured critical/major/minor review.
- `ai-slop-cleaner` — regression-safe cleanup/deslop.
- `review-repo`, `bug-repo`, `refactor-repo` — repository-wide inspection.
- `self-improve-checklist`, `retrospective` — post-change learning and guardrails.

### 4. UI / product design

- `design-workflow`, `design-eye`, `ui-ux-pro-max`, `frontend-design`.

### 5. OMC/Codex operations and tooling

- `setup`, `omc-setup`, `omc-doctor`, `mcp-setup`, `configure-notifications`, `hud`, `trace`, `debug`, `omc-reference`, `skill`, `skillify`, `learner`, `remember`, `wiki`, `session-insights`, `wrap`.

### 6. Specialized / experimental

- `ccg`, `sciomc`, `self-improve`, `external-context`, `deep-dive`, `project-session-manager`, `release`, `ultraqa`, `visual-verdict`.

### 7. Archived / not default-routed

- `.codex/skills-archive/writer-memory` — useful for fiction/writing projects, not default Yeon development routing.

## User-authored SHARED skills

These are generated under `.codex/skills/SHARED/` from `.claude/commands` or `.claude/skills`. Do not edit their wrappers directly; edit the source and run `bin/sync-skills.sh`.

<!-- SYNC-SKILLS:LOCAL:BEGIN -->

- `bug-repo`
- `clarify`
- `code-review`
- `component-patterns`
- `deploy-all`
- `design-eye`
- `design-workflow`
- `expo-patterns`
- `git-pr-workflow`
- `monorepo-patterns`
- `nextjs-patterns`
- `ralph-strict`
- `refactor-repo`
- `retrospective`
- `review-repo`
- `self-improve-checklist`
- `session-insights`
- `ship`
- `validate`
- `wrap`
- `yeon-project-context`

<!-- SYNC-SKILLS:LOCAL:END -->

## Vendored OMC Skills

These are vendored / OMX-provided skills kept as direct children of `.codex/skills/`.

- source: `https://github.com/Yeachan-Heo/oh-my-claudecode/tree/main/skills`
- current active vendored names:

```txt
ai-slop-cleaner
ask
autopilot
cancel
ccg
configure-notifications
debug
deep-dive
deep-interview
deepinit
external-context
frontend-design
hud
learner
mcp-setup
omc-doctor
omc-reference
omc-setup
omc-teams
plan
project-session-manager
ralph
ralplan
release
remember
sciomc
self-improve
setup
skill
skillify
team
trace
ui-ux-pro-max
ultraqa
ultrawork
verify
visual-verdict
wiki
```

## Cleanup decisions

- `frontend-design-skill` was renamed to `frontend-design` to match its frontmatter name and make invocation predictable.
- Stray `.codex/skills/clarify.md` was removed; the discoverable wrapper is `.codex/skills/SHARED/clarify/SKILL.md`.
- User-authored wrappers were moved from `.codex/skills/<name>/` to `.codex/skills/SHARED/<name>/` so they are visually separate from OMX-provided skills.
- `writer-memory` was moved to `.codex/skills-archive/` because it is unrelated to Yeon's coding/product workflow and should not appear in default skill routing.
