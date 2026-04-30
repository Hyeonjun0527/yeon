# 소셜 로그인 / 세션 인증 보안 전면 강화

## 배경

- card-service 추가 전 보안 점검 결과 Critical 1, Major 3, Minor 3 발견.
- 사용자 결정: **전부 다 잡고** card-service 진행한다 (이 문서 → 작업 → 5번 backlog 2차로 복귀).
- 진단은 `oh-my-claudecode:security-reviewer` 실행 결과(2026-04-21)에 근거.

## 발견된 이슈 인덱스

| ID | Severity | 위치 | 한 줄 요약 |
| --- | --- | --- | --- |
| S1 | Critical | `db/schema/googledrive-tokens.ts:14-15`, `onedrive-tokens.ts:14-15` | OAuth provider access/refresh token 평문 DB 저장 |
| S2 | Major | `auth/oauth-state.ts:114` | OAuth state 비교가 `===` (타이밍 공격 가능) |
| S3 | Major | `auth/dev-login.ts:98-103`, `app/api/auth/dev-login/route.ts:26` | dev-login 가드가 env + Host 헤더 의존 (proxy 우회 가능) |
| S4 | Major | `auth/social-providers.ts:189-206`, `262-277` | Google/Kakao OAuth에 PKCE 미적용 |
| S5 | Minor | `db/schema/users.ts:6` | `users.email`에 unique index 없음 (중복 계정 race) |
| S6 | Minor | `auth/session.ts:110-116` | 세션 30일 고정, 슬라이딩 만료/회전 없음 |
| S7 | Minor | `auth/social-providers.ts:208-260` | Google id_token JWT 미검증 (UserInfo 재호출) |

## 정상 동작 확인된 항목 (변경 불필요)

- 세션 토큰: 쿠키엔 raw, DB엔 SHA 해시 저장 (`hashAuthToken`)
- OAuth state 쿠키 HMAC 서명 + 검증 자체는 timing-safe
- Open redirect 차단 (`normalizeAuthRedirectPath`)
- 로그아웃 시 서버 세션 삭제
- 쿠키 플래그: HttpOnly, SameSite=lax, Secure(prod), Path=/
- 에러/로그에 토큰·세션 ID 누출 없음

---

## 1차 — 본 문서 (기획/설계 확정)

### 작업내용
- 차수별 스펙/논의 항목/추천을 확정한다.
- 코드 변경 없음. 사용자 방향 받은 뒤 2차부터 구현.

### 논의 필요 (전 차수 공통)
1. 암호화 키 관리 전략
2. 기존 운영 데이터 마이그레이션 전략
3. PKCE 적용 시 Kakao 호환성 확인
4. dev-login의 운영 차단 강도
5. Minor 항목까지 이번 사이클에 포함할지 여부

### 선택지

**(a) 암호화 키 관리** — **확정: AUTH_SECRET 마스터 + HKDF sub-key derive**
- 운영 키는 `AUTH_SECRET` 하나만 유지 (env 추가 없음)
- `crypto.ts`에서 `hkdfSync("sha256", AUTH_SECRET, "", "v1:<purpose>", 32)`로 용도별 sub-key 도출
- 도출 키 2종: `sessionHmacKey` (기존 HMAC 용도), `fieldEncKey` (필드 암호화 용도)
- 키 회전은 `AUTH_SECRET` 자체 교체 = 세션 전부 무효화 + 암호화 데이터 재암호화 동시 발생 (all-or-nothing). yeon 규모에서 수용 가능.
- 출력 포맷에 `v1:` 버전 prefix 유지 → 미래에 `v2:` 도입 시 디크립션 호환

**(b) 기존 평문 토큰 마이그레이션**
- b1. **eager 배치**: 마이그레이션 SQL 후 별도 일회성 스크립트로 모든 row 재암호화
- b2. lazy: 다음 토큰 사용 시점에 재암호화. 미사용 row는 평문 잔존
- b3. **새 컬럼 추가 → dual-write 기간 → cutover**: `access_token_encrypted`, `refresh_token_encrypted` 추가, 신규는 둘 다 쓰고 기존은 백필 후 평문 컬럼 drop

**(c) Kakao PKCE 지원**
- 공식 문서 재확인 필요. 미지원이면 Google만 적용하고 Kakao는 state 강화로 대체.

**(d) dev-login 운영 차단 강도**
- d1. **production 빌드에서 route 파일 자체를 제외** (next config or runtime throw + secret 추가)
- d2. `ALLOW_DEV_LOGIN` env + `DEV_LOGIN_SECRET` 이중 가드
- d3. loopback 판정을 `request.nextUrl.hostname` 대신 `req.socket.remoteAddress` 기반으로 변경

**(e) Minor 항목 범위**
- e1. **이번 사이클에 전부 포함**
- e2. Minor는 다음 분기로 분리

