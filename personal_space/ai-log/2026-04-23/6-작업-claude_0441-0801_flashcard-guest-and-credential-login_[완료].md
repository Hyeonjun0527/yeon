# 작업-claude | 플래시카드덱(card-service) guest 사용 + 일반 ID·PW 로그인 추가

- 주체: Claude CLI
- 워크트리: C (`/home/osuma/coding_stuffs/yeon`)
- 브랜치: `feat/typing-race-next-engine-shell-1` (§2.4.0 단일 브랜치 누적, 사용자 B1 확정 2026-04-23 04:41)
- 작업창(예상): 04:41 ~ 미정
- 실제 시작: 2026-04-23 04:41
- 실제 종료: 2026-04-23 08:01
- 상태: 완료
- 모드: `/ralph-strict`

## 배경

사용자 요청 원문:
> 플래시카드덱 로그인안하고도 사용한다음에 추후 계정연동 가능하게 하고 싶어. 그리고 지금 소셜로그인만 있는데 간단한 일반로그인도 만들고 싶어. 아이디 비밀번호 사용한 일반로그인.

사용자 자기 지적: "기획에 모호한 거 많지" → deep-interview 게이트에서 크리스털라이즈 필요.

## 기존 상태 (2026-04-23 04:41 스캔)

- 카드덱 기능 코드상 이름: `card-service` / `card-deck` (플래시카드는 제품 용어, 코드는 card).
  - UI: `apps/web/src/features/card-service/**`
  - API: `apps/web/src/app/api/v1/card-decks/**`
  - DB: `apps/web/src/server/db/schema/card-decks.ts`, `card-deck-items.ts`
  - 기획 문서: `personal_space/ai-log/2026-04-21/5-card-service-MVP-기획_BACKLOG.md`
  - 현재: 웹 전용, 모바일 없음, 전부 로그인 전제.
- 인증 현황:
  - `apps/web/src/app/api/auth/{kakao,google,logout,session/cleanup,dev-login}/`
  - `apps/web/src/server/auth/{social-providers,constants,auth-errors,auth-user}`
  - 비밀번호 해시(bcrypt/argon2) 코드 없음, 라이브러리 미설치.
- 기존 `.omc/prd.json`: chat-service 모바일 MVP (완료). 이 task로 **완전 교체** 예정.
- 같은 브랜치에 chat-service MVP uncommitted 대량 존재(Codex 04:24 완료). 같은 파일 안 건드림.

## 파일·디렉토리 범위 (interview 크리스털라이즈 후 최종 확정, 임시 whitelist)

- `apps/web/src/features/card-service/**` — guest 모드 진입, account merge UI
- `apps/web/src/app/api/v1/card-decks/**` — guest 허용 또는 client 저장 전환
- `apps/web/src/app/api/auth/**` — ID/PW 엔드포인트 신규 (register/login/reset)
- `apps/web/src/server/auth/**` — 비밀번호 해시·검증, credential 정책
- `apps/web/src/server/db/schema/**` — account/password_credential/guest_migration 테이블
- 일반 로그인 UI 진입점(랜딩 또는 auth surface, interview에서 확정)
- `packages/api-contract/src/**` — 신규 계약
- 마이그레이션 SQL (§5.4 멱등 규칙)

## 절대 건드리지 않을 범위 (상대 주체)

- `apps/mobile/**` chat-service 관련 uncommitted 변경 (Codex 완료 상태)
- `apps/web/src/app/api/v1/chat-service/**`
- `apps/web/src/server/services/chat-service/**`
- `apps/web/src/server/db/schema/chat-service.ts`
- `packages/api-contract/src/chat-service.ts`

## 상대 주체 현황 스냅샷 (04:41 기준)

- Codex: active `[작업중]` 문서 없음. 04:24에 chat-service MVP 완료 후 유휴.

## 차수별 작업내용

(deep-interview 크리스털라이즈 완료 후 `.omc/prd.json`에 story 단위로 작성한다)

### 0차. Deep interview 게이트 (완료)

- 목표: ambiguity ≤ 0.2 달성
- 실제 ambiguity: 16.5% (threshold 20% 하향 돌파)
- 산출물: `.omc/specs/deep-interview-flashcard-guest-and-credential-login.md`
- 8 rounds 소진, ontology 14 entities, stability 92.9%

### 1차. US-001 scaffold (**완료**)

