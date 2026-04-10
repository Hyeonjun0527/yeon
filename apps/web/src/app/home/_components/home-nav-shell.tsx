"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Gnav } from "./gnav";
import { TopNav } from "./top-nav";

type Section = "records" | "students";

function getSectionFromPathname(pathname: string): Section {
  if (pathname.startsWith("/home/student-management")) return "students";
  return "records";
}

export function HomeNavShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const section = getSectionFromPathname(pathname);

  return (
    <>
      <TopNav section={section} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Gnav activeMenu={section} />
        {children}
      </div>
    </>
  );
}
