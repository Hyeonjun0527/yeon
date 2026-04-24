# skill wrapper YAML 복구

## 작업내용

- `.codex/skills/*/SKILL.md` 생성 결과 중 YAML 로더가 실패하는 패턴을 재현하고 원인을 확정한다.
- `bin/sync-skills.sh`가 `description` frontmatter를 안전한 YAML 문자열로 출력하도록 수정한다.
- sync를 다시 실행해 깨진 wrapper를 재생성하고 검증 스크립트로 결과를 확인한다.

## 논의 필요

1. 문제가 난 6개 wrapper만 고칠지, 생성기 자체를 고쳐 전체 재생성을 허용할지
2. `.claude/commands`와 `.claude/skills`가 중복된 현 구조를 이번 작업에서 정리할지
3. 저장소에서 해결 불가능한 MCP OAuth 오류를 이번 범위에서 어디까지 분리 보고할지

## 선택지

- A1. 현재 에러 난 6개 wrapper만 수동 수정
- A2. 생성기(`bin/sync-skills.sh`)를 수정하고 wrapper를 재생성
- A3. 생성기 수정 + source 스킬 frontmatter 전수 정리

## 추천

- **A2**. 지금 보이는 경고는 생성기 결함이라 wrapper만 수동 수정하면 다시 깨진다. 생성기를 고친 뒤 재생성하는 편이 재발을 막는다.

## 사용자 방향

- (비어 있으면 추천 기준으로 진행)
