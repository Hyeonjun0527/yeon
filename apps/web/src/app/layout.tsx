import type { Metadata } from "next";
import type { ReactNode } from "react";

import { getDefaultSiteRobots, getSeoMetadataBase } from "@/lib/seo";
import {
  SITE_BRAND_NAME,
  SITE_DESCRIPTION,
  SITE_TITLE,
} from "@/lib/site-brand";
import "./globals.css";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  metadataBase: getSeoMetadataBase(),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_BRAND_NAME,
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: getDefaultSiteRobots(),
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
