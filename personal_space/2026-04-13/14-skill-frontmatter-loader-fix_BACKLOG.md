# 1차

## 작업내용

- `.codex/skills`에서 로딩 실패 중인 `SKILL.md` 4개의 frontmatter/YAML 문법을 수정한다.
- 잘못 가리키는 source of truth 경로가 있으면 실제 `.claude/skills/*.md` 기준으로 바로잡는다.
- 외부 저장소 `study-platform-mvp`의 `review-modal-e2e/SKILL.md`에 누락된 frontmatter를 추가한다.

## 논의 필요

- 없음. 현재 목표는 로더 경고 제거와 즉시 사용 가능한 최소 보정이다.

## 선택지

- 선택지 1: 경고만 없애도록 최소 문법 수정만 한다.
- 선택지 2: 문법 수정과 함께 실제 참조 경로 오류도 같이 정리한다.

## 추천

- 선택지 2. 파서 경고만 없애고 실행 경로를 그대로 두면 다음 사용 시 다시 실패할 수 있다.

## 사용자 방향