- **라이브러리**: `@node-rs/argon2`, `idb`, `resend` 도입 (pnpm install green). Resend를 email provider로 확정 (spec Constraint 6 업데이트).
- **DB 스키마 (신규 4개)**: `password_credentials` (userId PK/FK, passwordHash, passwordUpdatedAt) · `email_verification_tokens` (token UUID PK, userId FK, expiresAt, consumedAt) · `password_reset_tokens` (동일 구조) · `login_attempts` (bigint PK, email, ipAddress, success, attemptedAt, 2개 index).
- **DB 스키마 수정**: `users.emailVerifiedAt` (timestamptz nullable) 추가.
- **Migration 0031 (idempotent)**: 모든 CREATE TABLE / ADD COLUMN / ADD CONSTRAINT / CREATE INDEX 을 IF NOT EXISTS / DO $$ ... EXCEPTION WHEN duplicate_object/duplicate_table 패턴으로. **소셜 사용자의 `email_verified_at` backfill UPDATE 포함** (C1 해소).
- **api-contract 계약 (신규 2개)**: `credential.ts` (register / login / verify / reset-request / reset-confirm schema + password policy 상수) · `card-deck-merge-guest.ts` (mergeGuestRequestSchema, hard cap 50/500 + limits 상수).
- **auth-errors.ts**: 7개 신규 error code (invalidCredentials · passwordPolicyViolation · emailAlreadyRegistered · accountLocked · rateLimitExceeded · invalidVerificationToken · invalidResetToken) + 한국어 `getAuthErrorCopy` case. `requiresLinkToExistingAccount`는 C3 해소로 **제거** (body flag primary).
- **`.env.example`**: Resend 섹션 추가 (`RESEND_API_KEY`, `RESEND_FROM_ADDRESS=noreply@yeon.world`).
- **Export**: schema/index.ts 4개 + api-contract src/index.ts 2개 + api-contract package.json exports 2개.
- **Spec 업데이트 (DI-PASS 유지)**: Constraint 5 (`@node-rs/argon2` + Docker binary 검증), Constraint 6 (Resend 확정), Constraints 15·16 신설 (guest UI 경고 + merge endpoint hard cap 명시), Non-Goals 3개 추가 (token cleanup · login_attempts retention · getAuthErrorCopy requiresLink 분기).
- **code-review**: `.omc/reviews/US-001.md`. critical 3 + major 4 전부 해소, minor 5 기록/수용.
- **검증**: `pnpm --filter @yeon/web db:check:drift` ✅ green.
- **PRD 상태**: `.omc/prd.json` US-001.passes = true.

### 2차. US-002 이메일 infra + credential backend + rate limit (**완료**)

- **Email infra**: `apps/web/src/server/email/{resend-client, email-templates, email-sender}.ts`. Resend SDK 기반. 한국어 인증/재설정 메일 템플릿.
- **Password hash**: `@node-rs/argon2`, argon2id 기본 파라미터 (memoryCost=19456, timeCost=2, parallelism=1). `@node-rs/argon2`는 argon2id가 default이므로 Algorithm enum 직접 접근 회피(verbatimModuleSyntax 호환).
- **Services**: `apps/web/src/server/auth/credentials/{register-service, login-service, verify-email-service, reset-password-service}.ts`. 각 서비스는 이메일 normalize(`trim().toLowerCase()`), users lookup case-insensitive(`sql\`lower(${users.email}) = ${email}\``), 트랜잭션 기반 상태 전이.
- **Rate limit**: `apps/web/src/server/auth/rate-limit.ts`. login_attempts DB 기반 account lock(10분/5회) + IP limit(분당 30회). 이메일 발송은 in-memory Map 기반 IP bucket(분당 5회) — 분산 환경 대응은 후속 PR.
- **Routes**: `apps/web/src/app/api/auth/credentials/{register, login, verify, reset-request, reset-confirm}/route.ts`. zod body/query 검증 + service 호출 + 한국어 에러. route-helpers에서 AuthErrorCode → HTTP status 매핑 + x-forwarded-for 기반 getClientIp.
- **Session 재사용**: login 성공 시 `createAuthSession` + `applyAuthSessionCookie`. 쿠키 `yeon.session` TTL 30일 그대로.
- **Timing defense**: login-service의 user/credential 없음 경로에서도 dummy hash 대상 `verifyPassword` 호출하여 timing side channel 방어.
- **Race defense**: register의 transaction 호출부에 try/catch + `isUniqueViolation(23505)` 감지 → 재조회 후 `emailAlreadyRegistered` 또는 `requiresLinkToExistingAccount` 재분기.
- **Password reset 시 보안/UX**: 성공 시 해당 user의 active auth_sessions 전체 삭제 + 실패 login_attempts cleanup(즉시 잠금 해제).
- **auth_sessions 성능**: schema에 `userId` index 추가 + `0032_add_auth_sessions_user_id_idx.sql` idempotent 마이그레이션.
- **code-review (.omc/reviews/US-002.md)**: critical 3(email 정규화 비대칭 / set-password endpoint 누락 / unique_violation 500 누출) + major 5(in-memory rate limit / timing side channel / resend-verification endpoint 누락 / userId index 없음 / account lock password reset 후 유지) + minor 5. critical + major 전부 해소.
- **US-003 scope 추가**: spec에 `POST /api/auth/credentials/resend-verification` / `POST /api/auth/credentials/set-password` 반영.
- **검증**: lint ✅, typecheck(web + api-contract) ✅, build ✅ (@node-rs/argon2 standalone binary 번들링 확인), db:check:drift ✅.
- **PRD 상태**: `.omc/prd.json` US-002.passes = true.

