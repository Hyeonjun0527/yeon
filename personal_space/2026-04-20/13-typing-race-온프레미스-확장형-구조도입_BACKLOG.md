# typing-race 온프레미스 확장형 구조도입 BACKLOG

## 작업 목표

- 타이핑 레이스 서비스를 기존 `apps/web`와 분리된 독립 경계로 도입한다.
- 초기 운영은 Raspberry Pi 5 같은 온프레미스 장비 한 대에서도 돌 수 있게 설계한다.
- 이후 더 강한 ARM/x86 서버로 그대로 이관하거나, `race-server`만 별도 장비로 분리할 수 있게 만든다.
- 클라우드 과금형 기능에 의존하지 않고도 수직/수평 확장이 가능한 구조를 먼저 고정한다.

## 차수 1. 아키텍처 경계와 운영 문서 고정

### 작업내용

- `typing-race` 전용 아키텍처 문서를 추가한다.
- `apps/web`, `race-server`, `typing-race-engine`, `race-shared` 경계를 문서로 고정한다.
- 기존 `apps/web` 안에 `/typing-service/play` 라우트를 두고, 그 안에서 `Phaser` 엔진을 client-only로 mount하는 구조를 기준으로 고정한다.
- 온프레미스 1대 운영, 이후 분리 확장 경로를 문서화한다.

### 논의 필요

- 게임 전용 도메인을 `type.yeon.world`로 분리할지, 기존 포털 내부 경로에서 시작할지
- `/typing-service/play`를 장기적으로 독립 서비스로 분리할 여지를 어느 수준까지 남길지

### 선택지

- 선택지 A: `apps/web` 안에 SEO/라우팅 셸을 유지하고, 엔진만 별도 패키지로 분리
- 선택지 B: 처음부터 게임 클라이언트 자체를 별도 앱으로 분리

### 추천

- 선택지 A
- SEO와 공유 링크 표면은 `Next.js`가 맡고, 렌더 루프만 엔진 패키지로 분리하는 편이 현재 제품 구조와 더 잘 맞는다.

### 사용자 방향

## 차수 2. 모노레포 스캐폴드 추가

### 작업내용

- `apps/race-server`
- `packages/typing-race-engine`
- `packages/race-shared`
- `apps/web/src/app/typing-service/play`
- 각 workspace의 `package.json`, `tsconfig`, 최소 실행 엔트리와 export surface를 추가한다.

### 논의 필요

- `/typing-service/play`의 HUD를 React로 둘지, Phaser 내부 UI 비중을 어디까지 가져갈지
- `race-server` bootstrap을 Colyseus template 형태로 둘지, 저장소 스타일에 맞춰 더 얇게 둘지

### 선택지

- 선택지 A: `apps/web`의 client component가 Phaser 엔진을 mount하고, 주변 HUD는 React가 담당
- 선택지 B: HUD도 전부 Phaser scene 내부에서 처리

### 추천

- 선택지 A
- SEO 셸과 게임 HUD를 Next.js 안에서 함께 관리할 수 있고, 엔진은 60fps 영역만 집중하게 하는 편이 더 안정적이다.

### 사용자 방향

## 차수 3. 로컬/온프레미스 실행 자산 추가

### 작업내용

- `docker-compose.typing-race.yml` 또는 동등한 compose 파일을 추가한다.
- `Caddyfile` 또는 `nginx` reverse proxy 설정을 추가한다.
- `web`, `race-server`, `redis`, `postgres`를 묶은 로컬 실행 경로를 만든다.
- Raspberry Pi 5 기준 실행/업데이트 절차를 문서화한다.

### 논의 필요

- `web`와 `typing-race`를 같은 reverse proxy에서 받을지 분리할지
- `/typing-service/play`와 `/ws`를 같은 도메인 아래로 유지할지 분리할지

### 선택지

- 선택지 A: `apps/web` standalone과 `race-server`를 같은 reverse proxy 아래서 운영
- 선택지 B: `typing-race` 전용 웹 셸도 별도 정적 서버로 분리

### 추천

- 선택지 A
- 현재는 `Next.js`가 SEO와 플레이 경로를 함께 품는 편이 운영 단순성과 제품 일관성에 유리하다.

### 사용자 방향

## 차수 4. 기본 프로토콜과 방 모델 도입

### 작업내용

- `match.join`, `match.accepted`, `race.seed`, `race.countdown`, `race.state`, `race.finish`, `race.result` 이벤트를 `race-shared`에 정의한다.
- `2~6인 방`, `10초 카운트다운`, `10~20Hz room tick`, `5~10Hz progress broadcast`를 기본값으로 고정한다.
- 클라이언트 예측과 서버 최종 판정을 분리한다.

### 논의 필요

- AI fallback 상대를 어느 계층에서 생성할지
- 텍스트 seed를 정적 문장으로 시작할지, 별도 콘텐츠 저장소를 둘지

### 선택지

- 선택지 A: 서버가 benchmark/AI 상대를 방 상태의 한 종류로 생성
- 선택지 B: 클라이언트가 비어 있는 lane을 연출만 채움

### 추천

- 선택지 A
- 결과 판정과 시각 표현의 source of truth를 서버에 두는 편이 정합성이 좋다.

### 사용자 방향

## 차수 5. 검증과 성능 기준선 확보

### 작업내용

- `race-client`, `race-server`, shared package의 lint/typecheck/build를 CI에 연결한다.
- Pi 5 기준 로컬 부하 테스트와 room 수 측정 기준을 문서화한다.
- `ws` transport 기본 구성으로 시작하고, 필요 시 `uWebSockets` 전환 경로를 남긴다.

### 논의 필요

- 초기 성능 측정을 어떤 지표로 통과 처리할지
- Pi 5에서 DB까지 한 장비에 둘지, DB는 별도 장비에 둘지

### 선택지

- 선택지 A: Pi 5 한 대 통합 운영으로 먼저 기준선 확보
- 선택지 B: 처음부터 DB를 분리해 측정

### 추천

- 선택지 A
- 현재 목표는 구조 검증과 레이스 품질 확보이며, 분산 운영은 실제 병목이 보인 뒤에 해도 늦지 않다.

### 사용자 방향
