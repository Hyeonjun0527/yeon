"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClickOutside } from "@/app/home/_hooks";
import { useState } from "react";
import { useExport } from "../_lib/export-context";
import { TutorialTriggerButton } from "@/components/tutorial";

const SECTION_LABELS: Record<string, string> = {
  records: "상담 기록",
  students: "수강생 관리",
};

type TopNavProps = {
  section: string;
};

export function TopNav({ section }: TopNavProps) {
  const { trigger } = useExport();
  const pathname = usePathname();
  const [exporting, setExporting] = useState(false);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [studentBoardHelpOpen, setStudentBoardHelpOpen] = useState(false);
  const sectionMenuRef = useClickOutside<HTMLDivElement>(
    () => setSectionMenuOpen(false),
    sectionMenuOpen,
  );

  async function handleShare() {
    setExporting(true);
    try {
      await trigger();
    } finally {
      setExporting(false);
    }
  }

  const tutorialKey =
    pathname === "/home/student-management/check-board"
      ? "check-board"
      : section === "students"
        ? "student"
        : "home";
  const canShowTutorialTrigger =
    pathname === "/home" ||
    pathname === "/home/student-management" ||
    pathname === "/home/student-management/check-board";

  return (
    <div className="sticky top-0 z-[100] bg-[rgba(9,9,11,0.85)] backdrop-blur-[16px] border-b border-border flex items-center px-4 h-12 gap-3">
      <div ref={sectionMenuRef} className="relative">
        <button
          className="flex items-center gap-2 rounded-[10px] bg-none px-[10px] py-[6px] text-text transition-all duration-150 hover:bg-surface-3"
          title="섹션"
          type="button"
          onClick={() => setSectionMenuOpen((prev) => !prev)}
        >
          <span className="font-[Outfit,sans-serif] font-bold text-base tracking-[-0.5px] bg-gradient-to-br from-accent to-cyan bg-clip-text [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]">
            YEON
          </span>
          <span className="text-sm text-text-dim">
            {SECTION_LABELS[section] ?? section}
          </span>
          <ChevronDownIcon size={14} />
        </button>

        {sectionMenuOpen ? (
          <div className="absolute left-0 top-[calc(100%+8px)] z-50 min-w-[170px] rounded-xl border border-border-light bg-surface-3 p-1 shadow-[0_12px_32px_rgba(0,0,0,0.42)]">
            <Link
              href="/home"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                section === "records"
                  ? "bg-accent-dim text-accent"
                  : "text-text-secondary hover:bg-surface-4 hover:text-text"
              }`}
              onClick={() => setSectionMenuOpen(false)}
            >
              <RecordsIcon size={16} />
              상담 기록
            </Link>
            <Link
              href="/home/student-management"
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                section === "students"
                  ? "bg-accent-dim text-accent"
                  : "text-text-secondary hover:bg-surface-4 hover:text-text"
              }`}
              onClick={() => setSectionMenuOpen(false)}
            >
              <StudentsIcon size={16} />
              수강생 관리
            </Link>
          </div>
        ) : null}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {canShowTutorialTrigger ? (
          <TutorialTriggerButton
            tutorialKey={tutorialKey}
            label={section === "students" ? "튜토리얼" : "튜토리얼 보기"}
            className="h-9 whitespace-nowrap px-3 rounded-[10px] text-[13px]"
          />
        ) : null}
        {section === "students" ? (
          <button
            type="button"
            className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-border bg-surface-2 px-3 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text"
            onClick={() => setStudentBoardHelpOpen(true)}
          >
            <HelpIcon size={14} />
            도움말
          </button>
        ) : (
          <button
            className="flex items-center justify-center w-9 h-9 rounded-full bg-none border-none text-text-dim cursor-pointer transition-all duration-150 hover:bg-surface-3 hover:text-text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
            title="DOCX로 내보내기"
            onClick={handleShare}
            disabled={exporting}
          >
            {exporting ? <SpinnerIcon size={18} /> : <ShareIcon size={18} />}
          </button>
        )}
      </div>

      {studentBoardHelpOpen ? (
        <div className="fixed inset-0 z-[180] flex items-start justify-center bg-[rgba(0,0,0,0.56)] px-4 py-16 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent/80">
                  attendance board guide
                </div>
                <h2 className="mt-1 text-lg font-semibold text-text">
                  출석보드 도움말
                </h2>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-text-secondary transition-colors hover:border-border-light hover:text-text"
                onClick={() => setStudentBoardHelpOpen(false)}
                aria-label="도움말 닫기"
              >
                <CloseIcon size={16} />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5 text-sm text-text-secondary">
              <p>
                출석보드는 스페이스별로 학생들의 출석 상태, 과제 상태, 셀프체크
                세션 운영 여부를 한곳에서 확인하고 수정하는 화면입니다. QR
                체크인과 위치 기반 인증을 통해 출석 체크와 과제 제출을 함께
                지원합니다.
              </p>

              <div className="rounded-2xl border border-border bg-surface-2 px-4 py-4">
                <div className="text-sm font-semibold text-text">
                  여기서 할 수 있는 일
                </div>
                <ul className="mt-3 space-y-2 text-sm text-text-secondary">
                  <li>• 학생별 출석/과제 상태를 빠르게 확인하고 수정</li>
                  <li>
                    • QR 체크인과 위치 기반 인증으로 출석 체크와 과제 제출 운영
                  </li>
                  <li>• 셀프체크 준비 여부와 완료 현황을 한눈에 파악</li>
                </ul>
              </div>

              <div className="rounded-2xl border border-border bg-surface-2 px-4 py-4">
                <div className="text-sm font-semibold text-text">
                  추천 사용 흐름
                </div>
                <p className="mt-2">
                  먼저 공개 체크인 세션을 열고, 이후 학생별 출석과 과제 상태를
                  검토하면서 필요한 링크나 상태값을 업데이트하세요.
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-border px-5 py-4">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text"
                onClick={() => setStudentBoardHelpOpen(false)}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
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

function HelpIcon({ size = 14 }: { size?: number }) {
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
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.82 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function CloseIcon({ size = 16 }: { size?: number }) {
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
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

function RecordsIcon({ size = 16 }: { size?: number }) {
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
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}
