# Typing Race Architecture

기준 시점: 2026-04-20

이 문서는 `typing-race` 서비스의 구현과 운영 구조를 고정한다.
목표는 "초기에는 Raspberry Pi 5 같은 온프레미스 장비 한 대로도 운영 가능하고, 이후에는 같은 구조를 유지한 채 더 강한 서버로 옮기거나 서비스별로 분리 가능한 형태"다.

## 1. 핵심 결정

- 게임 엔진은 `apps/web`의 `/typing-service/play` 라우트 안에서 client-only로 mount한다.
- SEO, 메타데이터, 공유 링크 표면은 `apps/web`의 `Next.js`가 유지한다.
- 게임 엔진 스택은 `Phaser + TypeScript`로 간다.
- 실시간 경기 서버는 `Node.js 22 + Colyseus`로 간다.
- 기존 `apps/web`는 본서비스 포털과 관리 화면, `typing-race` SEO 셸을 함께 소유한다.
- 게임 엔진은 브라우저에서 실행되고, 서버는 authoritative state만 관리한다.

## 2. 모노레포 구조

```txt
apps/
  web/                  # 기존 YEON 본서비스
  race-server/          # Colyseus authoritative server
packages/
  typing-race-engine/   # Phaser scene, HUD, lane, animation
  race-shared/          # protocol, constants, payload types
```

## 3. 각 모듈의 책임

### `apps/web`

- 기존 YEON 포털, 로그인, 서비스 목록, 본서비스 관리를 담당한다.
- `/typing-service`, `/typing-service/play`, 랭킹/텍스트 SEO 표면을 함께 담당한다.
- `typing-race` 엔진을 mount하는 React client component를 가진다.
- 게임 렌더 루프 자체를 소유하지는 않고, 엔진 패키지를 mount하고 주변 HUD/SEO 셸을 감싼다.

### `apps/race-server`

- authoritative multiplayer server다.
- `Colyseus` room, matchmaking, countdown, progress validation, finish ranking을 담당한다.
- 경기 중 hot path는 메모리 상태와 Redis presence를 우선 사용한다.
- 경기 종료 후에만 Postgres에 저장한다.

### `packages/typing-race-engine`

- 재사용 가능한 Phaser scene과 UI logic을 담는다.
- 예: `LobbyScene`, `CountdownScene`, `RaceScene`, `ResultScene`
- 렌더링과 로컬 입력 반응은 여기에 둔다.
- `apps/web`는 이 패키지를 직접 import하여 `/typing-service/play`에서 mount한다.

### `packages/race-shared`

- 클라이언트와 서버가 공유하는 payload 타입과 프로토콜 상수를 둔다.
- `enum` 대신 `as const` 상수와 literal union을 기본으로 한다.
- 예: room 상태, lane 상태, 이벤트 이름, 기본 tick 간격

## 4. 데이터 흐름

### 경기 진입

1. 사용자가 `apps/web`의 `/typing-service/play`에 접속한다.
2. React client component가 `typing-race-engine`을 mount한다.
3. 클라이언트는 match API 또는 Colyseus matchmaking으로 입장을 요청한다.
4. 서버는 `roomId`, `seat`, `token`, `seed`를 기준으로 방에 연결시킨다.
5. 엔진은 카운트다운 scene으로 바로 진입한다.

### 경기 중

- 클라이언트는 입력 직후 로컬에서 즉시 반응한다.
- 서버는 일정 tick으로 진행률을 검증하고 방 상태를 브로드캐스트한다.
- 클라이언트는 서버 상태를 그대로 점프시키지 않고 보간해 보여준다.

### 경기 종료

- 서버가 최종 순위를 판정한다.
- 결과는 Postgres에 저장한다.
- 개인 최고 기록, 시즌 기록, 챌린지 기록은 경기 후 비동기로 반영한다.

## 5. 이벤트 경계

기본 프로토콜은 아래를 기준으로 한다.

### 클라이언트 -> 서버

- `match.join`
- `race.ready`
- `race.progress`
- `race.finish`
- `race.ping`

### 서버 -> 클라이언트

- `match.accepted`
- `race.seed`
- `race.countdown`
- `race.state`
- `race.result`
- `race.error`

`race.progress`는 raw key stream 전체를 보내지 않고, 현재 index, 진행률, 정확도, 마지막 입력 시각 같은 요약 상태만 보낸다.

## 6. 실시간 기본값

- 방 크기: `2~6인`
- 카운트다운: `10초`
- room tick: `10~20Hz`
- progress broadcast: `5~10Hz`
- client render: `60fps`

이 기본값은 초기 Pi 5 온프레미스 운영에서도 무리 없는 수준을 기준으로 잡는다.

## 7. 온프레미스 운영 구조

초기 운영은 한 대의 서버에서 아래 구성을 권장한다.

```txt
Caddy
  ├─ apps/web standalone
  ├─ /ws -> race-server
  └─ /api/race/* -> race-server

race-server
redis
postgres
```

### 기본 포트

- `80`, `443`: Caddy
- `2567`: race-server
- `6379`: Redis
- `5432`: Postgres
- `3000`: 기존 web가 필요할 때만 사용

### 권장 장비

- Raspberry Pi 5 8GB 이상
- SSD 또는 NVMe 기반 저장소
- 유선 Gigabit Ethernet
- 액티브 쿨링

## 8. 스케일 업 / 스케일 아웃 전략

### 1단계: 단일 온프레미스 서버

- Pi 5 또는 미니PC 한 대
- `docker compose`
- 모든 서비스 같은 장비

### 2단계: 더 강한 단일 서버로 이전

- 더 높은 CPU, RAM 장비로 동일 compose 이전
- 코드 구조와 네트워크 구조는 유지

### 3단계: `race-server`만 분리

- `race-server`를 별도 장비로 이동
- `race-client`, Redis, Postgres는 기존 장비에 유지 가능

### 4단계: 데이터 계층 분리

- Redis 별도 장비
- Postgres 별도 장비
- `race-server`를 다중 프로세스/다중 장비로 확장

## 9. 의도적으로 하지 않는 것

- `apps/web` 안에 게임 로직을 React 상태로 직접 구현하지 않는다.
- `apps/web`에서 엔진 패키지 경계 없이 Phaser 코드를 흩뿌리지 않는다.
- 경기 중 상태를 DB에서 직접 읽고 쓰지 않는다.
- 클라우드 벤더 고유 기능을 구조 전제에 넣지 않는다.
- 초기부터 과한 멀티리전/글로벌 매칭을 목표로 삼지 않는다.

## 10. 구현 순서

1. 문서와 backlog 고정
2. `apps/race-server`, shared package, `/typing-service/play` 스캐폴드 추가
3. 로컬 compose/Caddy 실행 자산 추가
4. 기본 room, countdown, lane UI 구현
5. Pi 5 기준 부하 측정과 조정
