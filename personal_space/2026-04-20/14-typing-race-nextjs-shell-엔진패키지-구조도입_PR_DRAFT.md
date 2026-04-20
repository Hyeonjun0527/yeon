## 작업 내용

- `typing-race` 구조를 `apps/web` 안의 Next.js SEO 셸 + `packages/typing-race-engine` Phaser 엔진 + `apps/race-server` Colyseus 서버 경계로 재정리했습니다.
- `/typing-service/play` 라우트를 추가하고, client-only Phaser 엔진을 mount하는 `TypingRacePlayScreen`을 도입했습니다.
- `@yeon/race-shared`, `@yeon/typing-race-engine`, `@yeon/race-server` workspace를 추가해 실시간 레이스 구조의 최소 스캐폴드를 넣었습니다.
- `docs/typing-race/*`와 [13-typing-race-온프레미스-확장형-구조도입\_BACKLOG.md](/home/osuma/coding_stuffs/yeon/personal_space/2026-04-20/13-typing-race-온프레미스-확장형-구조도입_BACKLOG.md)를 현재 결정에 맞춰 갱신했습니다.

## 변경 이유

- `typing-service`는 SEO 표면이 중요하므로 플레이 경로를 `Next.js` 밖으로 빼지 않고 같은 도메인/라우팅 체계 안에 유지해야 했습니다.
- 반면 60fps 렌더 루프와 authoritative room state는 React/Next 안에 섞지 않는 편이 확장성과 성능에 유리하므로, 엔진과 실시간 서버만 별도 경계로 분리했습니다.
- 초기 온프레미스 운영과 이후 서버 스펙 업그레이드를 모두 감당하려면 이 경계가 먼저 고정되어야 합니다.

## 검증 방법

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @yeon/web build`

## 브랜치 정보

- base: `develop`
- head: `feat/typing-race-next-engine-shell-1`
- 순번: `1`
