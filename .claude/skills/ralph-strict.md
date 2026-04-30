---
name: ralph-strict
description: Yeon main-only 정책을 따르는 엄격 ralph 실행/검증 프로토콜. 기준 diff와 PR target은 main이다.
user_invocable: true
---

# Ralph Strict — Yeon main-only

- `develop`은 잠정 중단이다.
- branch/diff/rebase 기준은 `origin/main`이다.
- 리뷰 대상 diff는 `git diff origin/main...HEAD`를 기본으로 한다.
- PR target은 `main`이다.
- story-level acceptance criteria와 fresh verification을 유지한다.

## 시작 체크

```bash
git status --short --branch
git log origin/main..HEAD --oneline
```

## 검증/리뷰 범위

- 현재 story에서 변경된 파일 목록 또는 `git diff origin/main...HEAD`.
- 모든 acceptance criteria는 fresh command output으로 확인한다.
- 승인 후 cleanup/deslop을 하면 regression verification을 다시 수행한다.
