import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  verifyPublicCheckIdentityBodySchema,
  verifyPublicCheckIdentityResultSchema,
} from "@yeon/api-contract";

import { jsonError } from "@/app/api/v1/counseling-records/_shared";
import { applyRememberedPublicCheckIdentityCookie } from "@/server/services/public-check-device-cookie";
import { verifyPublicCheckIdentity } from "@/server/services/public-check-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = verifyPublicCheckIdentityBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("본인 확인 요청 값이 올바르지 않습니다.", 400);
  }

  try {
    const outcome = await verifyPublicCheckIdentity({
      token,
      body: parsed.data,
    });
    const response = NextResponse.json(
      verifyPublicCheckIdentityResultSchema.parse(outcome.result),
    );

    if (outcome.rememberedMemberId) {
      applyRememberedPublicCheckIdentityCookie(response, {
        request,
        spaceId: outcome.spaceId,
        memberId: outcome.rememberedMemberId,
      });
    }

    return response;
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("본인 확인을 처리하지 못했습니다.", 500);
  }
}
