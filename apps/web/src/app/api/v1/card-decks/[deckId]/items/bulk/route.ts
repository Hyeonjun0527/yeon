import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createCardDeckItemsBodySchema } from "@yeon/api-contract/card-decks";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { createCardDeckItems } from "@/server/services/card-decks-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) {
    return response;
  }

  const { deckId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = createCardDeckItemsBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);
  }

  try {
    const items = await createCardDeckItems(
      currentUser.id,
      deckId,
      parsed.data,
    );
    return NextResponse.json({ items }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("카드를 일괄 추가하지 못했습니다.", 500);
  }
}
