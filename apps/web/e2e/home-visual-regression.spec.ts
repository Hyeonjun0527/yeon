import { test, expect } from "@playwright/test";
import {
  setupHomeMocks,
  makeRecord,
  MOCK_MEMBER_RECENT,
} from "./helpers/mock-api";

/**
 * 시각적 회귀 테스트.
 * 최초 실행 시: `pnpm exec playwright test home-visual-regression --update-snapshots`
 * 이후 실행 시: 저장된 스크린샷과 비교.
 */
test.describe("홈 화면 시각적 회귀", () => {
  test("빈 상태 화면 스냅샷", async ({ page }) => {
    await setupHomeMocks(page, { records: [] });
    await page.goto("/home");
    await page.waitForLoadState("networkidle");
    // 로딩 스피너가 사라질 때까지 대기
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("empty-state.png", {
      maxDiffPixels: 100,
    });
  });

  test("레코드 목록 있는 화면 스냅샷", async ({ page }) => {
    const records = [
      makeRecord({
        id: "rec-001",
        sessionTitle: "3월 멘토링",
        studentName: "김철수",
        status: "ready",
      }),
      makeRecord({
        id: "rec-002",
        sessionTitle: "4월 1:1 상담",
        studentName: "이영희",
        status: "ready",
      }),
    ];
    await setupHomeMocks(page, { records, members: [MOCK_MEMBER_RECENT] });
    await page.goto("/home");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    await expect(page).toHaveScreenshot("records-list.png", {
      maxDiffPixels: 100,
    });
  });
});
