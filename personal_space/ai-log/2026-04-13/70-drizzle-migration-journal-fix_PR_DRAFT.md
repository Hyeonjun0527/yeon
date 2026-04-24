## 작업 내용

- `users.email` 유니크 인덱스 제거용 `0020_clammy_nomad.sql`을 `DROP INDEX IF EXISTS`로 보강했습니다.
- Drizzle migration journal에 누락된 `0020_clammy_nomad` 엔트리를 추가해 `db:migrate`가 실제로 마이그레이션을 적용하도록 수정했습니다.
- 로컬 DB에서 `users_email_key` 제거, migration row 추가, 중복 이메일 insert 가능 여부를 확인했습니다.

## 변경 이유

- 카카오 앱별 별도 계정 분리 로직은 코드에 반영돼 있었지만, 마이그레이션 journal 누락으로 실제 DB에는 `users_email_key`가 남아 있었습니다.
- 그 결과 `db:migrate`가 성공처럼 보여도 실질적으로 no-op이었고, 카카오 로그인 시 같은 이메일의 별도 user 생성 전제가 깨져 있었습니다.

## 검증 방법

- `pnpm --filter @yeon/web db:migrate`
- `pnpm --filter @yeon/web lint`
- `pnpm --filter @yeon/web typecheck`
- `pnpm --filter @yeon/web build`
- `users` 인덱스 조회로 `users_email_key` 제거 확인
- `drizzle.__drizzle_migrations` 조회로 신규 migration row 확인
- 트랜잭션 롤백 기반 duplicate email insert 확인

## 브랜치 정보

- base: `develop`
- head: `web-drizzle-migration-journal-fix-1`
- 순번: `1`
