# skill metadata 로더오류 복구

## 작업내용

- `.codex/skills/*/SKILL.md` 중 로더가 실패하는 6개 파일의 frontmatter를 교정한다.
- `description` 누락과 YAML plain scalar 파싱 오류를 제거해 skill 로더 경고가 사라지게 만든다.
- `chat-service` 기획 문서에는 새 DM 오픈 규칙을 반영한다.

## 논의 필요

1. `.codex/skills` wrapper 파일을 최소 수정만 할지
2. 같은 패턴의 다른 wrapper 파일까지 전수 수정할지
3. DM 오픈 규칙의 결제/수신거부 정책을 어느 차수에 둘지

## 선택지

- A1. 현재 에러 난 6개 파일만 최소 수정
- A2. wrapper 전체를 같은 형식으로 전수 보정
- A3. 로더 스크립트 쪽을 완화

## 추천

- **A1**. 현재 사용자에게 보이는 실제 오류만 먼저 없애고, 전수 정리는 후속 작업으로 분리한다.

## 사용자 방향

- (비어 있으면 추천 기준으로 진행)
