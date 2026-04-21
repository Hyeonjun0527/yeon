import { redirect } from "next/navigation";

import { DeckDetailScreen } from "@/features/card-service";
import { getCurrentAuthUser } from "@/server/auth/session";

interface DeckDetailPageProps {
  params: Promise<{ deckId: string }>;
}

export default async function DeckDetailPage({ params }: DeckDetailPageProps) {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/?next=%2Fcard-service");
  }
  const { deckId } = await params;
  return <DeckDetailScreen deckId={deckId} />;
}
