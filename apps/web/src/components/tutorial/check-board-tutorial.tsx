"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { EventData } from "react-joyride";

import { useTutorial } from "./use-tutorial";

const Joyride = dynamic(
  () => import("react-joyride").then((m) => ({ default: m.Joyride })),
  { ssr: false },
);

const NO_SPACE_STEPS = [
  {
    target: '[data-tutorial="check-board-no-space"]',
    title: "스페이스 선택이 먼저예요",
    content:
      "출석보드는 특정 스페이스 기준으로 운영돼요. 먼저 스페이스를 선택한 뒤 다시 들어오면 학생 상태와 공개 체크인 세션을 관리할 수 있어요.",
    skipBeacon: true,
    placement: "bottom" as const,
  },
  {
    target: '[data-tutorial="check-board-back-link"]',
    title: "학생관리로 돌아가기",
    content:
      "여기서 학생관리 화면으로 돌아가 스페이스를 선택하거나 수강생을 확인한 뒤 출석보드로 다시 오세요.",
    placement: "bottom" as const,
  },
];

const BOARD_STEPS = [
  {
    target: '[data-tutorial="check-board-summary"]',
    title: "보드 전체 현황 보기",
    content:
      "전체 학생 수, 셀프체크 준비 수, 출석 수, 과제 완료 수를 한 번에 확인할 수 있어요.",
    skipBeacon: true,
    placement: "bottom" as const,
  },
  {
    target: '[data-tutorial="check-board-session-panel"]',
    title: "공개 체크인 세션 운영",
    content:
      "여기서 QR·위치 인증 방식을 선택하고 공개 체크인 세션을 만들어 운영할 수 있어요.",
    placement: "bottom" as const,
  },
  {
    target: '[data-tutorial="check-board-member-board"]',
    title: "학생별 상태 바로 수정",
    content:
      "학생별 출석 상태, 과제 상태, 과제 링크를 확인하고 바로 저장할 수 있어요. 모바일과 데스크톱 모두 같은 영역을 기준으로 안내합니다.",
    placement: "top" as const,
  },
];

const MOBILE_BOARD_STEPS = [
  BOARD_STEPS[0],
  BOARD_STEPS[1],
  {
    ...BOARD_STEPS[2],
    target: '[data-tutorial="check-board-member-board-mobile"]',
  },
];

const DESKTOP_BOARD_STEPS = [
  BOARD_STEPS[0],
  BOARD_STEPS[1],
  {
    ...BOARD_STEPS[2],
    target: '[data-tutorial="check-board-member-board-desktop"]',
  },
];

export function CheckBoardTutorial() {
  const { run, finish } = useTutorial("check-board");
  const steps = useMemo(() => {
    if (typeof document === "undefined") {
      return DESKTOP_BOARD_STEPS;
    }

    if (!document.querySelector('[data-tutorial="check-board-summary"]')) {
      return NO_SPACE_STEPS;
    }

    return window.matchMedia("(max-width: 639px)").matches
      ? MOBILE_BOARD_STEPS
      : DESKTOP_BOARD_STEPS;
  }, [run]);

  const handleEvent = (data: EventData) => {
    const { status } = data;
    if (status === "finished" || status === "skipped") {
      finish();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      scrollToFirstStep
      onEvent={handleEvent}
      options={{
        primaryColor: "#818cf8",
        zIndex: 10000,
        overlayColor: "rgba(12, 14, 20, 0.65)",
        overlayClickAction: "next",
        textColor: "#e5e7eb",
        showProgress: true,
        buttons: ["back", "primary", "skip"],
      }}
      locale={{
        back: "이전",
        close: "닫기",
        last: "완료",
        next: "다음",
        skip: "건너뛰기",
      }}
      styles={{
        tooltip: {
          borderRadius: 16,
          padding: "16px 18px",
          backgroundColor: "#1c1c27",
        },
        tooltipTitle: {
          fontSize: 16,
          fontWeight: 700,
          marginBottom: 8,
          color: "#f9fafb",
        },
        tooltipContent: {
          fontSize: 14,
          lineHeight: 1.45,
          color: "#d1d5db",
          padding: 0,
        },
        buttonPrimary: {
          backgroundColor: "#818cf8",
          borderRadius: 999,
          fontSize: 12,
          padding: "6px 14px",
        },
        buttonBack: {
          color: "#9ca3af",
          fontSize: 12,
        },
        buttonSkip: {
          color: "#6b7280",
          fontSize: 12,
        },
      }}
    />
  );
}