### 추천
- (a) **확정** — 위 (a) 섹션 참조. AUTH_SECRET + HKDF derive.
- (b) **b3 (dual-write)** — 운영 무중단. 평문 컬럼 drop은 마이그레이션 별도 차수.
- (c) Kakao 공식 문서 확인 후 결정. 일단 작업 차수는 Google 먼저.
- (d) **d1 + d2 동시** — 운영 빌드에서 route 자체 throw + env 이중 가드.
- (e) **e1** — 사용자 결정대로 전부.

### 사용자 방향
- (a) 사용자 확정: AUTH_SECRET 재사용 + HKDF sub-key derive
- 나머지: 추천대로 진행

---

## 2차 — 보안 인프라: field-crypto 모듈 신설

### 작업내용
- `apps/web/src/server/auth/crypto.ts`
  - `hkdfSync("sha256", AUTH_SECRET_BUFFER, "", "v1:field-encryption", 32)` 결과를 `fieldEncryptionKey`로 export
  - 기존 HMAC 용도도 같은 패턴(`v1:session-hmac`)으로 derive 키를 별도 export하여 raw `AUTH_SECRET`이 모듈 밖으로 새지 않게 정리 (점진적, 본 차수에선 export만 추가하고 호출자 변경은 분리)
- `apps/web/src/server/lib/field-crypto.ts` 신설
  - AES-256-GCM 기반 `encryptField(plain: string): string`, `decryptField(stored: string): string`
  - 출력 포맷: `v1:<base64-iv>:<base64-tag>:<base64-ciphertext>` — 미래 v2 도입 호환
  - decrypt 시 prefix 분기로 v1 처리, 알 수 없는 prefix는 throw
  - 키는 모듈 로드 시점에 `crypto.ts`의 `fieldEncryptionKey`를 import (별도 env 신설 없음)
  - `AUTH_SECRET` 미설정 시 기존 boot 가드(crypto.ts)가 이미 throw → 추가 가드 불필요
- `apps/web/src/server/lib/__tests__/field-crypto.test.ts`
  - round-trip
  - 변조된 ciphertext → GCM tag 검증 실패
  - 변조된 IV → 실패
  - 알 수 없는 prefix(`v9:...`) → 명확한 에러
  - 평문 입력별 ciphertext 매번 달라짐(IV 랜덤성 확인)
- `.env.example`/문서 변경 없음 (env 추가 없음)
- README는 추후 보안 가이드 차수에서 정리

### 논의 필요
- 키 길이/모드: AES-256-GCM 단일안 vs ChaCha20-Poly1305 옵션 → AES-256-GCM 단일안으로 확정
- 별도 의존성 불필요 (Node `node:crypto` 표준)

### 추천
- AES-256-GCM 단일안. Node.js `crypto` 표준 지원, 별도 의존성 불필요.
- HKDF sub-key 도출은 `crypto.ts` 한 곳에서만 하고, `field-crypto.ts`는 그 결과만 import.

### 사용자 방향
- (비어 있음)

### 검증
- `pnpm lint` / typecheck / `pnpm --filter @yeon/web build`
- 추가된 테스트만 실행

---

## 3차 — S1 (Critical): Drive/OneDrive 토큰 암호화 (dual-write)

### 작업내용
- 마이그레이션 SQL 1: 두 테이블에 `access_token_encrypted text`, `refresh_token_encrypted text`(nullable) 추가, 기존 컬럼은 nullable로 완화
- `googledrive-service.ts`, `onedrive-service.ts`
  - 쓰기: 평문/암호화 컬럼 모두 채움 (dual-write)
  - 읽기: 암호화 컬럼 우선, 없으면 평문 fallback (백필 미완료 row 호환)
- 일회성 backfill 스크립트 `scripts/migrations/encrypt-oauth-tokens.ts`
  - 모든 평문 토큰 → 암호화 컬럼 채움. idempotent.
- 운영 절차 문서 `docs/deployment/oauth-token-encryption-rollout.md` 작성
  - 배포 → backfill 스크립트 실행 → 검증 (암호화 키는 기존 `AUTH_SECRET` 재사용하므로 신규 secret 주입 단계 없음)
  - 주의: `AUTH_SECRET`이 운영에 이미 설정돼 있는지만 사전 확인. 미설정이면 신규 발급 + 세션 전부 무효화 각오 필요.

### 논의 필요
- backfill 시점: 코드 배포와 동시 vs 배포 후 별도 윈도우
- 평문 컬럼 drop 차수: 다음 사이클로 분리할지

### 추천
- backfill은 배포 직후 별도 수동 실행 (실수 시 롤백 가능)
- 평문 컬럼 drop은 백필 검증 + 1주 안정화 후 별도 PR

### 사용자 방향
- (비어 있음)

