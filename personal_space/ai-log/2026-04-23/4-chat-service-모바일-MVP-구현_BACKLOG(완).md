# chat-service 모바일 MVP 구현 백로그

| 버전 | 날짜       | 변경 내용                                                            |
| ---- | ---------- | -------------------------------------------------------------------- |
| v0.1 | 2026-04-23 | `ralph-strict` 기준 chat-service 모바일 MVP 6 story 구현 백로그 작성 |

## 목표

- `chat-service`를 모바일 전용 5탭 앱으로 실제 구현한다.
- backend는 기존 YEON 단일 backend 원칙을 유지한다.
- auth flow는 `chat-service` 전용 전화번호 인증 흐름으로 둔다.
- `Feed / Ask / Friends / Chat / Profile` 5개 탭이 모두 실제 동작 가능한 MVP가 되게 한다.

## 고정 원칙

- `apps/mobile`은 Expo Router 기반으로 구성한다.
- public capability 는 `apps/web/src/app/api` 와 `packages/api-contract`를 통해 노출한다.
- `apps/mobile`은 `apps/web/src/server`를 직접 import 하지 않는다.
- `chat-service`는 공용 로그인 허브 UX를 재사용하지 않는다.
- backend/runtime 은 모든 서비스 공용으로 하나를 유지한다.
- DM 은 `상대 프로필 -> 100원 결제 -> 즉시 오픈` 정책을 따른다.
- 신고/차단/계정삭제는 MVP 필수 범위다.

## 1차 — strict 토대 / PRD / review scaffold

### 작업내용

- strict PRD 를 chat-service 기준으로 다시 쓴다.
- review 산출물 경로와 진행 로그를 초기화한다.
- `apps/mobile`에 필요한 Expo runtime 토대 범위를 확정한다.

### 논의 필요

1. 기존 `.omc/prd.json` 이 완료 상태일 때 새 PRD 로 교체할지
2. mobile validation 을 root script 에 통합할지 개별 실행으로 둘지

### 선택지

- A1. 기존 PRD 유지
- A2. chat-service strict PRD 로 교체

### 추천

- **A2**

### 사용자 방향

- (비어 있으면 추천 기준으로 진행)

## 2차 — backend/auth/API contract

### 작업내용

- chat-service schema, route, service, contract 를 추가한다.
- 전화번호 OTP + 세션 + 프로필 최소 모델을 구현한다.
- feed/ask/friends/chat/profile/moderation API surface 를 연다.

### 논의 필요

1. 사용자 계정을 기존 `users`에 연결할지 별도 service table 로 둘지
2. OTP 를 데모용 고정 코드로 둘지 실제 SMS provider interface 까지 둘지

### 선택지

- B1. 기존 `users` 재사용
- B2. 같은 DB 안의 chat-service 전용 계정 테이블

### 추천

- **B2**

### 사용자 방향

- backend 는 하나

## 3차 — mobile runtime / auth / 5탭 shell

### 작업내용

- Expo app entry, providers, theme, navigation shell 을 만든다.
- 로그인 전 `(auth)` 와 로그인 후 `(tabs)` 흐름을 연결한다.

### 논의 필요

1. 세션 저장을 `expo-secure-store`로 둘지 `async-storage`로 둘지
2. 디자인 톤을 예시 이미지 기반 dense list 로 얼마나 맞출지

### 선택지

- C1. `expo-secure-store`
- C2. `@react-native-async-storage/async-storage`

### 추천

- **C1**

### 사용자 방향

- (비어 있으면 추천 기준으로 진행)

## 4차 — Feed / Ask MVP

### 작업내용

- 공개 커뮤니티 축을 먼저 닫는다.
- 글 작성, 목록, 답글, 투표, 신고/차단 진입을 구현한다.

### 논의 필요

1. 피드 답글 길이 제한
2. 투표 선택지 최대 개수

### 선택지

- D1. 피드 1레벨 답글 + 투표 4지선다
- D2. 댓글 없이 본문만

### 추천

- **D1**

### 사용자 방향

- (비어 있으면 추천 기준으로 진행)

## 5차 — Friends / Chat / DM unlock

### 작업내용

- 친구 목록/요청/추천 사용자
- 프로필에서 100원 DM 오픈
- 채팅방 목록과 1:1 메시지

### 논의 필요

1. DM 오픈 후 친구 자동 생성 여부
2. DM unlock 기록을 room 생성과 분리 저장할지

### 선택지

- E1. room 생성만
- E2. unlock ledger + room 둘 다 저장

### 추천

- **E2**

### 사용자 방향

- (비어 있으면 추천 기준으로 진행)

## 6차 — Profile / Safety / Validation

### 작업내용

- 프로필 수정, 알림, 차단, 신고 내역, 계정 삭제
- 최종 리뷰, lint/typecheck/build 검증

### 논의 필요

1. 신고 내역을 상세하게 보여줄지 접수 상태만 보여줄지

### 선택지

- F1. 접수 상태만
- F2. 접수/검토중/처리완료

### 추천

- **F1**

### 사용자 방향

- (비어 있으면 추천 기준으로 진행)
