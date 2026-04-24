# 타자연습 실시간 멀티플레이 연결 기획

작성일: 2026-04-21

---

## 현재 상태 분석 (결론 먼저)

**현재 지금은 멀티플레이가 아니다.** 다른 유저가 "레이스 입장"을 눌러도 같은 레이스에 합류하지 않는다.

### 왜 멀티플레이가 아닌가

| 컴포넌트 | 상태 |
|----------|------|
| `apps/race-server` (Colyseus + WebSocket) | ✅ 구현됨 — 룸, 카운트다운, 브로드캐스트 포함 |
| `packages/race-shared` (이벤트/계약) | ✅ 정의됨 — `MATCH_JOIN`, `RACE_PROGRESS`, `RACE_STATE` 등 |
| `apps/web` play screen | ❌ **서버에 연결하지 않음** — 100% 로컬 단독 시뮬레이션 |

`typing-race-play-screen.tsx`는:
- 서버에 WebSocket으로 연결하는 코드 **없음**
- 로컬 `TYPING_PASSAGES`에서 지문을 뽑음
- 로컬에서 카운트다운 타이머 관리
- 로컬에서 가짜 benchmark 낙타 3개를 시뮬레이션
- 내 진행률을 아무 곳에도 전송하지 않음

즉 **서버 인프라는 있지만 아직 client 측 연결 구현이 비어 있다.**

---

## 목표 흐름 (구현 후)

```
유저 A가 /typing-service/play 진입
  → race-server의 TypingRaceRoom에 match.join
  → 서버가 COUNTDOWN 중인 룸 있으면 그 룸에 배치, 없으면 새 룸 생성
  → 10초 카운트다운 진행
  → 카운트다운 안에 유저 B, C가 레이스 입장
  → 같은 룸에 배치 (최대 4명)
  → 카운트다운 0 → LIVE 전환, 이후 입장자는 다음 룸 대기
  → 각 유저가 입력할 때마다 progress를 서버에 전송
  → 서버가 전체 스냅샷을 100ms마다 브로드캐스트
  → 모든 유저가 같은 낙타들을 보고 달림
```

---

## 1차수: 최소 동작 멀티플레이 (MVP)

### 작업내용

**A. race-server 환경 변수 + 배포**
- `NEXT_PUBLIC_RACE_SERVER_URL` 환경 변수 추가 (예: `wss://race.yeon.world`)
- dev: `ws://localhost:2567`
- race-server를 별도 서비스로 배포 (Docker 또는 Cloud Run 등)

**B. Colyseus client 통합**
- `apps/web`에 `colyseus.js` 의존성 추가
- `apps/web/src/features/typing-service/use-race-room.ts` 훅 신설:
  - `Client.joinOrCreate(TYPING_RACE_ROOM_NAME, { playerLabel, difficulty })`
  - `onMessage(RACE_EVENTS.*)` 리스너 등록
  - 연결 상태 (`connecting | connected | error | disconnected`) 반환
  - `sendProgress({ progress, wpm, accuracy })` 함수 반환

**C. play screen 리팩토링**
- `TYPING_PASSAGES`에서 지문 로컬 선택 → **서버가 RACE_SEED로 보낸 prompt 사용**
- 로컬 countdown useState → **서버 스냅샷의 `countdownRemaining` 사용**
- 로컬 `BENCHMARK_LANES` + `benchmarkNoiseRef` 전체 제거 → **서버 스냅샷의 `lanes` 사용**
- `handleRestart`는 "다시 레이스" = 새 룸 재연결

**D. 서버 측 매치메이킹 보강 (현재 `TypingRaceRoom`이 이미 부분 지원)**
- Colyseus `filterBy` 또는 `onAuth`로 COUNTDOWN 중인 룸만 조인 허용
- LIVE 전환 시 `lock()` 호출 → 이후 `joinOrCreate`는 새 룸 생성
- 서버 벤치마크 3개는 **채움 용도로만 사용** (4인 미만 시 benchmark로 빈 자리 채움), 4인 꽉 차면 benchmark 제거

**E. 에러 상태 처리**
- race-server 연결 실패 시 UX: "현재 서버에 연결할 수 없습니다" 화면
- 레이스 중 연결 끊김: 자동 재연결 3회 시도 후 실패 화면

### 논의 필요

