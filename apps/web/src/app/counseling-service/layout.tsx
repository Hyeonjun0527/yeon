import type { ReactNode } from "react";

import { CounselingServiceShell } from "@/features/counseling-service-shell/counseling-service-shell";

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
