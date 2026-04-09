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
  title: "YEON | 교육기관 수강생 관리 & 멘토링 기록 플랫폼",
  description:
    "YEON은 부트캠프·교육기관 운영자를 위한 수강생 관리 및 멘토링 기록 플랫폼입니다. 녹음 업로드, AI 자동 전사·요약, 수강생별 상담 히스토리 관리를 한 화면에서 처리합니다.",
  metadataBase,
  alternates: {
    canonical: "/",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION ?? "",
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
