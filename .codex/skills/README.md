# Codex Skills

이 디렉터리는 두 종류의 Codex 스킬을 함께 관리한다.

- `.claude/commands` 또는 `.claude/skills`를 source of truth로 삼는 로컬 래퍼 스킬
- `oh-my-claudecode` 공개 저장소에서 vendoring 한 OMC 스킬

## 원칙

- 실제 동작 정의의 source of truth는 기존 `.claude/commands/*.md` 또는 `.claude/skills/*.md`다.
- `.codex/skills/<name>/SKILL.md`는 Codex가 해당 명령을 발견하고 실행할 수 있게 하는 얇은 래퍼만 둔다.
- Claude 쪽 문서가 바뀌면, Codex는 해당 source 파일을 다시 읽고 그 지침을 따라야 한다.
- OMC 스킬은 upstream `Yeachan-Heo/oh-my-claudecode`의 `skills/*` 디렉터리를 그대로 가져온다.

## 현재 미러링된 이름

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

<!-- SYNC-SKILLS:LOCAL:END -->

## Vendored OMC Skills

- source: `https://github.com/Yeachan-Heo/oh-my-claudecode/tree/main/skills`
- 현재 가져온 이름:

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
frontend-design-skill
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
writer-memory
```

## 호출 메모
