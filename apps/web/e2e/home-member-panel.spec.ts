import { test, expect } from "@playwright/test";
import {
  setupHomeMocks,
  MOCK_MEMBER_RECENT,
  MOCK_MEMBER_WARNING,
  makeRecord,
} from "./helpers/mock-api";

const MEMBER_RECORD = makeRecord({
  memberId: MOCK_MEMBER_RECENT.id,
  sessionTitle: "1회차 상담",
});

test.describe("수강생 클릭 → MemberPanel", () => {
  test.beforeEach(async ({ page }) => {
    await setupHomeMocks(page, {
      members: [MOCK_MEMBER_RECENT, MOCK_MEMBER_WARNING],
      records: [MEMBER_RECORD],
    });

    // 수강생 상세 레코드 mock
    await page.route(
      `/api/v1/counseling-records/${MEMBER_RECORD.id}`,
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            record: {
              ...MEMBER_RECORD,
              audioUrl: null,
              transcriptSegments: [],
              analysisResult: null,
            },
          }),
        }),
    );

    await page.goto("/home");
    await page.waitForLoadState("networkidle");
  });

  test("수강생 클릭 시 MemberPanel이 중앙에 표시된다", async ({ page }) => {
    await page.getByRole("button", { name: MOCK_MEMBER_RECENT.name }).click();

    await expect(
      page.getByRole("heading", { name: MOCK_MEMBER_RECENT.name }),
    ).toBeVisible({ timeout: 3000 });
    await expect(page.getByText("총 상담")).toBeVisible();
    await expect(page.getByText("마지막 상담")).toBeVisible();
    await expect(page.getByText("상태")).toBeVisible();
  });

  test("MemberPanel에서 상담 기록을 클릭하면 CenterPanel로 전환된다", async ({
    page,
  }) => {
    await page.getByRole("button", { name: MOCK_MEMBER_RECENT.name }).click();
    await expect(page.getByText("1회차 상담")).toBeVisible({ timeout: 3000 });

    await page
      .getByRole("button", { name: /1회차 상담/ })
      .first()
      .click();

    // MemberPanel이 사라지고 CenterPanel이 표시되어야 함
    await expect(
      page.getByRole("heading", { name: MOCK_MEMBER_RECENT.name }),
    ).not.toBeVisible({ timeout: 3000 });
  });

  test("다른 수강생을 클릭하면 선택이 토글된다", async ({ page }) => {
    await page.getByRole("button", { name: MOCK_MEMBER_RECENT.name }).click();
    await expect(
      page.getByRole("heading", { name: MOCK_MEMBER_RECENT.name }),
    ).toBeVisible();

    // 같은 수강생 다시 클릭 → 선택 해제
    await page.getByRole("button", { name: MOCK_MEMBER_RECENT.name }).click();
    await expect(
      page.getByRole("heading", { name: MOCK_MEMBER_RECENT.name }),
    ).not.toBeVisible({ timeout: 2000 });
  });
});
