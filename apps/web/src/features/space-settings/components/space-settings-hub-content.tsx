"use client";

import { ChevronRight } from "lucide-react";

interface SpaceSettingsHubContentProps {
  spaceName?: string;
  onOpenPeriod: () => void;
  onOpenConfiguration: () => void;
  onClose: () => void;
}

export function SpaceSettingsHubContent({
  spaceName,
  onOpenPeriod,
  onOpenConfiguration,
  onClose,
}: SpaceSettingsHubContentProps) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <h2 className="text-base font-semibold text-text">스페이스 설정</h2>
          <p className="mt-0.5 text-xs text-text-dim">
            {spaceName ? `${spaceName} · ` : ""}열 항목을 선택하세요
          </p>
        </div>
        <button
          className="flex h-7 w-7 items-center justify-center rounded-md border-none bg-transparent text-text-dim transition-colors hover:bg-surface-3 hover:text-text"
          onClick={onClose}
          aria-label="닫기"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-2 px-4 py-4">
        <HubActionButton label="진행기간" onClick={onOpenPeriod} />
        <HubActionButton
          label="수강생 정보 구성"
          onClick={onOpenConfiguration}
        />
      </div>
    </div>
  );
}

function HubActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3 text-left text-sm font-medium text-text transition-colors hover:border-border-light hover:bg-surface-3"
      onClick={onClick}
    >
      <span>{label}</span>
      <ChevronRight size={16} className="text-text-dim" />
    </button>
  );
}
