import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/site-brand";
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
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
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
