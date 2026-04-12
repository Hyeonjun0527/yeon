# Codex Custom Skill Mirrors

이 디렉터리는 `.claude/commands`에 정의된 Claude 커맨드를 Codex에서도 같은 이름으로 호출할 수 있게 맞춘 래퍼 스킬 모음이다.

## 원칙

- 실제 동작 정의의 source of truth는 기존 `.claude/commands/*.md` 또는 `.claude/skills/*.md`다.
- `.codex/skills/<name>/SKILL.md`는 Codex가 해당 명령을 발견하고 실행할 수 있게 하는 얇은 래퍼만 둔다.
- Claude 쪽 문서가 바뀌면, Codex는 해당 source 파일을 다시 읽고 그 지침을 따라야 한다.

## 현재 미러링된 이름

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
- `refactor-repo`
- `retrospective`
- `review-repo`
- `self-improve-checklist`
- `session-insights`
- `ship`
- `validate`
- `wrap`

## 호출 메모

- Codex 표면에 따라 `$skill-name`으로 호출할 수 있다.
- slash command 목록에 노출되는 환경에서는 같은 이름으로 사용할 수 있다.

