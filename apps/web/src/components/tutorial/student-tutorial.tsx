"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { EventData } from "react-joyride";
import { useTutorial } from "./use-tutorial";
import { useTutorialPolicy } from "@/features/counseling-service-shell/counseling-sidebar-layout-context";

const Joyride = dynamic(
  () => import("react-joyride").then((m) => ({ default: m.Joyride })),
  { ssr: false },
);

const MEMBER_CARD_STEP = {
  target: '[data-tutorial="member-card"]',
  title: "수강생 상세 보기",
  content: "카드를 클릭하면 개인 현황·상담 이력·메모를 한 번에 볼 수 있어요.",
  placement: "bottom" as const,
};

const EMPTY_STATE_STEP = {
  target: '[data-tutorial="member-empty-state"]',
  title: "수강생 등록 시작하기",
  content:
    "아직 수강생이 없다면 이 안내 영역을 보고 상단의 수강생 추가나 외부 파일 가져오기로 시작할 수 있어요.",
  placement: "bottom" as const,
};

const BASE_STEPS = [
  {
    target: '[data-tutorial="space-title"]',
    title: "스페이스란?",
    content:
      "기수나 프로그램 단위로 수강생을 묶는 그룹이에요. 왼쪽 사이드바에서 직접 만들어 관리하세요.",
    skipBeacon: true,
    placement: "bottom" as const,
  },
  {
    target: '[data-tutorial="add-member-btn"]',
    title: "수강생 등록하기",
    content: "이름·연락처·상태를 입력해 수강생을 추가해요.",
    placement: "bottom" as const,
  },
];

export function StudentTutorial() {
  const { run, finish } = useTutorial("student");
  const { mode } = useTutorialPolicy("student");
  const steps = useMemo(() => {
    if (mode === "disabled") {
      return [];
    }

    if (mode === "full") {
      return [...BASE_STEPS, MEMBER_CARD_STEP];
    }

    return [...BASE_STEPS, EMPTY_STATE_STEP];
  }, [mode, run]);

  if (mode === "disabled") {
    return null;
  }

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
