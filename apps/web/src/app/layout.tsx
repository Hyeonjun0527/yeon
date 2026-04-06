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
  title: "YEON | 로그인 기반 학생 운영 포털",
  description:
    "로그인 후 프로젝트 생성, 학생 정보 파일 업로드, 과제 할당과 진행 파악 흐름으로 다시 구축 중인 학생 운영 포털",
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
