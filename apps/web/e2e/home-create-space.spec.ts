import { test, expect } from "@playwright/test";
import { setupHomeMocks, MOCK_SPACE } from "./helpers/mock-api";

const CREATED_SPACE = {
  id: "space-new",
  name: "디자인 스쿨 1기",
  description: null,
  startDate: null,
  endDate: null,
  createdAt: new Date().toISOString(),
};

test.describe("스페이스 만들기 - 3가지 선택지 UI", () => {
  test.beforeEach(async ({ page }) => {
    await setupHomeMocks(page, { spaces: [MOCK_SPACE] });

    await page.route("/api/v1/spaces", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ space: CREATED_SPACE }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ spaces: [MOCK_SPACE] }),
        });
      }
    });

    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    // 스페이스 드롭다운 열기
    await page.getByRole("button", { name: MOCK_SPACE.name }).click();
  });

  test("드롭다운에 '새 스페이스 만들기' 버튼이 있다", async ({ page }) => {
    await expect(page.getByRole("button", { name: /새 스페이스 만들기/ })).toBeVisible();
  });

  test("클릭 시 3가지 선택지 모달이 열린다", async ({ page }) => {
    await page.getByRole("button", { name: /새 스페이스 만들기/ }).click();

    await expect(page.getByText("직접 만들기")).toBeVisible({ timeout: 2000 });
    await expect(page.getByText("OneDrive에서 가져오기")).toBeVisible();
    await expect(page.getByText("Google Drive에서 가져오기")).toBeVisible();
  });

  test("직접 만들기 선택 시 입력 폼이 열린다", async ({ page }) => {
    await page.getByRole("button", { name: /새 스페이스 만들기/ }).click();
    await page.getByRole("button", { name: /직접 만들기/ }).click();

    await expect(page.getByPlaceholder(/스페이스 이름/)).toBeVisible({ timeout: 2000 });
  });

  test("직접 만들기로 스페이스를 생성할 수 있다", async ({ page }) => {
    await page.getByRole("button", { name: /새 스페이스 만들기/ }).click();
    await page.getByRole("button", { name: /직접 만들기/ }).click();

    await page.getByPlaceholder(/스페이스 이름/).fill("디자인 스쿨 1기");
    await page.getByRole("button", { name: "만들기" }).click();

    // 모달이 닫혀야 함
    await expect(page.getByPlaceholder(/스페이스 이름/)).not.toBeVisible({ timeout: 3000 });
  });

  test("이름 없이 만들기 버튼이 비활성화된다", async ({ page }) => {
    await page.getByRole("button", { name: /새 스페이스 만들기/ }).click();
    await page.getByRole("button", { name: /직접 만들기/ }).click();

    await expect(page.getByRole("button", { name: "만들기" })).toBeDisabled();
  });

  test("OneDrive 선택 시 파일 형식 가이드라인이 표시된다", async ({ page }) => {
    await page.getByRole("button", { name: /새 스페이스 만들기/ }).click();
    await page.getByRole("button", { name: /OneDrive에서 가져오기/ }).click();

    await expect(page.getByText("OneDrive 파일 형식 안내")).toBeVisible({ timeout: 2000 });
    await expect(page.getByText("이름")).toBeVisible();
    await expect(page.getByText("이메일")).toBeVisible();
    await expect(page.getByText("트랙")).toBeVisible();
  });

  test("Google Drive 선택 시 파일 형식 가이드라인이 표시된다", async ({ page }) => {
    await page.getByRole("button", { name: /새 스페이스 만들기/ }).click();
    await page.getByRole("button", { name: /Google Drive에서 가져오기/ }).click();

    await expect(page.getByText("Google Drive 파일 형식 안내")).toBeVisible({ timeout: 2000 });
  });

  test("가이드라인에서 뒤로 가면 선택 화면으로 돌아간다", async ({ page }) => {
    await page.getByRole("button", { name: /새 스페이스 만들기/ }).click();
    await page.getByRole("button", { name: /OneDrive에서 가져오기/ }).click();

    await expect(page.getByText("OneDrive 파일 형식 안내")).toBeVisible();
    await page.getByRole("button", { name: /뒤로/ }).click();

    await expect(page.getByText("직접 만들기")).toBeVisible({ timeout: 2000 });
  });
});
