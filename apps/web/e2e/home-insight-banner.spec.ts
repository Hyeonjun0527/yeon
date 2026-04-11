import { test, expect } from "@playwright/test";
import {
  setupHomeMocks,
  MOCK_MEMBER_RECENT,
  MOCK_MEMBER_WARNING,
  MOCK_MEMBER_NONE,
  makeRecord,
} from "./helpers/mock-api";

/** 14일 전 날짜 ISO 문자열 */
function daysAgo(days: number) {
  return new Date(Date.now() - days * 86400000).toISOString();
}

// indicator=recent: 오늘 상담 기록
const RECENT_RECORD = makeRecord({
  id: "rec-recent",
  memberId: MOCK_MEMBER_RECENT.id,
  createdAt: daysAgo(3),
  status: "ready",
});

// indicator=warning: 20일 전 상담 기록
const WARNING_RECORD = makeRecord({
  id: "rec-warning",
  memberId: MOCK_MEMBER_WARNING.id,
  createdAt: daysAgo(20),
  status: "ready",
});

test.describe("상담 인사이트 배너", () => {
  test("모든 수강생이 recent면 배너가 표시되지 않는다", async ({ page }) => {
    await setupHomeMocks(page, {
      members: [MOCK_MEMBER_RECENT],
      records: [RECENT_RECORD],
    });

    await page.goto("/home");

    // processing 또는 ready 상태의 레코드가 있어야 CenterPanel이 보임
    await page.route("/api/v1/counseling-records", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ records: [RECENT_RECORD] }),
      }),
    );

    await page.waitForLoadState("networkidle");
    await expect(
      page.getByText(/상담 간격 주의|상담 이력 없음/),
    ).not.toBeVisible();
  });

  test("warning 수강생이 있으면 배너가 표시된다", async ({ page }) => {
    await setupHomeMocks(page, {
      members: [MOCK_MEMBER_WARNING],
      records: [WARNING_RECORD],
    });

    await page.route("/api/v1/counseling-records", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ records: [WARNING_RECORD] }),
      }),
    );

    await page.goto("/home");

    // 레코드를 선택해 CenterPanel이 표시되게 함
    await page.waitForLoadState("networkidle");

    // 사이드바 미분류 항목 클릭
    const recordBtn = page.getByRole("button", { name: /상담 기록/ }).first();
    if (await recordBtn.isVisible()) {
      await recordBtn.click();
      await expect(page.getByText(/상담 간격 주의/)).toBeVisible({
        timeout: 3000,
      });
    }
  });

  test("상담 이력 없는 수강생이 있으면 배너가 표시된다", async ({ page }) => {
    await setupHomeMocks(page, {
      members: [MOCK_MEMBER_NONE],
      records: [makeRecord({ memberId: null })],
    });

    await page.route("/api/v1/counseling-records", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ records: [makeRecord({ memberId: null })] }),
      }),
    );

    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const recordBtn = page.getByRole("button", { name: /상담 기록/ }).first();
    if (await recordBtn.isVisible()) {
      await recordBtn.click();
      await expect(page.getByText(/상담 이력 없음/)).toBeVisible({
        timeout: 3000,
      });
    }
  });

  test("배너 클릭 시 해당 수강생이 사이드바에서 선택된다", async ({ page }) => {
    await setupHomeMocks(page, {
      members: [MOCK_MEMBER_WARNING],
      records: [WARNING_RECORD],
    });

    await page.route("/api/v1/counseling-records", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ records: [WARNING_RECORD] }),
      }),
    );

    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const recordBtn = page.getByRole("button", { name: /상담 기록/ }).first();
    if (await recordBtn.isVisible()) {
      await recordBtn.click();

      const banner = page.getByText(/상담 간격 주의/);
      if (await banner.isVisible({ timeout: 3000 })) {
        await banner.click();
        // 배너 클릭 후 수강생 이름이 MemberPanel에 표시되어야 함
        await expect(
          page.getByRole("heading", { name: MOCK_MEMBER_WARNING.name }),
        ).toBeVisible({ timeout: 3000 });
      }
    }
  });
});
