import { mergeGuestRequestSchema } from "@yeon/api-contract/card-deck-merge-guest";
import { errorResponseSchema } from "@yeon/api-contract/error";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCurrentAuthUser } from "@/server/auth/session";
import { mergeGuestCardDecks } from "@/server/services/merge-guest-card-decks-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json(errorResponseSchema.parse({ message }), { status });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentAuthUser();

  if (!user) {
    return jsonError("로그인 후 이용해 주세요.", 401);
  }

  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return jsonError("요청 본문을 해석할 수 없습니다.", 400);
  }

  const parsed = mergeGuestRequestSchema.safeParse(rawBody);

  if (!parsed.success) {
    const message =
      parsed.error.issues[0]?.message ??
      "이관할 덱 데이터가 올바르지 않습니다.";
    return jsonError(message, 400);
  }

  try {
    const result = await mergeGuestCardDecks({
      userId: user.id,
      payload: parsed.data,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error("guest 덱 이관 처리 중 오류", error);
    return jsonError(
      "서버 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      500,
    );
  }
}
