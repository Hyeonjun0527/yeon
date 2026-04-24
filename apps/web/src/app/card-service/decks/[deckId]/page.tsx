import { DeckDetailScreen } from "@/features/card-service";

interface DeckDetailPageProps {
  params: Promise<{ deckId: string }>;
}

export default async function DeckDetailPage({ params }: DeckDetailPageProps) {
  const { deckId } = await params;
  return <DeckDetailScreen deckId={deckId} />;
}
