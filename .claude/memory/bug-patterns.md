# Bug Patterns

이 파일은 실제로 발생한 버그와 재발 방지 포인트를 적는 곳이다.

## Seed Patterns

- shared contract 없이 앱별 타입이 따로 진화해 request / response shape가 어긋나는 문제
- web-private 구현을 mobile이 우회 import해서 런타임 경계가 깨지는 문제
- 토큰 강제 설계 때문에 기본 Tailwind 클래스 사용이 막혀 구현 속도와 일관성이 같이 무너지는 문제
