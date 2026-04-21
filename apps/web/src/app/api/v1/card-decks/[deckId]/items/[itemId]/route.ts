import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateCardDeckItemBodySchema } from "@yeon/api-contract/card-decks";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  deleteCardDeckItem,
  updateCardDeckItem,
} from "@/server/services/card-decks-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string; itemId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) {
    return response;
  }

  const { deckId, itemId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = updateCardDeckItemBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("수정 요청 형식이 올바르지 않습니다.", 400);
  }

  try {
    const item = await updateCardDeckItem(
      currentUser.id,
      deckId,
      itemId,
      parsed.data,
    );
    return NextResponse.json({ item });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("카드를 수정하지 못했습니다.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ deckId: string; itemId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) {
    return response;
  }

  const { deckId, itemId } = await params;

  try {
    await deleteCardDeckItem(currentUser.id, deckId, itemId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("카드를 삭제하지 못했습니다.", 500);
  }
}
