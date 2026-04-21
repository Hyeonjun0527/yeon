import { bigint, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";

import { cardDecks } from "./card-decks";

export const cardDeckItems = pgTable(
  "card_deck_items",
  {
    id: bigint("id", { mode: "bigint" })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    publicId: text("public_id").notNull().unique(),
    deckId: bigint("deck_id", { mode: "bigint" })
      .notNull()
      .references(() => cardDecks.id, { onDelete: "cascade" }),
    frontText: text("front_text").notNull(),
    backText: text("back_text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("card_deck_items_deck_created_at_idx").on(
      table.deckId,
      table.createdAt,
    ),
  ],
);