### 3차. US-003 credential UI + 기존 소셜과 병행 (예정, 별도 세션)

이메일 provider wrapper + 템플릿 + argon2id + credential 5 endpoint + login_attempts rate limit. **이 세션 범위 밖** — 별도 세션에서 이어서.

### 3차. US-003 credential UI (예정)

가입/로그인/인증 안내/재설정 UI, 기존 소셜 surface 와 공존.

### 4차. US-004 guest card-service IndexedDB (예정)

idb wrapper + GuestLocalStore + card-service 훅 server/guest 모드 분기.

### 5차. US-005 merge endpoint + MergeDialog (**완료**)

- 단일 트랜잭션 merge service + route + MergeDialog + 홈 수동 재진입 버튼까지 구현.
- `.omc/reviews/US-005.md`: critical 2(escape clause) + major 5 + minor 5.
- critical 2 + major 4 해소, major 1(home direct 진입 UX)은 스코프 기록으로 수용.
- lint / typecheck green.

### 6차. US-006 FINAL review + deslop + validation + 로그 완료 (**완료**)

- `.omc/reviews/US-006.md`: major 1(useMutation 경계 누락) + minor 2(중복 에러 분기 / dead export) 해소.
- `ai-slop-cleaner` bounded pass: guest-store dead code 삭제 + credential error helper 공통화 + auth layout `QueryProvider` 추가.
- `.omc/reviews/FINAL.md`를 flashcard-credential-login 전체 diff 기준으로 교체.
- `pnpm --filter @yeon/web lint` / `typecheck` / `build` / `db:check:drift` 모두 green.

## 로그

- 04:41 — ralph-strict Step 0 사전 체크 완료. 사용자 B1(단일 브랜치 누적) 확정.
- 04:41 — ralph-strict Step 1 deep-interview 게이트 진입.
- 04:41~ — Round 1 조건부 자동+다이얼로그 / Round 2 IndexedDB / Round 3 이메일기반+동일계정 / Round 4 Contrarian 인증+재설정 포함 / Round 5 진행도 out-of-scope / Round 6 사용자 clarify → dev-login 유지 / Round 7 느슨 비번 정책 / Round 8 기본 rate limit. ambiguity 100%→61%→52%→46.5%→43%→35.5%→33.7%→28.3%→16.5%.
- 04:41~ — Step 2: spec crystallize → `.omc/specs/deep-interview-flashcard-guest-and-credential-login.md` 작성.
- 04:41~ — Step 2: strict template 기반 `.omc/prd.json` 교체 (6 stories, 각 story 에 DI-PASS + CR-PASS-C3-M3-m3 의무 criterion 삽입).
- 04:41~ — Step 3 ralph 본체 진입. US-001 scaffold 및 code-review 완료까지 1차 세션에서 수행.
- 05:xx — US-001 passes:true, 1차 세션 종료. ralph state cleared. PRD·spec·reviews 디스크 보존.
- **05:54 — 2차 세션 재개**. 사용자 `/ralph-strict 기존 PRD 이어서 (US-002부터)` 호출.
  - 사전 체크: Codex 현재 [작업중] 문서 없음 (10-작업-codex_0546-0554 완료). 범위 겹침 없음.
  - git status: US-001 변경 17개 그대로 uncommitted. `apps/mobile/tsconfig.json`, `apps/mobile/.gitignore`, `scripts/dev-all.mjs`은 Codex의 10번 모바일 실행 관련 변경 — 건드리지 않음.
  - Inline Socratic 스킵 (spec 이미 PASSED, ambiguity 16.5%).
  - Step 3 ralph 본체 재진입. US-002(이메일 infra + credential backend + rate limit) 자동 selection 예정.
