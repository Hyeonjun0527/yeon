import { NextResponse } from "next/server";
import { publicCheckSessionPublicSchema } from "@yeon/api-contract";

import { jsonError } from "@/app/api/v1/counseling-records/_shared";
import { getPublicCheckSessionByToken } from "@/server/services/public-check-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;

  try {
    const session = await getPublicCheckSessionByToken(token);
    return NextResponse.json(publicCheckSessionPublicSchema.parse(session));
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("체크인 세션을 불러오지 못했습니다.", 500);
  }
}
