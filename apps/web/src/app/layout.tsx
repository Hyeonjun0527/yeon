import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

const DEFAULT_APP_URL = "https://yeon.world";

const metadataBase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL);
  } catch {
    return new URL(DEFAULT_APP_URL);
  }
})();

export const metadata: Metadata = {
  title: "YEON | 상담 기록 워크스페이스",
  description:
    "녹음 업로드, 원문 열람, 구조화 요약, 원문 기반 AI 채팅을 하나의 흐름으로 다루는 상담 기록 워크스페이스",
  metadataBase,
  alternates: {
    canonical: "/",
  },
};

type RootLayoutProps = {
  children: ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
