/**
 * Drive/OneDrive 토큰 평문 컬럼을 AES-256-GCM 암호화 컬럼으로 백필한다.
 *
 * 멱등: access_token_encrypted IS NULL 인 row만 처리한다.
 * dual-write가 이미 적용된 운영에서도 안전하게 반복 실행 가능.
 *
 * 실행 전제:
 *   - DATABASE_URL, AUTH_SECRET 환경변수가 설정돼 있어야 한다.
 *   - 코드 배포(dual-write)가 먼저 끝난 뒤 실행한다.
 *
 * 실행:
 *   pnpm --filter @yeon/web exec tsx scripts/encrypt-oauth-tokens.ts
 */

import "dotenv/config";
import { eq, isNull, type AnyPgColumn } from "drizzle-orm";

import { encryptField } from "../src/server/auth/field-crypto";
import { getDb, getPool } from "../src/server/db";
import { googledriveTokens, onedriveTokens } from "../src/server/db/schema";

type TokenTable = typeof googledriveTokens | typeof onedriveTokens;

async function backfillTable(label: string, table: TokenTable) {
  const db = getDb();
  const rows = await db
    .select()
    .from(table)
    .where(isNull(table.accessTokenEncrypted as AnyPgColumn));

  console.log(`[${label}] 백필 대상 row: ${rows.length}건`);

  let updated = 0;
  for (const row of rows) {
    await db
      .update(table)
      .set({
        accessTokenEncrypted: encryptField(row.accessToken),
        refreshTokenEncrypted: encryptField(row.refreshToken),
      })
      .where(eq(table.id, row.id));
    updated += 1;
  }

  console.log(`[${label}] 완료: ${updated}건 업데이트`);
}

async function main() {
  if (!process.env.AUTH_SECRET) {
    throw new Error("AUTH_SECRET 환경변수가 설정돼 있어야 합니다.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL 환경변수가 설정돼 있어야 합니다.");
  }

  console.log("OAuth 토큰 암호화 백필 시작");
  await backfillTable("googledrive_tokens", googledriveTokens);
  await backfillTable("onedrive_tokens", onedriveTokens);
  console.log("OAuth 토큰 암호화 백필 종료");
}

main()
  .catch((error) => {
    console.error("백필 실패:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool().end();
  });
