import type { Metadata } from "next";
import { IBM_Plex_Mono, Noto_Sans_KR } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const DEFAULT_APP_URL = "https://yeon.world";

const bodyFont = Noto_Sans_KR({
  variable: "--font-body",
  weight: ["400", "500", "700"],
  display: "swap",
});

const monoFont = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const metadataBase = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_APP_URL ?? DEFAULT_APP_URL);
  } catch {
    return new URL(DEFAULT_APP_URL);
  }
})();

export const metadata: Metadata = {
  title: "YEON | 교강사용 AI 학생관리 CRM",
  description:
    "운영 조직 소속 부트캠프 교강사가 수업 전 30분 안에 오늘 챙길 학생을 정리하고 개입까지 이어가게 만드는 AI 학생관리 CRM",
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
      <body className={`${bodyFont.variable} ${monoFont.variable}`}>
        {children}
      </body>
    </html>
  );
}
