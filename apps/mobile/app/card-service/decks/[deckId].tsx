import { useLocalSearchParams } from "expo-router";

import { CardDeckDetailScreen } from "../../../src/features/card-service/card-deck-detail-screen";

export default function CardDeckDetailRoute() {
  const { deckId } = useLocalSearchParams<{ deckId: string }>();

  return <CardDeckDetailScreen deckId={deckId} />;
}
