import { beforeEach, describe, expect, it, vi } from "vitest";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("@/server/db", () => ({
  getDb: getDbMock,
}));

vi.mock("@/server/db/schema", () => ({
  homeInsightBannerDismissals: {
    userId: "homeInsightBannerDismissals.userId",
    bannerKey: "homeInsightBannerDismissals.bannerKey",
    hiddenUntil: "homeInsightBannerDismissals.hiddenUntil",
  },
}));

vi.mock("drizzle-orm", () => ({
  eq: (left: unknown, right: unknown) => ({ left, right }),
  sql: (strings: TemplateStringsArray) => strings.join(""),
}));

import {
  dismissHomeInsightBanner,
  listHomeInsightBannerDismissals,
} from "../home-insight-banner-service";

function createDbMock(selectRows: unknown[]) {
  let selected = false;
  const insertedPayloads: unknown[] = [];
  const conflictPayloads: unknown[] = [];

  const db = {
    select: vi.fn(() => {
      const chain = {
        from: vi.fn(() => chain),
        where: vi.fn(async () => {
          if (selected) {
            return [];
          }

          selected = true;
          return selectRows;
        }),
      };

      return chain;
    }),
    insert: vi.fn(() => {
      const chain = {
        values: vi.fn((payload: unknown) => {
          insertedPayloads.push(payload);
          return chain;
        }),
        onConflictDoUpdate: vi.fn((payload: unknown) => {
          conflictPayloads.push(payload);
          return Promise.resolve();
        }),
      };

      return chain;
    }),
  };

  return { db, insertedPayloads, conflictPayloads };
}

describe("home-insight-banner-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("저장된 전역 dismiss 상태를 배너별로 반환한다", async () => {
    const { db } = createDbMock([
      {
        bannerKey: "counseling_none",
        hiddenUntil: new Date("2026-04-13T12:00:00.000Z"),
      },
    ]);
    getDbMock.mockReturnValue(db);

    await expect(listHomeInsightBannerDismissals("user-1")).resolves.toEqual({
      dismissals: [
        {
          bannerKey: "counseling_none",
          hiddenUntil: "2026-04-13T12:00:00.000Z",
        },
        {
          bannerKey: "counseling_warning",
          hiddenUntil: null,
        },
      ],
    });
  });

  it("배너 dismiss는 hiddenUntil을 3시간 뒤로 upsert한다", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-13T09:00:00.000Z"));

    const { db, insertedPayloads, conflictPayloads } = createDbMock([]);
    getDbMock.mockReturnValue(db);

    await expect(
      dismissHomeInsightBanner({
        userId: "user-1",
        bannerKey: "counseling_warning",
      }),
    ).resolves.toEqual({
      dismissal: {
        bannerKey: "counseling_warning",
        hiddenUntil: "2026-04-13T12:00:00.000Z",
      },
    });

    expect(insertedPayloads[0]).toMatchObject({
      userId: "user-1",
      bannerKey: "counseling_warning",
      hiddenUntil: new Date("2026-04-13T12:00:00.000Z"),
    });
    expect(conflictPayloads[0]).toMatchObject({
      set: {
        hiddenUntil: new Date("2026-04-13T12:00:00.000Z"),
      },
    });
  });
});
