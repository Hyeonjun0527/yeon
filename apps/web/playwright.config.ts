import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const STORAGE_STATE = path.join(__dirname, "e2e/.auth/session.json");

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    /**
     * setup 프로젝트: dev-login으로 세션을 획득해 storageState 저장.
     * `pnpm exec playwright test --project=setup` 으로 단독 실행.
     * 이후 e2e 테스트에서 --project=chromium-authed 로 인증 세션 재사용 가능.
     */
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },

    /** 기본: API 모킹 방식 (서버 로그인 불필요) */
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /auth\.setup\.ts/,
    },

    /** 실서버 테스트: setup 실행 후 storageState로 인증 세션 재사용 */
    {
      name: "chromium-authed",
      use: {
        ...devices["Desktop Chrome"],
        storageState: STORAGE_STATE,
      },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
