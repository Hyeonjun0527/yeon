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

type HelpPage = {
  id: string;
  label: string;
  title: string;
  description: string;
  bullets: string[];
  noteTitle: string;
  note: string;
};

type HelpContent = {
  badge: string;
  title: string;
  summary: string;
  pages: HelpPage[];
};

const HELP_CONTENTS: Record<
  "home" | "student-management" | "check-board",
  HelpContent
> = {
  home: {
    badge: "상담 기록 워크스페이스",
    title: "상담관리 도움말",
    summary:
      "상담관리 화면은 녹음 업로드부터 전사, AI 요약, 수강생 연결, 원문 기반 AI 질의까지 상담 기록 흐름을 한곳에서 이어 보는 워크스페이스입니다.",
    pages: [
      {
        id: "records-overview",
        label: "기본 흐름",
        title: "상담 기록을 만들고 검토합니다",
        description:
          "녹음 파일 업로드나 바로 녹음으로 상담 기록을 만들고, 전사와 AI 요약을 검토한 뒤 필요한 학생에게 연결하는 흐름입니다.",
        bullets: [
          "녹음 업로드 또는 바로 녹음으로 상담 기록을 생성할 수 있습니다.",
          "전사 원문, 구조화 요약, 후속 조치를 한 화면에서 확인할 수 있습니다.",
          "상담 기록을 학생과 연결하면 학생별 히스토리로 누적됩니다.",
        ],
        noteTitle: "추천 사용 흐름",
        note:
          "먼저 상담 기록을 만들고 전사와 요약을 검토한 뒤, 필요한 학생에 연결하세요. 이후 우측 AI 기능으로 원문 기반 질의를 이어가면 기록 검토가 빨라집니다.",
      },
    ],
  },
  "student-management": {
    badge: "학생관리 운영 안내",
    title: "학생관리 도움말",
    summary:
      "학생관리는 스페이스를 기준으로 학생 목록, Google Sheets 연동, 학생별 리포트, 출석·과제 운영을 이어 보는 운영 허브입니다.",
    pages: [
      {
        id: "students-overview",
        label: "학생 목록",
        title: "스페이스 안에서 학생 목록을 정리합니다",
        description:
          "학생관리는 스페이스를 기준으로 학생을 모아 보는 운영 화면입니다. 학생 추가, 검색, 상태와 위험도 확인, 카드/촘촘히 보기 전환을 이곳에서 시작합니다.",
        bullets: [
          "스페이스를 먼저 선택해야 학생 목록과 상세 화면이 열립니다.",
          "학생 추가 후 검색어, 상태, 위험도 필터로 필요한 학생만 빠르게 좁힐 수 있습니다.",
          "학생 카드를 열면 상담 기록, 메모, 출석·과제, 리포트, 커스텀 탭까지 이어집니다.",
        ],
        noteTitle: "처음 시작할 때",
        note:
          "반이나 과정별로 스페이스를 나눈 뒤 각 스페이스 안에서 학생을 등록하면 목록, 출석·과제 기록, 리포트 흐름이 섞이지 않고 정리됩니다.",
      },
      {
        id: "google-sheets",
        label: "Google Sheets 연동",
        title: "학생 목록을 시트와 주고받을 수 있습니다",
        description:
          "학생 목록 상단의 Google Sheets 연동 패널은 단순 로그인 버튼이 아니라, 현재 스페이스를 특정 시트와 연결해 웹과 시트를 오가는 작업 공간입니다.",
        bullets: [
          "먼저 Google 계정을 연결하고, 새로 만든 시트 URL을 붙여 현재 스페이스와 연결합니다.",
          "웹에서 수정한 학생 정보는 '시트에 반영하기'로 밀어낼 수 있습니다.",
          "시트에서 바꾼 내용은 '시트에서 가져오기'로 다시 불러올 수 있습니다.",
          "CSV와 엑셀 다운로드도 같은 영역에서 바로 내보낼 수 있습니다.",
        ],
        noteTitle: "언제 쓰면 좋나요",
        note:
          "원장이나 팀원이 학생 명단을 시트로 함께 관리하거나, 외부에서 받은 목록을 웹과 맞춰야 할 때 가장 유용합니다.",
      },
      {
        id: "student-report",
        label: "리포트",
        title: "학생 상세에서 상담 리포트를 뽑습니다",
        description:
          "학생 카드를 열어 '리포트' 탭으로 가면 상담 기록을 묶어 학생별 리포트를 만들 수 있습니다. 목록 화면이 아니라 학생 상세 안에서 내려받는 흐름입니다.",
        bullets: [
          "최근 상담 3건, 5건, 전체 상담 기록 중 포함 범위를 고를 수 있습니다.",
          "상담 요약과 핵심 포인트를 학생 기준으로 다시 묶어 검토할 수 있습니다.",
          "Word 다운로드로 보호자 공유용 또는 내부 운영용 문서를 바로 만들 수 있습니다.",
        ],
        noteTitle: "리포트가 잘 맞으려면",
        note:
          "해당 학생에 상담 기록이 연결되어 있어야 합니다. 먼저 상담 기록에서 학생을 연결하거나 학생 상세의 상담 이력을 확인한 뒤 리포트를 내려받으세요.",
      },
      {
        id: "check-board",
        label: "출석·과제 보드",
        title: "출석과 과제 운영은 보드에서 빠르게 처리합니다",
        description:
          "학생 목록 상단의 '출석·과제 보드' 버튼은 학생별 출석 상태와 과제 제출 상태를 한 번에 조정하는 운영 화면으로 이동합니다.",
        bullets: [
          "학생별 출석 상태, 과제 상태, 과제 링크를 한 화면에서 수정할 수 있습니다.",
          "공개 체크인 세션을 열고 QR 또는 위치 기반 방식으로 셀프 체크를 운영할 수 있습니다.",
          "보드에서 남긴 기록은 학생 상세의 출석·과제 이력과 잔디 요약으로 이어집니다.",
        ],
        noteTitle: "운영 순서",
        note:
          "먼저 학생 목록에서 스페이스를 맞춘 뒤 보드로 이동하세요. 공개 체크인 세션을 열고, 수업 후에는 학생별 상태를 검토하면서 필요한 링크와 누락값을 정리하면 됩니다.",
      },
    ],
  },
  "check-board": {
    badge: "출석·과제 운영 안내",
    title: "출석보드 도움말",
    summary:
      "출석보드는 공개 체크인 세션 운영과 학생별 출석·과제 상태 수정을 한곳에서 처리하는 운영 화면입니다.",
    pages: [
      {
        id: "attendance-board-overview",
        label: "운영 가이드",
        title: "출석 상태와 공개 체크인 세션을 함께 다룹니다",
        description:
          "학생별 출석 상태, 과제 상태, 과제 링크를 바로 수정하고, QR 또는 위치 기반 방식의 공개 체크인 세션까지 같은 화면에서 운영할 수 있습니다.",
        bullets: [
          "학생별 출석과 과제 상태를 빠르게 확인하고 수정할 수 있습니다.",
          "QR 체크인과 위치 기반 인증으로 셀프 체크 흐름을 운영할 수 있습니다.",
          "셀프 체크 준비 여부와 완료 현황을 같은 화면에서 확인할 수 있습니다.",
        ],
        noteTitle: "추천 사용 흐름",
        note:
          "먼저 공개 체크인 세션을 열고, 이후 학생별 출석과 과제 상태를 검토하면서 필요한 링크와 상태값을 업데이트하세요.",
      },
    ],
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
  const [helpOpen, setHelpOpen] = useState(false);
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
          onClick={() => setHelpOpen(true)}
        >
          <HelpIcon size={14} />
          도움말
        </button>
      </div>

      <TopNavHelpModal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        content={helpContent}
      />
    </div>
  );
}

