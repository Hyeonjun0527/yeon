# scripts/hooks — Claude Code hook 템플릿

이 디렉터리는 **저장소 소유** hook 스크립트를 담는다. `bin/setup.sh`가 여기 파일들을 `~/.claude/hooks/`로 복사하고 `~/.claude/settings.json`에 등록한다.

git tracked 라 다른 PC / worktree / 사용자에게도 전파되며, `setup.sh` 한 번으로 모든 환경에서 동일한 자동화가 작동한다.

## 파일

- `reminder.sh` — UserPromptSubmit hook. 매 요청 전 SSOT 경로 + 규칙 + symlink auto-repair 주입.
- `post-tool-sync.sh` — PostToolUse hook (Write|Edit|MultiEdit). `.claude/commands/*` 또는 `.claude/skills/*` 편집 직후 `bin/sync-skills.sh` 자동 실행 + wrapper/README 파일 자동 staged.

## settings.json 수동 설치 (jq 없을 때)

`~/.claude/settings.json`의 `hooks` 객체에 아래를 추가:

```json
{
  "hooks": {
    "UserPromptSubmit": [
      {
        "hooks": [
          { "type": "command", "command": "bash ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/hooks/reminder.sh" }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit|MultiEdit",
        "hooks": [
          { "type": "command", "command": "bash ${CLAUDE_CONFIG_DIR:-$HOME/.claude}/hooks/post-tool-sync.sh" }
        ]
      }
    ]
  }
}
```

## 해제

`OMC_SKIP_HOOKS` 환경변수에 `reminder` 또는 `post-tool-sync` 추가.
