"use client";

import { useMemo } from "react";

type CounterProps = {
  end: number;
  suffix?: string;
  duration?: number;
  className?: string;
};

export function Counter({ end, suffix = "", className = "" }: CounterProps) {
  const displayValue = useMemo(() => end.toLocaleString(), [end]);

  return (
    <span
      className={`text-[clamp(36px,11vw,68px)] font-black tracking-[-0.04em] text-[var(--accent)] tabular-nums leading-none md:text-[clamp(44px,6vw,68px)] ${className}`.trim()}
    >
      {displayValue}
      {suffix}
    </span>
  );
}
