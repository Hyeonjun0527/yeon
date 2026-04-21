import { redirect } from "next/navigation";

import { DeckPlayScreen } from "@/features/card-service";
import { getCurrentAuthUser } from "@/server/auth/session";

interface DeckPlayPageProps {
  params: Promise<{ deckId: string }>;
}

export default async function DeckPlayPage({ params }: DeckPlayPageProps) {
  const user = await getCurrentAuthUser();
  if (!user) {
    redirect("/?next=%2Fcard-service");
  }
  const { deckId } = await params;
  return <DeckPlayScreen deckId={deckId} />;
}
