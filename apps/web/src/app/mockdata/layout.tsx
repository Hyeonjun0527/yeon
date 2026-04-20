import type { Metadata } from "next";
import type { ReactNode } from "react";

import { NON_INDEXABLE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: NON_INDEXABLE_ROBOTS,
};

export default function MockdataLayout({ children }: { children: ReactNode }) {
  return children;
}