1. **서버 부재 시 fallback 여부** — 서버 다운되면 솔로 모드로 돌릴지, 에러만 띄울지
2. **비로그인 사용자 식별** — 익명 sessionId로 충분한지, 영구 player ID 필요한지
3. **지문 동기화 시점** — RACE_SEED가 룸 생성 시점에 고정되는지, 라운드마다 바뀌는지
4. **race-server 배포 방식** — Docker 단일 인스턴스 vs Redis 기반 horizontal scale

### 선택지

| 항목 | 옵션 A | 옵션 B |
|------|--------|--------|
| 서버 다운 시 | 에러 전용 UI | 로컬 솔로 모드 fallback |
| 플레이어 식별 | sessionId (익명) | UUID localStorage 저장 |
| 매치메이킹 로직 | Colyseus 기본 joinOrCreate | 별도 matchmaker Room |
| 배포 | 단일 Docker | Redis presence + 다중 인스턴스 |

### 추천

- 서버 다운: **로컬 솔로 모드 fallback** (현재 구현을 `solo race` 모드로 보존)
- 플레이어 식별: **UUID localStorage** (닉네임과 함께 저장, 재접속 시 유지)
- 매치메이킹: **Colyseus 기본 joinOrCreate + lock()** (추가 Room 없이 충분)
- 배포: **단일 Docker 먼저** (MAU 100명 이상일 때 Redis 도입)

### 사용자 방향

> (비어 있으면 추천 기준으로 진행)

---

## 2차수: UX 다듬기 + 관전 모드

### 작업내용

- LIVE 진행 중 룸 입장 시: 관전 모드 (카운트다운 없이 현재 상태 관전, 다음 라운드 자동 참가)
- "대기 중… 다른 플레이어 기다리는 중 (1/4)" 표시
- 4명 미만일 때 benchmark 낙타로 채움
- 완주 후 placement 표시 ("3위 / 4명 중")
- 채팅이나 이모지 리액션 (선택)

### 논의 필요

- 관전 중 화면 구성: 본인 레인 숨김 vs 표시?
- 라운드 사이 대기 시간: 5초 후 자동 재시작 vs 수동 클릭?

---

## 3차수: 다양한 룸 모드 + 난이도

### 작업내용

- 난이도별 룸 분리 (starter/flow/burst)
- 지정된 친구와 방 만들기 (초대 링크)
- 리더보드 / 일일 랭킹
- 재접속 시 이전 레이스 결과 조회

---

## 파일 영향 범위 (1차수)

| 파일 | 변경 내용 |
|------|-----------|
| `apps/web/package.json` | `colyseus.js` 의존성 추가 |
| `apps/web/src/features/typing-service/typing-race-play-screen.tsx` | 서버 기반으로 전면 리팩토링 |
| `apps/web/.env.local.example` | `NEXT_PUBLIC_RACE_SERVER_URL` 추가 |
| `apps/race-server/src/rooms/typing-race-room.ts` | 매치메이킹 lock 로직, benchmark 동적 채움 |

신규 파일:
- `apps/web/src/features/typing-service/use-race-room.ts` — Colyseus client 훅
- `apps/web/src/features/typing-service/race-server-connection-status.tsx` — 연결 상태 UI
- `apps/web/src/features/typing-service/solo-race-fallback.tsx` — 서버 다운 시 솔로 모드

---

## 10초 카운트다운 안에 같은 레이스에 들어가는 조건

1. 첫 유저 A 입장 → 새 룸 생성, COUNTDOWN 10초 시작
2. 유저 B가 A 입장 후 5초 뒤에 접속 → 같은 룸 합류 (남은 카운트다운 5초 공유)
3. 유저 C가 A 입장 후 11초 뒤에 접속 → A의 룸은 LIVE(lock), C는 **새 룸 생성** → C만 혼자 카운트다운
4. 유저 D가 C 입장 후 3초 뒤에 접속 → C의 룸 합류

즉 **카운트다운이 끝나지 않은 룸이 있으면 무조건 그 룸으로**, 없으면 새 룸. 이 동작은 Colyseus `joinOrCreate`의 기본이다 (`lock()`을 LIVE 전환 시점에 호출해야 함).

현재 `TypingRaceRoom`에 `lock()` 호출이 없어서 LIVE 중에도 새 유저가 합류할 가능성이 있다. 1차수 D 항목으로 반드시 추가해야 한다.
