"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useClickOutside } from "@/app/home/_hooks";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TutorialTriggerButton } from "@/components/tutorial";
import { useTutorialPolicy } from "./home-sidebar-layout-context";
import { useAppRoute } from "@/lib/app-route-context";

const SECTION_LABELS: Record<string, string> = {
  records: "상담 기록",
  students: "수강생 관리",
};

type TopNavProps = {
  section: string;
};

type HelpContent = {
  badge: string;
  title: string;
  description: string;
  capabilities: string[];
  workflow: string;
};

const HELP_CONTENTS: Record<
  "home" | "student-management" | "check-board",
  HelpContent
> = {
  home: {
    badge: "counseling workspace guide",
    title: "상담관리 도움말",
    description:
      "상담관리 화면은 녹음 업로드부터 전사, 구조화 요약, 수강생 연결, 원문 기반 AI 대화까지 상담 기록 흐름을 한곳에서 관리하는 워크스페이스예요.",
    capabilities: [
      "녹음 파일을 업로드하거나 바로 녹음을 시작해 상담 기록 생성",
      "AI 요약·핵심 내용·후속 조치를 한 화면에서 확인",
      "상담 기록을 수강생과 연결해 학생별 히스토리 누적",
    ],
    workflow:
      "먼저 녹음이나 파일 업로드로 상담 기록을 만든 뒤, 전사와 AI 요약을 검토하고 필요한 수강생에 연결하세요. 이후 우측 AI 기능으로 원문 기반 질의를 이어가면 좋아요.",
  },
  "student-management": {
    badge: "student management guide",
    title: "학생관리 도움말",
    description:
      "학생관리 화면은 스페이스별 수강생을 등록하고, 상태·위험도·상세 기록을 빠르게 살펴보는 관리 화면이에요. 카드 보기와 촘촘히 보기로 상황에 맞게 탐색할 수 있어요.",
    capabilities: [
      "수강생 추가, 검색, 상태·위험도 필터링으로 빠른 목록 관리",
      "카드 보기와 촘촘히 보기 전환으로 상황별 탐색 밀도 조절",
      "수강생 카드를 열어 개인 현황·상담 이력·메모 확인",
    ],
    workflow:
      "먼저 스페이스를 선택한 뒤 수강생을 등록하거나 가져오고, 검색/필터로 대상을 좁힌 뒤 필요한 학생 카드를 열어 상세 기록을 확인하세요.",
  },
  "check-board": {
    badge: "attendance board guide",
    title: "출석보드 도움말",
    description:
      "출석보드는 스페이스별 학생들의 출석 상태, 과제 상태, 셀프체크 세션 운영 여부를 한곳에서 확인하고 수정하는 화면입니다. QR 체크인과 위치 기반 인증을 통해 출석 체크와 과제 제출을 함께 지원합니다.",
    capabilities: [
      "학생별 출석/과제 상태를 빠르게 확인하고 수정",
      "QR 체크인과 위치 기반 인증으로 출석 체크와 과제 제출 운영",
      "셀프체크 준비 여부와 완료 현황을 한눈에 파악",
    ],
    workflow:
      "먼저 공개 체크인 세션을 열고, 이후 학생별 출석과 과제 상태를 검토하면서 필요한 링크나 상태값을 업데이트하세요.",
  },
};

function getHelpContentKey(pathname: string): keyof typeof HELP_CONTENTS {
  if (pathname === "/home/student-management/check-board") {
    return "check-board";
  }

  if (pathname.startsWith("/home/student-management")) {
    return "student-management";
  }

  return "home";
}

export function TopNav({ section }: TopNavProps) {
  const pathname = usePathname();
  const { normalizeAppPathname, resolveAppHref } = useAppRoute();
  const normalizedPathname = normalizeAppPathname(pathname);
  const [sectionMenuOpen, setSectionMenuOpen] = useState(false);
  const [studentBoardHelpOpen, setStudentBoardHelpOpen] = useState(false);
  const helpContentKey = getHelpContentKey(normalizedPathname);
  const helpContent = HELP_CONTENTS[helpContentKey];
  const sectionMenuRef = useClickOutside<HTMLDivElement>(
    () => setSectionMenuOpen(false),
    sectionMenuOpen,
  );

  const tutorialKey =
    normalizedPathname === "/home/student-management/check-board"
      ? "check-board"
      : section === "students"
        ? "student"
        : "home";
  const tutorialPolicy = useTutorialPolicy(tutorialKey);
  const canResolveTutorialRoute =
    normalizedPathname === "/home" ||
    normalizedPathname === "/home/student-management" ||
    normalizedPathname === "/home/student-management/check-board";
  const canShowTutorialTrigger =
    canResolveTutorialRoute && tutorialPolicy.showTrigger;

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
              href={resolveAppHref("/home")}
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
              href={resolveAppHref("/home/student-management")}
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
            label="튜토리얼"
            className="h-9 whitespace-nowrap px-3 rounded-[10px] text-[13px]"
          />
        ) : null}
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-border bg-surface-2 px-3 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text"
          onClick={() => setStudentBoardHelpOpen(true)}
        >
          <HelpIcon size={14} />
          도움말
        </button>
      </div>

      <StudentBoardHelpModal
        open={studentBoardHelpOpen}
        onClose={() => setStudentBoardHelpOpen(false)}
        content={helpContent}
      />
    </div>
  );
}

function StudentBoardHelpModal({
  open,
  onClose,
  content,
}: {
  open: boolean;
  onClose: () => void;
  content: HelpContent;
}) {
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  const portalRoot = document.querySelector(".app-theme") ?? document.body;

  return createPortal(
    <div
      className="fixed inset-0 z-[180] flex items-center justify-center bg-[rgba(0,0,0,0.56)] px-4 py-8"
      onClick={onClose}
    >
      <div
        className="max-h-[calc(100vh-64px)] w-full max-w-lg overflow-y-auto rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-accent/80">
              {content.badge}
            </div>
            <h2 className="mt-1 text-lg font-semibold text-text">
              {content.title}
            </h2>
          </div>
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-text-secondary transition-colors hover:border-border-light hover:text-text"
            onClick={onClose}
            aria-label="도움말 닫기"
          >
            <CloseIcon size={16} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 text-sm text-text-secondary">
          <p>{content.description}</p>

          <div className="rounded-2xl border border-border bg-surface-2 px-4 py-4">
            <div className="text-sm font-semibold text-text">
              여기서 할 수 있는 일
            </div>
            <ul className="mt-3 space-y-2 text-sm text-text-secondary">
              {content.capabilities.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-border bg-surface-2 px-4 py-4">
            <div className="text-sm font-semibold text-text">
              추천 사용 흐름
            </div>
            <p className="mt-2">{content.workflow}</p>
          </div>
        </div>

        <div className="flex justify-end border-t border-border px-5 py-4">
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>,
    portalRoot,
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
