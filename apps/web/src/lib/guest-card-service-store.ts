"use client";

import type {
  CardDeckDetailResponse,
  CardDeckDto,
  CardDeckItemDto,
  CreateCardDeckBody,
  CreateCardDeckItemBody,
  UpdateCardDeckBody,
  UpdateCardDeckItemBody,
} from "@yeon/api-contract/card-decks";
import type { MergeGuestRequest } from "@yeon/api-contract/card-deck-merge-guest";
import { mergeGuestLimits } from "@yeon/api-contract/card-deck-merge-guest";
import { type DBSchema, type IDBPDatabase, openDB } from "idb";

// DB_VERSION: 스키마 변경 시 openDB upgrade 콜백에서 분기 처리 추가 필요.
// 1 = decks(by-created-at) + items(by-deck) 초기 스키마.
const DB_NAME = "yeon-guest-card-service";
const DB_VERSION = 1;

export class GuestStoreUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuestStoreUnavailableError";
  }
}

export class GuestStoreMergeContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GuestStoreMergeContractError";
  }
}

export type GuestMergeDump = {
  payload: MergeGuestRequest;
  deckPublicIds: string[];
};

type GuestDeckRow = {
  publicId: string;
  title: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
};

type GuestItemRow = {
  publicId: string;
  deckPublicId: string;
  frontText: string;
  backText: string;
  createdAt: string;
  updatedAt: string;
};

interface GuestCardServiceDb extends DBSchema {
  decks: {
    key: string;
    value: GuestDeckRow;
    indexes: {
      "by-created-at": string;
    };
  };
  items: {
    key: string;
    value: GuestItemRow;
    indexes: {
      "by-deck": string;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<GuestCardServiceDb>> | null = null;

async function getDb(): Promise<IDBPDatabase<GuestCardServiceDb>> {
  if (typeof indexedDB === "undefined") {
    throw new GuestStoreUnavailableError(
      "이 브라우저에서는 로그인 없이 카드덱을 사용할 수 없습니다.",
    );
  }

  if (!dbPromise) {
    dbPromise = openDB<GuestCardServiceDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("decks")) {
          const decks = db.createObjectStore("decks", { keyPath: "publicId" });
          decks.createIndex("by-created-at", "createdAt");
        }
        if (!db.objectStoreNames.contains("items")) {
          const items = db.createObjectStore("items", { keyPath: "publicId" });
          items.createIndex("by-deck", "deckPublicId");
        }
      },
    }).catch((error) => {
      dbPromise = null;
      const message =
        error instanceof Error
          ? `로컬 저장소를 열 수 없습니다: ${error.message}`
          : "로컬 저장소를 열 수 없습니다. 브라우저의 저장 공간이나 시크릿 모드 설정을 확인해 주세요.";
      throw new GuestStoreUnavailableError(message);
    });
  }

  return dbPromise;
}

function nowIso(): string {
  return new Date().toISOString();
}

