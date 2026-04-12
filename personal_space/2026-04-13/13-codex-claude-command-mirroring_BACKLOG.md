# 13. Codex Claude Command Mirroring

## 차수 1

### 작업내용
- `.claude/commands`에 있는 Claude 커맨드를 Codex에서 재사용할 수 있도록 `.codex/skills/<name>/SKILL.md` 래퍼로 추가한다.
- 래퍼 스킬은 기존 `.claude/commands` 또는 `.claude/skills` 파일을 source of truth로 참조하게 구성한다.
- 사용 방법과 source of truth 위치를 정리한 `.codex/skills/README.md`를 추가한다.

### 논의 필요
- 없음

### 선택지
- A. Claude 커맨드 본문을 Codex 스킬로 전부 복사
- B. Codex 스킬을 얇은 래퍼로 만들고 기존 Claude 문서를 source of truth로 유지

### 추천
- B. 문서 드리프트를 줄이고 유지보수를 단순화할 수 있다.

### 사용자 방향

