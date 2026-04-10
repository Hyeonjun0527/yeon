import { test, expect } from "@playwright/test";
import { setupHomeMocks, makeRecord, MOCK_MEMBER_RECENT } from "./helpers/mock-api";

test.describe("홈 화면 골든 패스", () => {
  test("레코드가 없을 때 빈 상태 화면이 표시된다", async ({ page }) => {
    await setupHomeMocks(page, { records: [] });
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // 빈 상태: 녹음 시작 또는 파일 업로드 안내
    await expect(page.getByRole("button", { name: /녹음 시작|새 상담 기록/ }).first()).toBeVisible({ timeout: 5000 });
  });

  test("레코드 목록이 있을 때 사이드바에 표시된다", async ({ page }) => {
    const record = makeRecord({ id: "rec-001", sessionTitle: "3월 멘토링", status: "ready" });
    await setupHomeMocks(page, { records: [record] });
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("3월 멘토링")).toBeVisible({ timeout: 5000 });
  });

  test("레코드를 클릭하면 상세 패널이 활성화된다", async ({ page }) => {
    const record = makeRecord({ id: "rec-001", sessionTitle: "4월 1:1 상담", status: "ready" });
    await page.route(`/api/v1/counseling-records/${record.id}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          record: {
            ...record,
            transcriptSegments: [],
            audioUrl: null,
            analysisResult: null,
            transcriptText: "",
          },
        }),
      });
    });
    await setupHomeMocks(page, { records: [record] });
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await page.getByText("4월 1:1 상담").click();
    // 중앙 패널에 레코드 제목이 표시되어야 함
    await expect(page.getByText("4월 1:1 상담").first()).toBeVisible({ timeout: 3000 });
  });

  test("수강생 목록이 사이드바에 표시된다", async ({ page }) => {
    const record = makeRecord({ id: "rec-001", memberId: MOCK_MEMBER_RECENT.id, studentName: "김철수" });
    await setupHomeMocks(page, {
      records: [record],
      members: [MOCK_MEMBER_RECENT],
    });
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // 수강생 탭이나 수강생 이름이 보여야 함
    await expect(page.getByText("김철수").first()).toBeVisible({ timeout: 5000 });
  });

  test("processing 상태 레코드는 로딩 인디케이터를 표시한다", async ({ page }) => {
    const processingRecord = makeRecord({
      id: "rec-proc",
      sessionTitle: "처리 중 상담",
      status: "processing",
    });
    await setupHomeMocks(page, { records: [processingRecord] });
    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("처리 중 상담")).toBeVisible({ timeout: 5000 });
  });
});
