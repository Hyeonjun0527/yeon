import { test, expect } from "@playwright/test";
import { setupHomeMocks, makeRecord } from "./helpers/mock-api";

const CREATED_MEMO = makeRecord({
  id: "memo-001",
  sessionTitle: "3월 피드백 메모",
  status: "ready",
  memberId: null,
  audioDurationMs: 0,
});

test.describe("텍스트 메모 빠른 입력", () => {
  test.beforeEach(async ({ page }) => {
    await setupHomeMocks(page);

    await page.route("/api/v1/counseling-records", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            record: {
              ...CREATED_MEMO,
              transcriptSegments: [],
              audioUrl: null,
              analysisResult: null,
              transcriptText: "메모 내용입니다",
            },
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ records: [] }),
        });
      }
    });

    await page.goto("/home");
    await page.waitForLoadState("networkidle");
  });

  test("'새 상담 기록' 드롭다운에 텍스트 메모 옵션이 있다", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /새 상담 기록/ }).click();
    await expect(
      page.getByRole("button", { name: /텍스트 메모/ }),
    ).toBeVisible();
  });

  test("텍스트 메모 클릭 시 모달이 열린다", async ({ page }) => {
    await page.getByRole("button", { name: /새 상담 기록/ }).click();
    await page.getByRole("button", { name: /텍스트 메모/ }).click();

    await expect(page.getByText("텍스트 메모")).toBeVisible({ timeout: 2000 });
    await expect(page.getByPlaceholder(/메모 내용/)).toBeVisible();
  });

  test("내용 없이 저장 버튼이 비활성화된다", async ({ page }) => {
    await page.getByRole("button", { name: /새 상담 기록/ }).click();
    await page.getByRole("button", { name: /텍스트 메모/ }).click();

    const saveBtn = page.getByRole("button", { name: "저장" });
    await expect(saveBtn).toBeDisabled();
  });

  test("내용 입력 후 저장하면 레코드 목록에 추가된다", async ({ page }) => {
    await page.getByRole("button", { name: /새 상담 기록/ }).click();
    await page.getByRole("button", { name: /텍스트 메모/ }).click();

    await page.getByPlaceholder(/메모 제목/).fill("3월 피드백 메모");
    await page.getByPlaceholder(/메모 내용/).fill("메모 내용입니다");
    await page.getByRole("button", { name: "저장" }).click();

    // 모달이 닫히고 레코드가 보여야 함
    await expect(page.getByPlaceholder(/메모 내용/)).not.toBeVisible({
      timeout: 3000,
    });
  });

  test("Escape 키로 모달을 닫을 수 있다", async ({ page }) => {
    await page.getByRole("button", { name: /새 상담 기록/ }).click();
    await page.getByRole("button", { name: /텍스트 메모/ }).click();
    await expect(page.getByPlaceholder(/메모 내용/)).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByPlaceholder(/메모 내용/)).not.toBeVisible({
      timeout: 2000,
    });
  });
});
