import type { CardDeckDto } from "@yeon/api-contract/card-decks";

import { DeckCard } from "./deck-card";

interface DeckListProps {
  decks: CardDeckDto[];
}

export function DeckList({ decks }: DeckListProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {decks.map((deck) => (
        <DeckCard key={deck.id} deck={deck} />
      ))}
    </div>
  );
}
