import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/**
 * 접근성 자동 검사 (axe-core)
 *
 * nested interactive element (button 안의 button 등), 색상 대비,
 * ARIA 속성 누락 등 WCAG 위반을 자동으로 잡아준다.
 *
 * 실행: pnpm exec playwright test e2e/accessibility.spec.ts
 */

// axe가 잡는 룰 중 이 프로젝트에서 제외할 항목
// (디자인 의도로 허용한 것들만 여기에 추가)
const EXCLUDED_RULES = [
  "color-contrast", // 다크 테마 커스텀 색상은 별도 검증
];

test.describe("접근성 검사", () => {
  test("홈 워크스페이스 — 빈 상태", async ({ page }) => {
    await page.route("/api/v1/counseling-records", (route) =>
      route.fulfill({ json: { records: [] } }),
    );
    await page.route("/api/v1/spaces", (route) =>
      route.fulfill({ json: { spaces: [] } }),
    );

    await page.goto("/home");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .disableRules(EXCLUDED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("수강생관리 — 빈 상태", async ({ page }) => {
    await page.route("/api/v1/spaces", (route) =>
      route.fulfill({ json: { spaces: [] } }),
    );

    await page.goto("/home/student-management");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .disableRules(EXCLUDED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test("수강생관리 — 수강생 목록 있을 때", async ({ page }) => {
    await page.route("/api/v1/spaces", (route) =>
      route.fulfill({
        json: {
          spaces: [
            {
              id: "space-1",
              name: "백엔드 3기",
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }),
    );
    await page.route("/api/v1/spaces/space-1/members", (route) =>
      route.fulfill({
        json: {
          members: [
            {
              id: "m-1",
              name: "김철수",
              email: "kim@example.com",
              phone: null,
              status: "active",
              initialRiskLevel: "low",
              createdAt: new Date().toISOString(),
            },
          ],
        },
      }),
    );

    await page.goto("/home/student-management");
    await page.waitForLoadState("networkidle");

    const results = await new AxeBuilder({ page })
      .disableRules(EXCLUDED_RULES)
      .analyze();

    expect(results.violations).toEqual([]);
  });
});
