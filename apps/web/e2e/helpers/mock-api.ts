import type { Page } from "@playwright/test";

export const MOCK_SPACE = {
  id: "space-001",
  name: "백엔드 3기",
  description: null,
  startDate: null,
  endDate: null,
  createdAt: new Date().toISOString(),
};

export const MOCK_MEMBER_RECENT = {
  id: "member-001",
  name: "김철수",
  email: "chulsoo@example.com",
  status: "active",
};

export const MOCK_MEMBER_WARNING = {
  id: "member-002",
  name: "이영희",
  email: "younghee@example.com",
  status: "active",
};

export const MOCK_MEMBER_NONE = {
  id: "member-003",
  name: "박민준",
  email: "minjun@example.com",
  status: "active",
};

export function makeRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: "record-001",
    spaceId: "space-001",
    memberId: null,
    studentName: "",
    sessionTitle: "상담 기록",
    counselingType: "",
    status: "ready",
    recordSource: "audio_upload",
    preview: "상담 요약입니다",
    audioDurationMs: 0,
    errorMessage: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/** 기본 API 라우트 mock — 모든 홈 테스트에서 공통 사용 */
export async function setupHomeMocks(
  page: Page,
  opts: {
    records?: object[];
    members?: object[];
    spaces?: object[];
  } = {},
) {
  const records = opts.records ?? [];
  const members = opts.members ?? [];
  const spaces = opts.spaces ?? [MOCK_SPACE];

  await page.route("/api/v1/counseling-records", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ records }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route("/api/v1/counseling-records/**", (route) =>
    route.continue(),
  );

  await page.route("/api/v1/spaces", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ spaces }),
      });
    } else {
      await route.continue();
    }
  });

  await page.route(/\/api\/v1\/spaces\/[^/]+\/members$/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ members }),
    });
  });
}
