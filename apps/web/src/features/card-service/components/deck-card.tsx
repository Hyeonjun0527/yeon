import Link from "next/link";
import type { CardDeckDto } from "@yeon/api-contract/card-decks";

interface DeckCardProps {
  deck: CardDeckDto;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function DeckCard({ deck }: DeckCardProps) {
  return (
    <Link
      href={`/card-service/decks/${deck.id}`}
      className="block rounded-xl border border-[#e5e5e5] p-5 text-[#111] no-underline transition-colors hover:border-[#111]"
    >
      <h3 className="text-[16px] font-semibold">{deck.title}</h3>
      {deck.description ? (
        <p className="mt-2 line-clamp-2 text-[13px] text-[#666]">
          {deck.description}
        </p>
      ) : null}
      <p className="mt-4 text-[12px] text-[#888]">
        카드 {deck.itemCount}장 · 업데이트 {formatDate(deck.updatedAt)}
      </p>
    </Link>
  );
}
