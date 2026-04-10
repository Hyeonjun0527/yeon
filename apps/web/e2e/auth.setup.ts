/**
 * 개발용 로그인 세션을 미리 획득해 storageState.json에 저장.
 * ALLOW_DEV_LOGIN=true인 로컬 서버에서만 사용 가능.
 *
 * 사용법:
 *   playwright.config.ts에서 globalSetup으로 등록하거나,
 *   `pnpm exec playwright test --project=setup` 으로 단독 실행.
 */

import { chromium } from "@playwright/test";
import path from "node:path";

export const STORAGE_STATE_PATH = path.join(
  __dirname,
  ".auth/session.json",
);

export default async function globalSetup() {
  const browser = await chromium.launch();
  const page = await browser.newPage();

  // dev-login → 세션 쿠키 발급 + /home 리다이렉트
  await page.goto("http://localhost:3000/api/auth/dev-login");
  await page.waitForURL("**/home", { timeout: 10000 });

  // storageState 저장 (쿠키 포함)
  await page.context().storageState({ path: STORAGE_STATE_PATH });

  await browser.close();
}
