"use client";

import Link from "next/link";
import { useState } from "react";
import { useExport } from "../_lib/export-context";

const SECTION_LABELS: Record<string, string> = {
  records: "상담 기록",
  students: "수강생 관리",
};

type TopNavProps = {
  section: string;
};

export function TopNav({ section }: TopNavProps) {
  const { trigger } = useExport();
  const [exporting, setExporting] = useState(false);

  async function handleShare() {
    setExporting(true);
    try {
      await trigger();
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="sticky top-0 z-[100] bg-[rgba(9,9,11,0.85)] backdrop-blur-[16px] border-b border-border flex items-center px-4 h-12 gap-3">
      <button
        className="flex items-center gap-2 bg-none border-none cursor-pointer px-[10px] py-[6px] rounded-[10px] text-text font-[inherit] transition-all duration-150 hover:bg-surface-3"
        title="섹션"
      >
        <span className="font-[Outfit,sans-serif] font-bold text-base tracking-[-0.5px] bg-gradient-to-br from-accent to-cyan bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]">
          YEON
        </span>
        <span className="text-sm text-text-dim">
          {SECTION_LABELS[section] ?? section}
        </span>
        <ChevronDownIcon size={14} />
      </button>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {section === "records" && (
          <Link
            href="/home/student-management"
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[10px] border border-border bg-surface-3 text-[13px] font-medium text-text-secondary transition-all duration-150 hover:bg-surface-4 hover:text-text"
          >
            <StudentsIcon size={16} />
            학생관리
          </Link>
        )}
        <button
          className="flex items-center justify-center w-9 h-9 rounded-full bg-none border-none text-text-dim cursor-pointer transition-all duration-150 hover:bg-surface-3 hover:text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
          title="DOCX로 내보내기"
          onClick={handleShare}
          disabled={exporting}
        >
          {exporting ? <SpinnerIcon size={18} /> : <ShareIcon size={18} />}
        </button>
      </div>
    </div>
  );
}

function ChevronDownIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ShareIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" x2="12" y1="2" y2="15" />
    </svg>
  );
}

function SpinnerIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="animate-spin"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function StudentsIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
