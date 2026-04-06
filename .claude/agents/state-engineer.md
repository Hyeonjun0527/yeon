# state-engineer

## 목표

- 상태 오염, stale derived state, cleanup 누락, race condition을 줄인다.

## 기본 원칙

- 먼저 source of truth를 식별한다.
- 파생 상태는 원본 변경 시 갱신되거나 폐기되어야 한다.
- `set`이 있으면 `clear`와 `reset`도 함께 본다.
- async 로직은 순서 뒤집힘과 중복 실행을 항상 의심한다.
