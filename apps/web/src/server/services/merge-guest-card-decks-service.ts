import type {
  MergeGuestRequest,
  MergeGuestResponse,
} from "@yeon/api-contract/card-deck-merge-guest";

import { getDb } from "@/server/db";
import { cardDeckItems, cardDecks } from "@/server/db/schema";
import { ID_PREFIX, generatePublicId } from "@/server/lib/public-id";

import { ServiceError } from "./service-error";

export async function mergeGuestCardDecks(params: {
  userId: string;
  payload: MergeGuestRequest;
}): Promise<MergeGuestResponse> {
  const db = getDb();
  let createdDeckCount = 0;
  let createdItemCount = 0;
  const now = new Date();

  try {
    await db.transaction(async (tx) => {
      for (const deck of params.payload.decks) {
        const title = deck.title.trim();
        if (!title) {
          throw new ServiceError(400, "덱 제목은 비워 둘 수 없습니다.");
        }
        const description = deck.description?.trim() || null;

        const [deckRow] = await tx
          .insert(cardDecks)
          .values({
            publicId: generatePublicId(ID_PREFIX.cardDecks),
            ownerUserId: params.userId,
            title,
            description,
            updatedAt: now,
          })
          .returning({ id: cardDecks.id });

        if (!deckRow) {
          throw new ServiceError(500, "덱을 생성하지 못했습니다.");
        }

        createdDeckCount += 1;

        if (deck.items.length === 0) {
          continue;
        }

        const itemValues = deck.items.map((item) => ({
          publicId: generatePublicId(ID_PREFIX.cardDeckItems),
          deckId: deckRow.id,
          frontText: item.frontText.trim(),
          backText: item.backText.trim(),
          updatedAt: now,
        }));

        for (const value of itemValues) {
          if (!value.frontText || !value.backText) {
            throw new ServiceError(
              400,
              "앞면과 뒷면이 모두 있는 카드만 이관할 수 있습니다. 빈 카드를 정리한 뒤 다시 시도해 주세요.",
            );
          }
        }

        const insertedItems = await tx
          .insert(cardDeckItems)
          .values(itemValues)
          .returning({ id: cardDeckItems.id });

        createdItemCount += insertedItems.length;
      }
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      throw error;
    }
    console.error("guest 덱 이관 트랜잭션 실패", error);
    throw new ServiceError(
      500,
      "덱 이관에 실패했습니다. 다시 시도해 주세요.",
    );
  }

  return { createdDeckCount, createdItemCount };
}
