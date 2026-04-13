# Anti Patterns

이 파일은 이 저장소에서 반복적으로 피해야 하는 구조적 실수를 기록한다.

## Seed Rules

- 기본 Tailwind 사용을 막기 위해 `global.css`에서 base scale을 비활성화하지 않는다.
- mobile이 web server 내부 구현을 직접 import하지 않는다.
- 아직 하나의 앱에서만 쓰는 것을 성급하게 `packages/*`로 올리지 않는다.
- 계약 정의 없이 로컬 타입을 source of truth처럼 취급하지 않는다.
