import type { Metadata } from "next";
import { TypingRacePlayScreen } from "@/features/typing-service";

export const metadata: Metadata = {
  title: "YEON 타이핑 레이스 플레이",
  description: "카운트다운과 레인 UI가 포함된 타이핑 레이스 플레이 화면입니다.",
  alternates: {
    canonical: "/typing-service/play",
  },
  robots: {
    index: false,
    follow: true,
  },
};

export default function TypingServicePlayPage() {
  return <TypingRacePlayScreen />;
}