function randomId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function toDeckDto(row: GuestDeckRow, itemCount: number): CardDeckDto {
  return {
    id: row.publicId,
    title: row.title,
    description: row.description,
    itemCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toItemDto(row: GuestItemRow): CardDeckItemDto {
  return {
    id: row.publicId,
    frontText: row.frontText,
    backText: row.backText,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listGuestDecks(): Promise<CardDeckDto[]> {
  const db = await getDb();
  const decks = await db.getAll("decks");
  const result: CardDeckDto[] = [];
  for (const deck of decks) {
    const itemCount = await db.countFromIndex("items", "by-deck", deck.publicId);
    result.push(toDeckDto(deck, itemCount));
  }
  result.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return result;
}

export async function getGuestDeckDetail(
  publicId: string,
): Promise<CardDeckDetailResponse | null> {
  const db = await getDb();
  const deck = await db.get("decks", publicId);
  if (!deck) {
    return null;
  }
  const items = await db.getAllFromIndex("items", "by-deck", publicId);
  const sortedItems = [...items].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : 1,
  );
  return {
    deck: toDeckDto(deck, sortedItems.length),
    items: sortedItems.map(toItemDto),
  };
}

export async function createGuestDeck(
  body: CreateCardDeckBody,
): Promise<CardDeckDto> {
  const db = await getDb();
  const publicId = randomId();
  const createdAt = nowIso();
  const row: GuestDeckRow = {
    publicId,
    title: body.title,
    description: body.description ?? null,
    createdAt,
    updatedAt: createdAt,
  };
  await db.put("decks", row);
  return toDeckDto(row, 0);
}

export async function updateGuestDeck(
  publicId: string,
  body: UpdateCardDeckBody,
): Promise<CardDeckDto> {
  const db = await getDb();
  const existing = await db.get("decks", publicId);
  if (!existing) {
    throw new Error("덱을 찾을 수 없습니다.");
  }
  const nextDescription =
    body.description === undefined
      ? existing.description
      : (body.description ?? null);
  const updated: GuestDeckRow = {
    ...existing,
    title: body.title ?? existing.title,
    description: nextDescription,
    updatedAt: nowIso(),
  };
  await db.put("decks", updated);
  const itemCount = await db.countFromIndex("items", "by-deck", publicId);
  return toDeckDto(updated, itemCount);
}

export async function deleteGuestDeck(publicId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["decks", "items"], "readwrite");
  const itemsStore = tx.objectStore("items");
  const decksStore = tx.objectStore("decks");
  const itemIds = await itemsStore.index("by-deck").getAllKeys(publicId);
  await Promise.all([
    ...itemIds.map((key) => itemsStore.delete(key)),
    decksStore.delete(publicId),
    tx.done,
  ]);
}

export async function addGuestCard(
  deckPublicId: string,
  body: CreateCardDeckItemBody,
): Promise<CardDeckItemDto> {
  const db = await getDb();
  const publicId = randomId();
  const createdAt = nowIso();
  const tx = db.transaction(["decks", "items"], "readwrite");
  const deck = await tx.objectStore("decks").get(deckPublicId);
  if (!deck) {
    tx.abort();
    throw new Error("덱을 찾을 수 없습니다.");
  }
  const row: GuestItemRow = {
    publicId,
    deckPublicId,
    frontText: body.frontText,
    backText: body.backText,
    createdAt,
    updatedAt: createdAt,
  };
  await Promise.all([
    tx.objectStore("items").put(row),
    tx.objectStore("decks").put({ ...deck, updatedAt: createdAt }),
    tx.done,
  ]);
  return toItemDto(row);
}

export async function updateGuestCard(
  itemId: string,
  body: UpdateCardDeckItemBody,
): Promise<CardDeckItemDto> {
  const db = await getDb();
  const tx = db.transaction(["decks", "items"], "readwrite");
  const existing = await tx.objectStore("items").get(itemId);
  if (!existing) {
    tx.abort();
    throw new Error("카드를 찾을 수 없습니다.");
  }
  const now = nowIso();
  const updated: GuestItemRow = {
    ...existing,
    frontText: body.frontText ?? existing.frontText,
    backText: body.backText ?? existing.backText,
    updatedAt: now,
  };
  const deck = await tx.objectStore("decks").get(existing.deckPublicId);
  const deckUpdate = deck
    ? tx.objectStore("decks").put({ ...deck, updatedAt: now })
    : Promise.resolve();
  await Promise.all([tx.objectStore("items").put(updated), deckUpdate, tx.done]);
  return toItemDto(updated);
}

export async function deleteGuestCard(itemId: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(["decks", "items"], "readwrite");
  const existing = await tx.objectStore("items").get(itemId);
  if (!existing) {
    tx.abort();
    return;
  }
  const now = nowIso();
  const deck = await tx.objectStore("decks").get(existing.deckPublicId);
  const deckUpdate = deck
    ? tx.objectStore("decks").put({ ...deck, updatedAt: now })
    : Promise.resolve();
  await Promise.all([tx.objectStore("items").delete(itemId), deckUpdate, tx.done]);
}

export async function countGuestCardDecks(): Promise<number> {
  const db = await getDb();
  return db.count("decks");
}

export async function dumpGuestCardDecksForMerge(): Promise<GuestMergeDump> {
  const db = await getDb();
  const decks = await db.getAll("decks");

  if (decks.length === 0) {
    throw new GuestStoreMergeContractError(
      "이관할 덱이 없습니다. 먼저 덱을 만들어 주세요.",
    );
  }

  if (decks.length > mergeGuestLimits.maxDecks) {
    throw new GuestStoreMergeContractError(
      `한 번에 ${mergeGuestLimits.maxDecks}개 이하 덱만 계정에 추가할 수 있습니다. 일부 덱을 정리한 뒤 다시 시도해 주세요.`,
    );
  }

  const deckPublicIds: string[] = [];
  const payloadDecks: MergeGuestRequest["decks"] = [];
  for (const deck of decks) {
    const items = await db.getAllFromIndex("items", "by-deck", deck.publicId);
    if (items.length > mergeGuestLimits.maxItemsPerDeck) {
      throw new GuestStoreMergeContractError(
        `"${deck.title}" 덱의 카드 수가 ${mergeGuestLimits.maxItemsPerDeck}장을 초과했습니다. 일부 카드를 정리한 뒤 다시 시도해 주세요.`,
      );
    }
    const sortedItems = [...items].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : 1,
    );
    deckPublicIds.push(deck.publicId);
    payloadDecks.push({
      title: deck.title,
      description: deck.description ?? null,
      items: sortedItems.map((item) => ({
        frontText: item.frontText,
        backText: item.backText,
      })),
    });
  }

  return {
    payload: { decks: payloadDecks },
    deckPublicIds,
  };
}

export async function clearGuestCardDecksByPublicIds(
  publicIds: string[],
): Promise<void> {
  if (publicIds.length === 0) {
    return;
  }
  const db = await getDb();
  const tx = db.transaction(["decks", "items"], "readwrite");
  const itemsStore = tx.objectStore("items");
  const decksStore = tx.objectStore("decks");
  // 모든 item key 수집을 동시 start 로 전개 — 트랜잭션 내 microtask 휴면 방지.
  const itemKeyResults = await Promise.all(
    publicIds.map((id) => itemsStore.index("by-deck").getAllKeys(id)),
  );
  const ops: Promise<unknown>[] = [];
  for (const [i, keys] of itemKeyResults.entries()) {
    for (const key of keys) {
      ops.push(itemsStore.delete(key));
    }
    const deckId = publicIds[i];
    if (deckId !== undefined) {
      ops.push(decksStore.delete(deckId));
    }
  }
  await Promise.all([...ops, tx.done]);
}
