import {
  dismissHomeInsightBannerBodySchema,
  dismissHomeInsightBannerResponseSchema,
  homeInsightBannerStateResponseSchema,
} from "@yeon/api-contract";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  jsonError,
  requireAuthenticatedUser,
  withHandler,
} from "@/app/api/v1/counseling-records/_shared";
import {
  dismissHomeInsightBanner,
  listHomeInsightBannerDismissals,
} from "@/server/services/home-insight-banner-service";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  return withHandler(async () => {
    const { currentUser, response } = await requireAuthenticatedUser(request);
    if (!currentUser) {
      return response;
    }

    const state = await listHomeInsightBannerDismissals(currentUser.id);

    return NextResponse.json(homeInsightBannerStateResponseSchema.parse(state));
  });
}

export async function POST(request: NextRequest) {
  return withHandler(async () => {
    const { currentUser, response } = await requireAuthenticatedUser(request);
    if (!currentUser) {
      return response;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("요청 본문 JSON 형식이 올바르지 않습니다.", 400);
    }

    const parsed = dismissHomeInsightBannerBodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("배너 dismiss 요청 값이 올바르지 않습니다.", 400);
    }

    const result = await dismissHomeInsightBanner({
      userId: currentUser.id,
      bannerKey: parsed.data.bannerKey,
    });

    return NextResponse.json(
      dismissHomeInsightBannerResponseSchema.parse(result),
    );
  });
}
