# Typing Race Docs

- [아키텍처](./architecture.md)
- [추후 확장 로드맵](./expansion-roadmap.md)

이 디렉터리는 `typing-race` 서비스의 고정 구조와 이후 확장 기준을 담는다.
현재 기본 원칙은 아래와 같다.

- SEO와 라우팅 표면은 `apps/web`의 `Next.js`가 유지한다.
- 실제 게임 엔진은 `packages/typing-race-engine`의 `Phaser`가 client-only로 mount된다.
- 실시간 서버는 `apps/race-server`의 `Node.js + Colyseus`로 분리한다.
- 초기 운영은 Raspberry Pi 5 같은 온프레미스 장비에서도 가능해야 한다.
- 이후 확장은 "클라우드 전용 기능 추가"가 아니라 "같은 경계를 유지한 채 더 강한 서버로 이전/분리"를 기본으로 한다.
