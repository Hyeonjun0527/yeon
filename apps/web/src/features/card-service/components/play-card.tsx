"use client";

import type { KeyboardEvent } from "react";

interface PlayCardProps {
  frontText: string;
  backText: string;
  isFlipped: boolean;
  onFlip: () => void;
}

const CARD_STYLE = {
  perspective: "1200px",
} as const;

const INNER_BASE_STYLE = {
  transformStyle: "preserve-3d" as const,
  transition: "transform 350ms ease",
};

const FACE_STYLE = {
  backfaceVisibility: "hidden" as const,
};

export function PlayCard({
  frontText,
  backText,
  isFlipped,
  onFlip,
}: PlayCardProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      onFlip();
    }
  };

  const innerStyle = {
    ...INNER_BASE_STYLE,
    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
  };

  return (
    <button
      type="button"
      onClick={onFlip}
      onKeyDown={handleKeyDown}
      aria-label={
        isFlipped
          ? "뒷면: 클릭하거나 Space를 눌러 앞면으로"
          : "앞면: 클릭하거나 Space를 눌러 뒷면으로"
      }
      className="relative h-[380px] w-full max-w-[720px] cursor-pointer rounded-2xl border-0 bg-transparent p-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-[#111]"
      style={CARD_STYLE}
    >
      <div className="relative h-full w-full" style={innerStyle}>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl border border-[#e5e5e5] bg-white p-12 text-center"
          style={FACE_STYLE}
        >
          <p className="whitespace-pre-wrap text-[22px] leading-relaxed text-[#111]">
            {frontText}
          </p>
        </div>
        <div
          className="absolute inset-0 flex items-center justify-center rounded-2xl border border-[#111] bg-[#111] p-12 text-center"
          style={{
            ...FACE_STYLE,
            transform: "rotateY(180deg)",
          }}
        >
          <p className="whitespace-pre-wrap text-[22px] leading-relaxed text-white">
            {backText}
          </p>
        </div>
      </div>
    </button>
  );
}
