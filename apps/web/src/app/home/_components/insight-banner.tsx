"use client";

import type { MemberWithStatus } from "../_hooks/use-space-members";

interface InsightBannerProps {
  members: MemberWithStatus[];
  onHighlightWarning: () => void;
}

export function InsightBanner({
  members,
  onHighlightWarning,
}: InsightBannerProps) {
  const warningCount = members.filter((m) => m.indicator === "warning").length;
  const noneCount = members.filter((m) => m.indicator === "none").length;
  const total = warningCount + noneCount;

  if (total === 0) return null;

  const parts: string[] = [];
  if (warningCount > 0) parts.push(`상담 간격 주의 ${warningCount}명`);
  if (noneCount > 0) parts.push(`상담 이력 없음 ${noneCount}명`);

  return (
    <button
      className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-[rgba(245,158,11,0.08)] border-b border-[rgba(245,158,11,0.25)] text-left cursor-pointer font-[inherit] transition-colors hover:bg-[rgba(245,158,11,0.13)]"
      onClick={onHighlightWarning}
    >
      <span className="text-amber text-base flex-shrink-0">⚠</span>
      <span className="text-xs text-text-secondary leading-relaxed">
        <span className="font-semibold text-amber">{parts.join(", ")}</span>{" "}
        수강생이 있습니다. 클릭하면 목록을 확인할 수 있습니다.
      </span>
    </button>
  );
}
