# 작업-codex | skill wrapper YAML 복구

- 주체: Codex CLI
- 워크트리: A (`/home/osuma/coding_stuffs/yeon`)
- 브랜치: `develop`
- 작업창(예상): 06:20 ~ 07:00
- 실제 시작: 2026-04-23 06:20
- 실제 종료: 2026-04-23 06:22
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)

- `bin/sync-skills.sh`
- `.codex/skills/*/SKILL.md` (로컬 Claude source를 미러링하는 wrapper 전반, 특히 문제난 6개)
- `personal_space/ai-log/2026-04-23/11-skill-wrapper-yaml-복구_BACKLOG.md`
- `personal_space/ai-log/2026-04-23/12-작업-codex_0620-0700_skill-wrapper-yaml-복구_[작업중].md`

## 절대 건드리지 않을 범위 (상대 주체 담당)

- `apps/web/**`
- `apps/mobile/**`
- `packages/**`
- 현재 Claude가 작업 중인 인증/플래시카드 관련 변경 범위

## 상대 주체 현황 스냅샷

- `personal_space/ai-log/2026-04-23/6-작업-claude_0441-____-flashcard-guest-and-credential-login_[작업중].md` 확인
- Claude 범위는 웹 인증/플래시카드/DB 스키마이며 이번 작업과 파일 충돌 없음

## 차수별 작업내용

### 차수 1

- 작업내용
  - 로더 실패 wrapper와 source skill frontmatter를 비교
  - `bin/sync-skills.sh`의 description 추출/렌더링 로직 수정
  - sync 재실행 후 검증
- 논의 필요
  - MCP `notion` 오류는 로컬 토큰 갱신 문제라 저장소 변경으로 복구 불가
- 선택지
  - wrapper 수동 수정 / 생성기 수정 / source까지 전수 정리
- 추천
  - 생성기 수정 후 wrapper 재생성
- 사용자 방향
  - 비어 있으면 추천 기준으로 진행

## 로그

- 06:20 — 오늘/전일 작업 로그와 필수 컨텍스트 파일 확인
- 06:20 — 깨진 6개 wrapper와 대응 `.claude/commands/*.md`, `bin/sync-skills.sh` 비교 시작
- 06:21 — `bin/sync-skills.sh`의 description 추출/렌더링 로직을 block scalar 기반으로 수정
- 06:21 — `bin/sync-skills.sh` 실행, 로컬 wrapper 20개 재생성
- 06:22 — `bin/verify-ssot.sh --project-only` 통과, Ruby YAML 파서로 `.codex/skills/*/SKILL.md` 전수 파싱 성공
- 06:22 — `notion` MCP 오류는 저장소 수정으로 해결 불가한 OAuth refresh token 문제로 분리 보고 결정
