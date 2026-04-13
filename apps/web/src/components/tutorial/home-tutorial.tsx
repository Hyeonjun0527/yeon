"use client";

import dynamic from "next/dynamic";
import type { EventData } from "react-joyride";
import { useTutorial } from "./use-tutorial";
import { useTutorialPolicy } from "@/app/home/_components/home-sidebar-layout-context";

const Joyride = dynamic(
  () => import("react-joyride").then((m) => ({ default: m.Joyride })),
  { ssr: false },
);

const BASE_STEPS = [
  {
    target: '[data-tutorial="new-record-btn"]',
    title: "녹음으로 시작하기",
    content:
      "버튼을 누르면 바로 녹음이 시작돼요. 멘토링·1:1 상담을 그대로 녹음하세요.",
    skipBeacon: true,
    placement: "top" as const,
  },
  {
    target: '[data-tutorial="ai-panel"]',
    title: "AI 분석 결과",
    content:
      "전사가 완료되면 여기서 요약·핵심 내용·후속 조치를 확인할 수 있어요.",
    placement: "left" as const,
  },
  {
    target: '[data-tutorial="link-member-btn"]',
    title: "수강생과 연결하기",
    content: "상담 기록을 수강생에 연결하면 수강생별 이력이 자동으로 쌓여요.",
    placement: "bottom" as const,
  },
  {
    target: '[data-tutorial="members-section"]',
    title: "수강생 현황 보기",
    content: "최근 상담일 기준으로 관리가 필요한 수강생을 한눈에 확인하세요.",
    placement: "right" as const,
  },
];

export function HomeTutorial() {
  const { run, finish } = useTutorial("home");
  const { mode } = useTutorialPolicy("home");

  if (mode !== "full") {
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
      steps={BASE_STEPS}
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
