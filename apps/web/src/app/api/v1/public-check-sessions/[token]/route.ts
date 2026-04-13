import { publicCheckEntrySchema, publicCheckSessionPublicSchema } from "@yeon/api-contract";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { jsonError } from "@/app/api/v1/counseling-records/_shared";
import {
  clearRememberedPublicCheckIdentityCookie,
  getRememberedPublicCheckIdentities,
} from "@/server/services/public-check-device-cookie";
import { getPublicCheckSessionByToken } from "@/server/services/public-check-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const parsedEntry = publicCheckEntrySchema.safeParse(
    request.nextUrl.searchParams.get("entry"),
  );

  try {
    const { session, spaceId, shouldClearRememberedIdentity } =
      await getPublicCheckSessionByToken({
        token,
        entry: parsedEntry.success ? parsedEntry.data : null,
        rememberedIdentities: getRememberedPublicCheckIdentities(request),
      });
    const response = NextResponse.json(
      publicCheckSessionPublicSchema.parse(session),
    );

    if (shouldClearRememberedIdentity) {
      clearRememberedPublicCheckIdentityCookie(response, request, spaceId);
    }

    return response;
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("체크인 세션을 불러오지 못했습니다.", 500);
  }
}
