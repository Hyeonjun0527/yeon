import type { CardDeckDto } from "@yeon/api-contract/card-decks";

export type CardServiceHomeViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "ready"; decks: CardDeckDto[] };
