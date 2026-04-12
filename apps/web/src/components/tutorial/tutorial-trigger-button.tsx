"use client";

import { BookOpen } from "lucide-react";

import { useTutorial } from "./use-tutorial";

export function TutorialTriggerButton({
  tutorialKey,
  label = "튜토리얼",
  className = "",
}: {
  tutorialKey: "home" | "student" | "check-board";
  label?: string;
  className?: string;
}) {
  const { restart } = useTutorial(tutorialKey);

  return (
    <button
      type="button"
      onClick={restart}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-surface-2 px-3 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text ${className}`.trim()}
    >
      <BookOpen size={14} />
      {label}
    </button>
  );
}
