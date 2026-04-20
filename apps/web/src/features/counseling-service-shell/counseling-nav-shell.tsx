"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Gnav } from "./counseling-gnav";
import { TopNav } from "./counseling-top-nav";
import { CounselingSidebarLayoutProvider } from "./counseling-sidebar-layout-context";
import { ExportProvider } from "./export-context";
import { useAppRoute } from "@/lib/app-route-context";

type Section = "records" | "students";

function getSectionFromPathname(pathname: string): Section {
  if (pathname.startsWith("/counseling-service/student-management")) {
    return "students";
  }

  return "records";
}

export function CounselingNavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { normalizeAppPathname } = useAppRoute();
  const section = getSectionFromPathname(normalizeAppPathname(pathname));

  return (
    <ExportProvider>
      <CounselingSidebarLayoutProvider>
        <TopNav section={section} />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Gnav activeMenu={section} />
          {children}
        </div>
      </CounselingSidebarLayoutProvider>
    </ExportProvider>
  );
}
