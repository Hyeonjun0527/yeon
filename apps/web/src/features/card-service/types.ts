import type {
  CardDeckDto,
  CardDeckItemDto,
} from "@yeon/api-contract/card-decks";

export type CardServiceHomeViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "empty" }
  | { kind: "ready"; decks: CardDeckDto[] };

export type DeckDetailViewState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | {
      kind: "ready";
      deck: CardDeckDto;
      items: CardDeckItemDto[];
      isEmpty: boolean;
    };
