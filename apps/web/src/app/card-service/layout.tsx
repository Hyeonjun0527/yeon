import type { Metadata } from "next";
import type { ReactNode } from "react";

import { QueryProvider } from "@/lib/query-provider";
import { NON_INDEXABLE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: NON_INDEXABLE_ROBOTS,
};

export default function CardServiceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <QueryProvider>{children}</QueryProvider>;
}
