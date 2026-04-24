import { and, asc, desc, eq, sql } from "drizzle-orm";
import type {
  CardDeckDto,
  CardDeckItemDto,
  CreateCardDeckBody,
  CreateCardDeckItemBody,
  UpdateCardDeckBody,
  UpdateCardDeckItemBody,
} from "@yeon/api-contract/card-decks";

import { getDb } from "@/server/db";
import { cardDeckItems, cardDecks } from "@/server/db/schema";
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

import { ServiceError } from "./service-error";

type CardDeckRow = typeof cardDecks.$inferSelect;
type CardDeckItemRow = typeof cardDeckItems.$inferSelect;

function toCardDeckDto(row: CardDeckRow, itemCount: number): CardDeckDto {
  return {
    id: row.publicId,
    title: row.title,
    description: row.description,
    itemCount,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toCardDeckItemDto(row: CardDeckItemRow): CardDeckItemDto {
  return {
    id: row.publicId,
    frontText: row.frontText,
    backText: row.backText,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function findOwnedDeckRow(
  userId: string,
  deckPublicId: string,
): Promise<CardDeckRow> {
  const [row] = await getDb()
    .select()
    .from(cardDecks)
    .where(
      and(
        eq(cardDecks.publicId, deckPublicId),
        eq(cardDecks.ownerUserId, userId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ServiceError(404, "덱을 찾지 못했습니다.");
  }

  return row;
}

async function findOwnedItemRow(
  userId: string,
  deckPublicId: string,
  itemPublicId: string,
): Promise<{ deck: CardDeckRow; item: CardDeckItemRow }> {
  const deck = await findOwnedDeckRow(userId, deckPublicId);
  const [item] = await getDb()
    .select()
    .from(cardDeckItems)
    .where(
      and(
        eq(cardDeckItems.publicId, itemPublicId),
        eq(cardDeckItems.deckId, deck.id),
      ),
    )
    .limit(1);

  if (!item) {
    throw new ServiceError(404, "카드를 찾지 못했습니다.");
  }

  return { deck, item };
}

export async function listCardDecks(userId: string): Promise<CardDeckDto[]> {
  const rows = await getDb()
    .select({
      id: cardDecks.id,
      publicId: cardDecks.publicId,
      ownerUserId: cardDecks.ownerUserId,
      title: cardDecks.title,
      description: cardDecks.description,
      createdAt: cardDecks.createdAt,
      updatedAt: cardDecks.updatedAt,
      itemCount: sql<number>`count(${cardDeckItems.id})::int`.mapWith(Number),
    })
    .from(cardDecks)
    .leftJoin(cardDeckItems, eq(cardDeckItems.deckId, cardDecks.id))
    .where(eq(cardDecks.ownerUserId, userId))
    .groupBy(cardDecks.id)
    .orderBy(desc(cardDecks.createdAt));

  return rows.map((row) =>
    toCardDeckDto(
      {
        id: row.id,
        publicId: row.publicId,
        ownerUserId: row.ownerUserId,
        title: row.title,
        description: row.description,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      },
      row.itemCount,
    ),
  );
}

export async function createCardDeck(
  userId: string,
  body: CreateCardDeckBody,
): Promise<CardDeckDto> {
  const title = body.title.trim();
  if (!title) {
    throw new ServiceError(400, "덱 제목을 입력해주세요.");
  }

  const description = body.description?.trim() || null;
  const now = new Date();

  const [row] = await getDb()
    .insert(cardDecks)
    .values({
      publicId: generatePublicId(ID_PREFIX.cardDecks),
      ownerUserId: userId,
      title,
      description,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new ServiceError(500, "덱을 생성하지 못했습니다.");
  }

  return toCardDeckDto(row, 0);
}

export async function getCardDeckDetail(
  userId: string,
  deckPublicId: string,
): Promise<{ deck: CardDeckDto; items: CardDeckItemDto[] }> {
  const deckRow = await findOwnedDeckRow(userId, deckPublicId);
  const itemRows = await getDb()
    .select()
    .from(cardDeckItems)
    .where(eq(cardDeckItems.deckId, deckRow.id))
    .orderBy(asc(cardDeckItems.createdAt));

  return {
    deck: toCardDeckDto(deckRow, itemRows.length),
    items: itemRows.map(toCardDeckItemDto),
  };
}

export async function updateCardDeck(
  userId: string,
  deckPublicId: string,
  body: UpdateCardDeckBody,
): Promise<CardDeckDto> {
  const existingDeck = await findOwnedDeckRow(userId, deckPublicId);

  const updateFields: Partial<typeof cardDecks.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.title !== undefined) {
    const nextTitle = body.title.trim();
    if (!nextTitle) {
      throw new ServiceError(400, "덱 제목을 입력해주세요.");
    }
    updateFields.title = nextTitle;
  }

  if (body.description !== undefined) {
    updateFields.description = body.description?.trim() || null;
  }

  const [updated] = await getDb()
    .update(cardDecks)
    .set(updateFields)
    .where(eq(cardDecks.id, existingDeck.id))
    .returning();

  if (!updated) {
    throw new ServiceError(500, "덱을 수정하지 못했습니다.");
  }

  const [{ count }] = await getDb()
    .select({
      count: sql<number>`count(${cardDeckItems.id})::int`.mapWith(Number),
    })
    .from(cardDeckItems)
    .where(eq(cardDeckItems.deckId, updated.id));

  return toCardDeckDto(updated, count);
}

export async function deleteCardDeck(
  userId: string,
  deckPublicId: string,
): Promise<void> {
  const existingDeck = await findOwnedDeckRow(userId, deckPublicId);
  await getDb().delete(cardDecks).where(eq(cardDecks.id, existingDeck.id));
}

export async function createCardDeckItem(
  userId: string,
  deckPublicId: string,
  body: CreateCardDeckItemBody,
): Promise<CardDeckItemDto> {
  const deckRow = await findOwnedDeckRow(userId, deckPublicId);
  const frontText = body.frontText.trim();
  const backText = body.backText.trim();

  if (!frontText || !backText) {
    throw new ServiceError(400, "앞면과 뒷면을 모두 입력해주세요.");
  }

  const [row] = await getDb()
    .insert(cardDeckItems)
    .values({
      publicId: generatePublicId(ID_PREFIX.cardDeckItems),
      deckId: deckRow.id,
      frontText,
      backText,
      updatedAt: new Date(),
    })
    .returning();

  if (!row) {
    throw new ServiceError(500, "카드를 추가하지 못했습니다.");
  }

  return toCardDeckItemDto(row);
}

export async function updateCardDeckItem(
  userId: string,
  deckPublicId: string,
  itemPublicId: string,
  body: UpdateCardDeckItemBody,
): Promise<CardDeckItemDto> {
  const { item } = await findOwnedItemRow(userId, deckPublicId, itemPublicId);

  const updateFields: Partial<typeof cardDeckItems.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (body.frontText !== undefined) {
    const next = body.frontText.trim();
    if (!next) {
      throw new ServiceError(400, "앞면을 입력해주세요.");
    }
    updateFields.frontText = next;
  }

  if (body.backText !== undefined) {
    const next = body.backText.trim();
    if (!next) {
      throw new ServiceError(400, "뒷면을 입력해주세요.");
    }
    updateFields.backText = next;
  }

  const [updated] = await getDb()
    .update(cardDeckItems)
    .set(updateFields)
    .where(eq(cardDeckItems.id, item.id))
    .returning();

  if (!updated) {
    throw new ServiceError(500, "카드를 수정하지 못했습니다.");
  }

  return toCardDeckItemDto(updated);
}

export async function deleteCardDeckItem(
  userId: string,
  deckPublicId: string,
  itemPublicId: string,
): Promise<void> {
  const { item } = await findOwnedItemRow(userId, deckPublicId, itemPublicId);
  await getDb().delete(cardDeckItems).where(eq(cardDeckItems.id, item.id));
}
