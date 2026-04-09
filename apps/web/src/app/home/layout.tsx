"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import styles from "../mockdata/mockdata.module.css";
import { Gnav } from "./_components/gnav";
import { TopNav } from "./_components/top-nav";

type Section = "records" | "students";

function getSectionFromPathname(pathname: string): Section {
  if (pathname.startsWith("/home/student-management")) return "students";
  return "records";
}

export default function HomeLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const section = getSectionFromPathname(pathname);

  return (
    <div className={styles.mockRoot}>
      <div className={styles.appShell} style={{ flexDirection: "column" }}>
        <TopNav section={section} />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
          <Gnav activeMenu={section} />
          {children}
        </div>
      </div>
    </div>
  );
}
