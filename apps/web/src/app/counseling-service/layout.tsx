import type { Metadata } from "next";
import type { ReactNode } from "react";

import { CounselingServiceShell } from "@/features/counseling-service-shell/counseling-service-shell";
import { NON_INDEXABLE_ROBOTS } from "@/lib/seo";

export const metadata: Metadata = {
  robots: NON_INDEXABLE_ROBOTS,
};

export default function CounselingServiceLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <CounselingServiceShell appBasePath="/counseling-service">
      {children}
    </CounselingServiceShell>
  );
}
