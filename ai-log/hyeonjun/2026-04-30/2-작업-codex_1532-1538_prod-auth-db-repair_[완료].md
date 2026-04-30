# 작업-codex | 운영 인증 DB 중복/마이그레이션 복구

- 주체: Codex CLI
- 워크트리: A (/home/osuma/coding_stuffs/yeon)
- 브랜치: develop
- 작업창(예상): 15:32 ~ 16:30
- 실제 시작: 15:32
- 실제 종료: 15:38
- 상태: 완료

## 파일·디렉토리 범위 (whitelist)
- 읽기: 운영 DB 스키마/중복/참조 상태, migration 상태
- 쓰기: 운영 DB 중복 계정 정리 및 migration 적용(필요 시), 작업 로그

## 절대 건드리지 않을 범위 (상대 주체 담당)
- 애플리케이션 코드 변경 없음

## 상대 주체 현황 스냅샷
- cloudflared access tcp로 db.yeon.world → localhost:15432 터널 제공됨

## 차수별 작업내용
- 1차: 운영 DB 연결/현재 상태 읽기 전용 점검
- 2차: 중복 이메일 계정 참조 그래프 확인
- 3차: 안전한 정리/마이그레이션/로그인 API 검증

### 1차 연결 상태
- localhost:15432 listener 확인됨: cloudflared 프로세스가 127.0.0.1:15432 LISTEN.
- Postgres 프로토콜 SSLRequest에 `N` 응답 확인: 터널 뒤 DB까지 TCP는 도달.
- 현재 로컬 `apps/web/.env`의 `yeon_local` credential로 접속 시 `28P01 password authentication failed`.
- 기본 후보 `yeon/change-me`, `yeon/yeon`, `postgres/postgres`도 `28P01`.

### 현재 blocker
- 운영 DB 접속 credential이 현재 세션에 없음. 터널은 열렸지만 PostgreSQL 인증 정보가 필요.

### 2차 조치
- 운영 DB 접속 성공.
- `users.email` 중복 1건 확인: 같은 이메일 2 users.
- 참조 확인 결과 삭제 대상 user는 business data FK 참조 없음, `auth_sessions`/`user_identities`만 존재.
- `ops_auth_duplicate_user_backup_20260430` 백업 테이블 생성 후 중복 대상 users/user_identities/auth_sessions row 백업.
- 더 최근 로그인/생성 계정을 keeper로 두고 오래된 중복 user 삭제(cascade로 해당 identity/session 삭제).

### 3차 마이그레이션/검증
- pending migrations 적용 완료: 0027, 0028, 0029, 0030, 0031, 0032.
- 중복 이메일 0건 확인.
- 신규 인증 테이블 확인: password_credentials, email_verification_tokens, password_reset_tokens, login_attempts.
- live API 검증:
  - `/api/v1/auth/session` 200
  - `/api/auth/google?...` 307 OAuth redirect
  - `/api/auth/kakao?...` 307 OAuth redirect
  - credentials login nonexistent: 500 -> 401 정상 오류로 회복
  - credentials register existing social email: 200 link-needed 정상 응답
