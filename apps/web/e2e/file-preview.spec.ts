import { test, expect } from "@playwright/test";

/**
 * FilePreview 컴포넌트 렌더링 검증
 *
 * 근본 원인: @cyntler/react-doc-viewer의 MSDocRenderer가
 * https://view.officeapps.live.com 외부 서비스를 iframe으로 임베드해
 * localhost URL에 접근 불가 → 항상 X 표시
 *
 * 수정: xlsx(SheetJS)로 클라이언트에서 직접 파싱 후 HTML 테이블 렌더링
 */
test.describe("FilePreview - XLSX 렌더링", () => {
  test("스프레드시트 선택 시 테이블이 렌더링되어야 한다", async ({ page }) => {
    await page.goto("/test/file-preview");

    // 로딩 스피너가 사라질 때까지 대기
    await expect(page.getByText("미리보기 로딩 중...")).toBeVisible({
      timeout: 5000,
    });
    await expect(page.getByText("미리보기 로딩 중...")).not.toBeVisible({
      timeout: 10000,
    });

    // SheetJS가 생성한 HTML 테이블이 렌더링되어야 함
    const table = page.locator("table");
    await expect(table).toBeVisible({ timeout: 5000 });

    // 테이블에 헤더 데이터가 있어야 함
    await expect(page.getByText("이름")).toBeVisible();
    await expect(page.getByText("이메일")).toBeVisible();
    await expect(page.getByText("트랙")).toBeVisible();

    // 데이터 행도 있어야 함
    await expect(page.getByText("홍길동")).toBeVisible();
    await expect(page.getByText("백엔드")).toBeVisible();

    // X 에러 아이콘이 없어야 함
    await expect(
      page.locator('img[src*="error"], svg[data-error]'),
    ).not.toBeVisible();
  });

  test("에러 상태: 잘못된 URI는 에러 메시지를 표시해야 한다", async ({
    page,
  }) => {
    // 존재하지 않는 파일 URI로 테스트 — 404 응답
    await page.route("/api/test/sample-xlsx", (route) =>
      route.fulfill({ status: 404, body: "Not Found" }),
    );

    await page.goto("/test/file-preview");

    await expect(page.getByText("미리보기 로딩 중...")).not.toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByText("파일을 불러올 수 없습니다.")).toBeVisible({
      timeout: 5000,
    });
  });
});