- 05:54~06:12 — US-002 구현 15 파일 + code-review(critical 3 / major 5 / minor 5) + critical·major 전부 해소(코드 수정 + schema/0032 마이그레이션 + spec 업데이트) + 검증 전부 green.
- **06:12 — 2차 세션 종료**. 사용자 명시 "이번 세션 마감, US-003은 별도 세션". US-002 passes:true 기록. Ralph state cleared.
- 이 세션 누적 완료: **US-001 + US-002 (2/6)**. 남은 US-003(credential UI) / US-004(guest IndexedDB) / US-005(merge endpoint + dialog) / US-006(FINAL review + deslop + validation + commit)는 PRD에 passes:false 유지, 후속 세션에서 `/ralph-strict`로 재개 가능.
- **06:16 — 3차 세션 재개**. 사용자 `/ralph-strict 다음 작업 진행해`. US-003(credential UI + resend-verification + set-password) 진입 예정.
  - 사전 체크: Codex [작업중] 문서 없음. 범위 겹침 없음.
  - 기존 auth UI: `apps/web/src/features/landing-home/login-modal.tsx` 유일 + `/auth/error` 페이지만. credential form과 신규 페이지(verify-sent, verified, reset-request, reset-password) 대량 작성 예정.
  - US-002 review에서 추가된 backend endpoint 2개(`resend-verification`, `set-password`)도 이번 story scope에 포함.
- 06:16~ — US-003 구현 20 파일 · code-review(c3/M3/m5) · critical 3 + major 3 전부 해소 · typecheck/lint 재검증 green.
- **US-003 passes:true** (세션 3 종료). 남은 US-004(guest IndexedDB) / US-005(merge endpoint + dialog) / US-006(FINAL review + deslop + validation + commit) — PRD 보존, 후속 세션 재개.
- **06:34 — 3차 세션 종료**. 사용자 명시 "이번 세션 마감, US-004부터 별도 세션". ralph + ultrawork state cleared. 누적 3/6 완료. 다음: `/ralph-strict` 호출로 US-004부터.
- **06:35 — 4차 세션 재개**. 사용자 `/ralph-strict 다음 작업 진행해`. US-004(guest card-service IndexedDB) 진입.
- 06:35~ — 구현 11 파일(guest-card-service-store, auth-context, layout/3 page, 5 hooks) + code-review(c3/M3/m5) + critical 3 + major 3 전부 해소 + hooks/index barrel factory rename + typecheck/lint green.
- **US-004 passes:true** (세션 4 종료). 남은 US-005(merge endpoint + MergeDialog) / US-006(FINAL + deslop + validation + commit) — PRD 보존.
- **06:47 — 4차 세션 종료**. 사용자 명시 "이번 세션 마감, US-005부터 별도 세션". ralph + ultrawork state cleared. 누적 **4/6 완료**.
- **06:48~07:49 — 5차 세션 진행**. US-005 merge endpoint + dialog 구현.
  - 구현: `merge-guest-card-decks-service.ts`, merge route, `use-merge-guest.ts`, `merge-guest-dialog.tsx`, `card-service-home.tsx`, guest store 확장.
  - `.omc/reviews/US-005.md`: critical 2 / major 5 / minor 5 식별. clear 실패 중복 merge, cross-tab 신규 덱 삭제 위험을 같은 story 안에서 해소.
  - 결과: US-005 `passes:true`.
- **07:49~08:01 — 6차 세션 진행**. FINAL review + ai-slop-cleaner + 검증.
  - cross-cutting review에서 credential form direct fetch/useState mutation 경계 위반을 찾아 `apps/web/src/app/auth/layout.tsx` 추가 + auth form 5개를 `useMutation` 기반으로 정리.
  - `credential-client.ts`에 `getCredentialErrorMessage()` 추가, guest store의 unused export 삭제.
  - 검증: `pnpm --filter @yeon/web lint` ✅ / `typecheck` ✅ / `build` ✅ / `db:check:drift` ✅.
  - 결과: US-006 `passes:true`.

## ralph-strict 결과 요약

- 완료 story 수: **6/6**
- 총 리뷰 이슈: **critical 14 / major 21 / minor 27**
- 최종 기준 HEAD: `a6881742358017af437508a81aa91298ffa21b36`
- 비고: 현재 워크스페이스는 공유 dirty 상태(`develop`)이며, 이번 세션에서는 새 commit을 만들지 않았다.
