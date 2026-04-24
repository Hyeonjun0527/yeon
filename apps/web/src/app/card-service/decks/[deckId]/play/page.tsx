import { DeckPlayScreen } from "@/features/card-service";

interface DeckPlayPageProps {
  params: Promise<{ deckId: string }>;
}

export default async function DeckPlayPage({ params }: DeckPlayPageProps) {
  const { deckId } = await params;
  return <DeckPlayScreen deckId={deckId} />;
}
