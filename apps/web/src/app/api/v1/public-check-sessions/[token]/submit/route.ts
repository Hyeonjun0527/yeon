import { NextResponse } from "next/server";
import {
  submitPublicCheckBodySchema,
  submitPublicCheckResultSchema,
} from "@yeon/api-contract";

import { jsonError } from "@/app/api/v1/counseling-records/_shared";
import { submitPublicCheck } from "@/server/services/public-check-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { token } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = submitPublicCheckBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("체크인 요청 값이 올바르지 않습니다.", 400);
  }

  try {
    const result = await submitPublicCheck({ token, body: parsed.data });
    return NextResponse.json(submitPublicCheckResultSchema.parse(result));
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("체크인을 처리하지 못했습니다.", 500);
  }
}
