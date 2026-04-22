# AI Log

AI 에이전트(Claude CLI / Codex CLI)가 작성하는 모든 작업 로그, 백로그, PR 초안, 세션 기록의 기본 저장 위치.

- 계획/설계/영속 문서는 `personal_space/docs/`에 둔다.
- 최상위 `ai-log/`, `docs/`는 2026-04-23 부로 `personal_space/` 아래로 이동되었다. `personal_space/` 바깥에 새 로그를 만들지 않는다.
- 전역 UserPromptSubmit hook(`~/.claude/hooks/ai-log-reminder.sh`)이 모든 요청 앞에 이 규칙을 주입한다. hook이 꺼져도 이 문서가 authoritative다.

## 파일 네이밍 규칙

### 백로그 / PR 초안

```
personal_space/ai-log/YYYY-MM-DD/N-적당한이름_BACKLOG.md
personal_space/ai-log/YYYY-MM-DD/N-적당한이름_PR_DRAFT.md
```

- `N-`은 해당 날짜 디렉터리 안에서의 생성 순번.
- 완료한 백로그는 기존 번호를 유지한 채 파일명에 `(완)`을 붙여 보관.

### 실행 주체별 작업 문서 (병렬 CLI 운영 시)

```
작업중: personal_space/ai-log/YYYY-MM-DD/N-작업-{claude|codex}_{시작HHMM}-{예상종료HHMM}_{주제}_[작업중].md
완료:   personal_space/ai-log/YYYY-MM-DD/N-작업-{claude|codex}_{시작HHMM}-{실제종료HHMM}_{주제}_[완료].md
```

완료 시 **반드시 두 가지를** 함께 한다:

1. 파일명의 종료 시각을 **실제 시각**으로 교체 (예상 값을 실제 값으로 덮어쓰기)
2. suffix를 `_[작업중]` → `_[완료]`로 rename

문서 내부 헤더의 "실제 종료" 필드에도 같은 시각을 기록한다.

## 작업 문서 표준 헤더

```markdown
# 작업-claude | 주제명

- 주체: Claude CLI
- 워크트리: C (A/B/C 중 하나)
- 브랜치: feat/<branch-name>
- 작업창(예상): HH:MM ~ HH:MM
- 실제 시작: HH:MM
- 실제 종료: _(작업중)_  ← 완료 시 실제 시각 기록
- 상태: 작업중 / 완료

## 파일·디렉토리 범위 (whitelist)
- ...

## 절대 건드리지 않을 범위 (상대 주체 담당)
- ...

## 상대 주체 현황 스냅샷
- 상대 문서: personal_space/ai-log/YYYY-MM-DD/N-작업-{상대주체}_*_[작업중].md
- 최근 커밋 해시: ...

## 차수별 작업내용
### 차수 1
- 작업내용
- 논의 필요
- 선택지
- 추천
- 사용자 방향
```

## 병렬 CLI 운영 규칙 (Claude ↔ Codex)

- 작업 시작 전 반드시 `ls personal_space/ai-log/<오늘>/` + 전일 폴더의 `[작업중]` 문서를 열람해 상대 주체의 범위를 파악한다.
- 같은 파일/모듈은 두 주체가 동시에 건드리지 않는다. 범위가 겹치면 범위 재분할 후 착수.
- 같은 워크트리에서 두 CLI를 동시에 돌리지 않는다 (git index 충돌).
- push 직전 `git fetch origin && git rebase origin/develop`로 상대 브랜치 머지 반영 확인.

## 큰 작업 판단 (분할 검토)

다중 파일/다중 도메인 규모 요청은 먼저 "Claude/Codex 두 주체로 분할 가능한가?"를 검토하고 분할 계획을 제시한 뒤 착수한다. 분할 불가 판단은 이유와 함께 본 문서 또는 관련 백로그에 기록한다.

## 백로그 최소 항목

- `작업내용`
- `논의 필요`
- `선택지`
- `추천`
- `사용자 방향` (비어 있으면 `추천` 기준으로 진행)
