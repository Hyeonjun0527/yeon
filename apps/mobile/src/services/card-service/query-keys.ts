export const cardServiceQueryKeys = {
  all: ["card-service"] as const,
  deck: (deckId: string, sessionToken?: string | null) =>
    ["card-service", "deck", deckId, sessionToken] as const,
  decks: (sessionToken?: string | null) =>
    ["card-service", "decks", sessionToken] as const,
};
