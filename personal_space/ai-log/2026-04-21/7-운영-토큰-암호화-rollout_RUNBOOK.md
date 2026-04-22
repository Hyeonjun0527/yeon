# OAuth 토큰 암호화 rollout RUNBOOK

대상: Drive/OneDrive access/refresh 토큰 평문 → AES-256-GCM 암호화 백필 (보안 6번 백로그 3차)

본 문서는 코드 배포 후 운영 DB의 평문 토큰을 안전하게 암호화 컬럼으로 옮기기 위한 실행 절차다.

## 사전 점검

1. **`AUTH_SECRET` 운영 환경변수 존재** 확인
   - `crypto.ts`의 HKDF가 이를 마스터로 사용해 field 암호화 키를 도출.
   - 미설정이거나 임시 값으로 운영되고 있다면, 백필 결과가 잘못된 키로 저장돼 추후 복호화 불가.
   - 점검: 운영 호스트 또는 호스팅 secret 화면에서 `AUTH_SECRET` 값 존재 여부.

2. **마이그레이션 0028 적용 확인**
   - `googledrive_tokens`, `onedrive_tokens`에 `access_token_encrypted`, `refresh_token_encrypted` 컬럼이 존재해야 한다.
   - SQL: `\\d googledrive_tokens` (psql) 또는 동등 도구.

3. **dual-write 코드 배포 완료 확인**
   - `pnpm --filter @yeon/web build` 결과가 운영에 배포된 상태여야 한다.
   - 배포 시점부터 새로 저장되는 row는 평문/암호화 둘 다 채워진다.

## 백필 실행

```sh
# 운영 DATABASE_URL과 AUTH_SECRET이 설정된 셸에서
cd apps/web
pnpm exec tsx scripts/encrypt-oauth-tokens.ts
```

- 멱등 (`access_token_encrypted IS NULL` row만 처리)
- 출력 예시
  ```
  OAuth 토큰 암호화 백필 시작
  [googledrive_tokens] 백필 대상 row: 12건
  [googledrive_tokens] 완료: 12건 업데이트
  [onedrive_tokens] 백필 대상 row: 4건
  [onedrive_tokens] 완료: 4건 업데이트
  OAuth 토큰 암호화 백필 종료
  ```

## 백필 검증

```sql
-- 모든 row가 암호화 컬럼을 가지고 있는지
SELECT
  COUNT(*) AS total,
  COUNT(access_token_encrypted) AS access_filled,
  COUNT(refresh_token_encrypted) AS refresh_filled
FROM googledrive_tokens;

SELECT
  COUNT(*) AS total,
  COUNT(access_token_encrypted) AS access_filled,
  COUNT(refresh_token_encrypted) AS refresh_filled
FROM onedrive_tokens;
```

- `total = access_filled = refresh_filled` 이면 백필 완료.

## 후속 작업 (별도 차수)

- **1주 안정화 후 평문 컬럼 drop**
  - 코드: 평문 컬럼 참조 제거 (read fallback 제거, write에서도 평문 컬럼 채우지 않음)
  - 마이그레이션: `ALTER TABLE googledrive_tokens DROP COLUMN access_token`, `DROP COLUMN refresh_token` (멱등 패턴), 동일하게 onedrive_tokens.
  - drop 전 DB 백업 권장.

## 트러블슈팅

| 증상                                | 원인 후보                                  | 조치                                                                                                                    |
| ----------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET 환경변수가 필요합니다` | env 누락                                   | 운영 secret에 AUTH_SECRET 추가 후 재실행                                                                                |
| 일부 row만 백필됨                   | 스크립트가 중간에 중단                     | 멱등이므로 다시 실행하면 미처리 row만 처리                                                                              |
| Drive/OneDrive 연동 사용자 401 발생 | AUTH_SECRET이 백필 시점과 다른 값으로 변경 | AUTH_SECRET 회전은 모든 암호화 데이터를 무효화한다. 사용자 재인증 또는 평문 컬럼 fallback으로 자동 회복 (드롭 전이라면) |
