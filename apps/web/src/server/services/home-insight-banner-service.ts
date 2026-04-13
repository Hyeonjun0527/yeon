import { eq, sql } from "drizzle-orm";
import type {
  DismissHomeInsightBannerResponse,
  HomeInsightBannerDismissal,
  HomeInsightBannerKey,
  HomeInsightBannerStateResponse,
} from "@yeon/api-contract";
import { homeInsightBannerKeyValues } from "@yeon/api-contract";

import { getDb } from "@/server/db";
import { homeInsightBannerDismissals } from "@/server/db/schema";

const HOME_INSIGHT_BANNER_DISMISS_DURATION_MS = 1000 * 60 * 60 * 3;

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function toDismissalMap(rows: { bannerKey: string; hiddenUntil: Date }[]) {
  return new Map<HomeInsightBannerKey, string>(
    rows.map((row) => [
      row.bannerKey as HomeInsightBannerKey,
      row.hiddenUntil.toISOString(),
    ]),
  );
}

export async function listHomeInsightBannerDismissals(
  userId: string,
): Promise<HomeInsightBannerStateResponse> {
  const rows = await getDb()
    .select({
      bannerKey: homeInsightBannerDismissals.bannerKey,
      hiddenUntil: homeInsightBannerDismissals.hiddenUntil,
    })
    .from(homeInsightBannerDismissals)
    .where(eq(homeInsightBannerDismissals.userId, userId));
  const dismissalMap = toDismissalMap(rows);

  return {
    dismissals: homeInsightBannerKeyValues.map((bannerKey) => ({
      bannerKey,
      hiddenUntil: dismissalMap.get(bannerKey) ?? null,
    })),
  };
}

export async function dismissHomeInsightBanner(params: {
  userId: string;
  bannerKey: HomeInsightBannerKey;
}): Promise<DismissHomeInsightBannerResponse> {
  const hiddenUntil = new Date(
    Date.now() + HOME_INSIGHT_BANNER_DISMISS_DURATION_MS,
  );

  await getDb()
    .insert(homeInsightBannerDismissals)
    .values({
      userId: params.userId,
      bannerKey: params.bannerKey,
      hiddenUntil,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [
        homeInsightBannerDismissals.userId,
        homeInsightBannerDismissals.bannerKey,
      ],
      set: {
        hiddenUntil,
        updatedAt: sql`excluded.updated_at`,
      },
    });

  const dismissal: HomeInsightBannerDismissal = {
    bannerKey: params.bannerKey,
    hiddenUntil: toIso(hiddenUntil),
  };

  return { dismissal };
}
