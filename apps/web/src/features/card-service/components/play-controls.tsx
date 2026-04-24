"use client";

interface PlayControlsProps {
  currentIndex: number;
  totalCount: number;
  onPrev: () => void;
  onNext: () => void;
}

export function PlayControls({
  currentIndex,
  totalCount,
  onPrev,
  onNext,
}: PlayControlsProps) {
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < totalCount - 1;

  return (
    <div className="flex w-full max-w-[720px] items-center justify-between">
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="rounded-xl border border-[#e5e5e5] px-5 py-2 text-[14px] text-[#111] transition-colors hover:border-[#111] disabled:opacity-40"
      >
        ← 이전
      </button>
      <span className="text-[14px] font-semibold text-[#111]">
        {currentIndex + 1} / {totalCount}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="rounded-xl border border-[#e5e5e5] px-5 py-2 text-[14px] text-[#111] transition-colors hover:border-[#111] disabled:opacity-40"
      >
        다음 →
      </button>
    </div>
  );
}