### 검증
- 로컬 DB에 테스트 row 만들고 dual-write/read 동작 확인
- 마이그레이션 멱등 (`ADD COLUMN IF NOT EXISTS`)
- `pnpm --filter @yeon/web db:check:drift`

---

## 4차 — S2 (Major): OAuth state constant-time 비교

### 작업내용
- `apps/web/src/server/auth/oauth-state.ts:114`
  - `entry.state === options.state` → `timingSafeEqual(Buffer.from(entry.state), Buffer.from(options.state))` 헬퍼 사용
  - 길이 다르면 즉시 false
- `auth/__tests__/oauth-state.test.ts`에 케이스 추가 (구현 통과 확인용)

### 논의 필요
- 없음 (1줄 fix, 영향 범위 명확)

### 검증
- 기존 OAuth flow 회귀 테스트
- typecheck / build

---

## 5차 — S3 (Major): dev-login 운영 차단 강화

### 작업내용
- `apps/web/src/server/auth/dev-login.ts`
  - `process.env.NODE_ENV === "production"`이면 무조건 throw (Host 헤더 무관)
  - 비-prod에서도 `DEV_LOGIN_SECRET` env가 설정돼 있을 때만 허용. 요청은 헤더(`x-dev-login-secret`)로 secret 동봉. timing-safe 비교.
- `apps/web/src/app/api/auth/dev-login/route.ts`
  - production 빌드에서 즉시 404 반환 (route 파일은 유지하되 첫 줄에 prod throw)
- `.env.example` 정리: `ALLOW_DEV_LOGIN`, `DEV_LOGIN_SECRET` 설명, prod에서 절대 설정 금지 명시
- `__tests__/dev-login.test.ts`
  - prod NODE_ENV에서 throw, secret 불일치 시 차단, 정상 시나리오

### 논의 필요
- 운영에 dev-login 라우트 자체를 빌드에서 제외하는 옵션(next config) — 추가 비용 vs 추가 안전 차원
- 결정: 코드 가드 강화로 충분. config 분기는 추가 복잡도 대비 이점 적음.

### 검증
- 단위 테스트 + 통합 시나리오 수동 확인 (NODE_ENV 토글)

---

## 6차 — S4 (Major): PKCE 적용

### 작업내용
- 사전 조사: Kakao PKCE 지원 여부 (공식 문서 확인) → 미지원이면 Google만
- `apps/web/src/server/auth/social-providers.ts`
  - `code_verifier` 생성 (32바이트 base64url)
  - `code_challenge` = `sha256(code_verifier).base64url`
  - authorization URL에 `code_challenge`, `code_challenge_method=S256` 추가
  - token exchange에 `code_verifier` 동봉
- `apps/web/src/server/auth/oauth-state.ts`
  - state 쿠키 payload에 `code_verifier` 포함 (HMAC 서명 안에 들어가므로 변조 차단)
  - 만료/일회성 검증은 기존 그대로
- 테스트: state 쿠키에 verifier 포함되는지, exchange 페이로드에 verifier 보내는지

### 논의 필요
- state 쿠키 크기 증가 (수십 바이트 추가) — 영향 미미

### 검증
- Google login 회귀 테스트 (실제 OAuth flow)
- Kakao 지원 시 동일하게

---

## 7차 — S5 (Minor): users.email unique 보호

### 작업내용
- 사전 점검: 운영 DB에 동일 이메일 중복 row 존재하는지 (`SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1`)
  - 있으면 데이터 정리 마이그레이션 별도 작성
- 마이그레이션: `users.email`에 `UNIQUE` 제약 추가 (멱등 패턴)
  - schema 파일 `users.ts`에 `unique()` 추가
- `auth-service.ts`의 first-login 머지 로직
  - `INSERT ... ON CONFLICT (email) DO NOTHING RETURNING` 패턴으로 race 방지
  - 23505 catch 후 재조회/머지

### 논의 필요
- 이메일 nullable 정책: 현재 어떤가? unique 제약과 호환되는지

### 검증
- 운영 데이터 사전 점검 완료
- 동시 로그인 시뮬레이션 단위 테스트

---

## 8차 — S6 (Minor): 세션 슬라이딩 만료/회전 — **이번 사이클 보류**

### 보류 사유 (2026-04-21)
- 백로그 본 안(토큰 회전 + 쿠키 갱신 + 구 토큰 즉시 폐기)을 안전하게 적용하려면 클라 쿠키 갱신이 같이 일어나야 한다.
- 그런데 `requireAuthenticatedUser` 호출부가 50곳이라 일괄 수정 부담 + 회귀 위험.
- DB-only sliding(토큰 유지, expires만 연장)은 호출부 수정 없이 가능하지만, **leak된 토큰을 사용자 활동마다 자동 갱신해주는 보안 회귀**가 발생한다.
- 따라서 cookie 회전 메커니즘을 middleware 기반으로 분리 설계하는 별도 차수에서 다룬다.
- middleware 설계: edge runtime(DB 미가용) 한계 → Node.js runtime middleware 또는 응답 후처리 hook 형태 검토 필요.