function TopNavHelpModal({
  open,
  onClose,
  content,
}: {
  open: boolean;
  onClose: () => void;
  content: HelpContent;
}) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const hasMultiplePages = content.pages.length > 1;
  const lastPageIndex = content.pages.length - 1;
  const currentPage = content.pages[Math.min(currentPageIndex, lastPageIndex)];

  useEffect(() => {
    if (!open) {
      return;
    }

    setCurrentPageIndex(0);
  }, [content.title, open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (!hasMultiplePages) {
        return;
      }

      if (event.key === "ArrowRight") {
        setCurrentPageIndex((prev) => Math.min(prev + 1, lastPageIndex));
      }

      if (event.key === "ArrowLeft") {
        setCurrentPageIndex((prev) => Math.max(prev - 1, 0));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasMultiplePages, lastPageIndex, onClose, open]);

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
        className="max-h-[calc(100vh-64px)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <div className="text-[11px] font-semibold tracking-[0.08em] text-accent/80">
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
          <div className="rounded-2xl border border-border bg-surface-2 px-4 py-4">
            <div className="text-[11px] font-semibold tracking-[0.08em] text-text-dim">
              이 도움말에서 다루는 내용
            </div>
            <p className="mt-2 leading-6 text-text-secondary">
              {content.summary}
            </p>
          </div>

          {hasMultiplePages ? (
            <div className="-mx-1 overflow-x-auto px-1 pb-1">
              <div className="flex min-w-max gap-2">
                {content.pages.map((page, index) => {
                  const isActive = index === currentPageIndex;

                  return (
                    <button
                      key={page.id}
                      type="button"
                      onClick={() => setCurrentPageIndex(index)}
                      className={`inline-flex min-h-10 items-center rounded-full border px-3 py-2 text-[12px] font-medium transition-colors ${
                        isActive
                          ? "border-accent-border bg-accent-dim text-accent"
                          : "border-border bg-surface-2 text-text-secondary hover:border-border-light hover:text-text"
                      }`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {index + 1}. {page.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-surface-2 px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-semibold tracking-[0.08em] text-text-dim">
                  {currentPage.label}
                </div>
                <h3 className="mt-1 text-base font-semibold text-text">
                  {currentPage.title}
                </h3>
                <p className="mt-2 leading-6 text-text-secondary">
                  {currentPage.description}
                </p>
              </div>
              {hasMultiplePages ? (
                <div className="rounded-full border border-border bg-surface px-2.5 py-1 text-[11px] font-medium text-text-dim">
                  {currentPageIndex + 1} / {content.pages.length}
                </div>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border border-border bg-surface/80 px-4 py-4">
              <div className="text-sm font-semibold text-text">
                이 페이지에서 이해할 것
              </div>
              <ul className="mt-3 space-y-2.5 text-sm text-text-secondary">
                {currentPage.bullets.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[8px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                    <span className="leading-6">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-4 rounded-xl border border-border bg-surface/80 px-4 py-4">
              <div className="text-sm font-semibold text-text">
                {currentPage.noteTitle}
              </div>
              <p className="mt-2 leading-6 text-text-secondary">
                {currentPage.note}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          {hasMultiplePages ? (
            <div className="text-[12px] text-text-dim">
              좌우 화살표 키로도 페이지를 넘길 수 있습니다.
            </div>
          ) : (
            <div />
          )}

          <div className="flex items-center justify-end gap-2">
            {hasMultiplePages ? (
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() =>
                  setCurrentPageIndex((prev) => Math.max(prev - 1, 0))
                }
                disabled={currentPageIndex === 0}
              >
                이전
              </button>
            ) : null}
            {hasMultiplePages && currentPageIndex < lastPageIndex ? (
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-95"
                onClick={() =>
                  setCurrentPageIndex((prev) =>
                    Math.min(prev + 1, lastPageIndex),
                  )
                }
              >
                다음
              </button>
            ) : (
              <button
                type="button"
                className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface-2 px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text"
                onClick={onClose}
              >
                닫기
              </button>
            )}
          </div>
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
