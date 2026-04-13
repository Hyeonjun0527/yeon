"use client";

import { AlertTriangle, X } from "lucide-react";
import type { MemberWithStatus } from "../_hooks/use-space-members";
import { useHomeInsightBannerDismissals } from "../_hooks";

interface InsightBannerProps {
  members: MemberWithStatus[];
  onHighlightWarning: () => void;
  onHighlightNone: () => void;
}

function InsightBannerItem(props: {
  title: string;
  description: string;
  onClick: () => void;
  onDismiss: () => void;
  dismissLabel: string;
  dismissing: boolean;
  separated: boolean;
}) {
  return (
    <div
      className={`flex items-stretch gap-1.5 px-2 py-1.5 sm:px-3 ${
        props.separated ? "border-t border-[rgba(245,158,11,0.18)]" : ""
      }`}
    >
      <button
        className="flex min-w-0 flex-1 items-start gap-2.5 rounded-xl px-2 py-2 text-left font-[inherit] transition-colors hover:bg-[rgba(245,158,11,0.08)]"
        onClick={props.onClick}
      >
        <span className="pt-0.5 text-amber">
          <AlertTriangle size={18} strokeWidth={2.2} />
        </span>
        <span className="min-w-0 text-xs leading-relaxed text-text-secondary">
          <span className="font-semibold text-amber">{props.title}</span>{" "}
          {props.description}
        </span>
      </button>
      <button
        type="button"
        aria-label={props.dismissLabel}
        className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl text-text-dim transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-text disabled:opacity-40"
        disabled={props.dismissing}
        onClick={props.onDismiss}
      >
        <X size={16} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export function InsightBanner({
  members,
  onHighlightWarning,
  onHighlightNone,
}: InsightBannerProps) {
  const warningCount = members.filter((m) => m.indicator === "warning").length;
  const noneCount = members.filter((m) => m.indicator === "none").length;
  const dismissals = useHomeInsightBannerDismissals();
  const showNoneBanner =
    noneCount > 0 &&
    !dismissals.isBannerHidden("counseling_none") &&
    !dismissals.isPending;
  const showWarningBanner =
    warningCount > 0 &&
    !dismissals.isBannerHidden("counseling_warning") &&
    !dismissals.isPending;

  if (dismissals.isPending || (!showNoneBanner && !showWarningBanner)) {
    return null;
  }

  return (
    <div className="border-b border-[rgba(245,158,11,0.25)] bg-[rgba(245,158,11,0.08)]">
      {showNoneBanner ? (
        <InsightBannerItem
          title={`상담 이력 없음 ${noneCount}명`}
          description="수강생이 있습니다. 클릭하면 목록을 확인할 수 있습니다."
          onClick={onHighlightNone}
          onDismiss={() => dismissals.dismissBanner("counseling_none")}
          dismissLabel="상담 이력 없음 배너 닫기"
          dismissing={dismissals.isBannerDismissing("counseling_none")}
          separated={false}
        />
      ) : null}
      {showWarningBanner ? (
        <InsightBannerItem
          title={`상담 간격 주의 ${warningCount}명`}
          description="수강생이 있습니다. 클릭하면 목록을 확인할 수 있습니다."
          onClick={onHighlightWarning}
          onDismiss={() => dismissals.dismissBanner("counseling_warning")}
          dismissLabel="상담 간격 주의 배너 닫기"
          dismissing={dismissals.isBannerDismissing("counseling_warning")}
          separated={showNoneBanner}
        />
      ) : null}
    </div>
  );
}