### 후속 진행 시 작업내용 (예약)

### 작업내용
- `apps/web/src/server/auth/session.ts`
  - 매 요청마다 `lastAccessedAt` 갱신은 그대로 유지
  - 잔여 TTL이 임계값(예: 7일) 미만이면 신규 토큰 발급 + 쿠키 갱신 + 구 토큰 즉시 폐기
  - 임계값/총 수명 상수는 `constants.ts`에 정의
- `requireAuthenticatedUser` 또는 미들웨어에서 회전 응답 헤더(쿠키 set) 처리
- 단위 테스트: 회전 트리거, 구 토큰 무효화

### 논의 필요
- 회전 빈도: 너무 잦으면 모바일 동기화 이슈, 너무 드물면 효과 적음 → 7일 임계, 30일 max 권장

### 검증
- 단위 테스트 + 수동 시나리오

---

## 9차 — S7 (Minor): Google id_token 검증 — **이번 사이클 보류**

### 보류 사유 (2026-04-21)
- Severity가 Minor(현 UserInfo 호출도 Google에 의한 검증된 access_token으로 보호되고, 추가 공격 벡터는 OAuth 흐름 전체를 깨야 가능).
- 신규 의존성(`jose`) + JWKS 캐싱 인프라 도입은 단순 fix가 아니라 별도 설계.
- 보안 1·4·5·6·7차로 Critical/Major가 모두 종결되므로, 9차는 후속 사이클에서 단독 차수로 진행한다.

### 후속 진행 시 작업내용 (예약)

### 작업내용
- `apps/web/src/server/auth/social-providers.ts`
  - token exchange 응답의 `id_token` JWT 파싱
  - Google JWKS(`https://www.googleapis.com/oauth2/v3/certs`)로 서명 검증 (캐시 + 자동 회전)
  - `iss` ∈ `{accounts.google.com, https://accounts.google.com}`, `aud === GOOGLE_CLIENT_ID`, `exp` 미만, (PKCE와 함께라면) nonce 검증
  - 검증 통과 시 UserInfo 재호출 생략, claims에서 `sub`/`email`/`name` 사용
- `jose` 또는 동등 라이브러리 의존성 추가 (가벼움)

### 논의 필요
- 라이브러리 도입 vs 직접 검증 (`jose` 사용 권장)

### 검증
- Google login 회귀 + JWKS 캐시 동작 확인

---

## 차수 간 의존 관계

```
1차 (기획)
 └─ 2차 (field-crypto 인프라)
     └─ 3차 (S1: 토큰 암호화) ─ 운영 RUNBOOK 작성
 └─ 4차 (S2: state 비교)              ┐ — 인프라와 독립, 병렬 가능
 └─ 5차 (S3: dev-login 강화)          │
 └─ 6차 (S4: PKCE)                    │
 └─ 7차 (S5: email unique)            │
 └─ 8차 (S6: 세션 회전)               │
 └─ 9차 (S7: id_token 검증)           ┘
```

- 단일 PR로 묶을지, 차수별 PR로 나눌지: **차수별 PR 권장**. 회귀 위험 분리.
- 머지 순서: 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9. 각 머지 후 `develop` rebase.

## 검증 체크리스트 (전 차수 공통)

1. `pnpm lint` / format / typecheck
2. `pnpm --filter @yeon/web db:check:drift` (DB 변경 차수)
3. `pnpm --filter @yeon/web build`
4. 영향 영역 회귀 테스트 (특히 OAuth flow)
5. 커밋 직전 `git status --short | grep "^??"` 확인
6. 마이그레이션 SQL은 멱등 (`IF NOT EXISTS`, `duplicate_object` + `duplicate_table` 예외)
7. 운영 ENV 변경이 동반되는 차수(2, 3, 5, 6, 9)는 RUNBOOK에 반영 후 머지

## 보안 정책 메모 (이번 작업으로 고정할 원칙)

- DB에 들어가는 외부 시스템 access/refresh token, API key 등은 **반드시 `field-crypto`로 암호화**한다.
- 사용자 입력과 외부에서 받은 비교 대상 토큰/secret은 **반드시 `timingSafeEqual` 사용**.
- production NODE_ENV에서 dev 백도어 라우트는 **즉시 throw**.
- 새 OAuth provider 추가 시 **PKCE 기본 적용**. 미지원 provider만 예외.
- 운영 키/시크릿은 git에 절대 커밋 금지, `.env.example`로만 placeholder 남김.

이 정책은 작업 완료 후 `CLAUDE.md` 또는 별도 보안 가이드에 영구 반영한다 (별도 차수로 정리).
