"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, GraduationCap } from "lucide-react";
import { StudentManagementProvider } from "@/features/student-management";
import styles from "./student-management-layout.module.css";

const NAV_ITEMS = [
  { href: "/student-management", label: "학생 목록", icon: Users, exact: true },
  {
    href: "/student-management/classes",
    label: "코호트 관리",
    icon: GraduationCap,
  },
] as const;

export default function StudentManagementLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <StudentManagementProvider>
      <div className={styles.shell}>
        <nav className={styles.sidebar}>
          <div className={styles.logo}>
            <GraduationCap size={24} style={{ color: "#818cf8" }} />
            <span className={styles.logoText}>학생 관리</span>
          </div>
          <ul className={styles.navList}>
            {NAV_ITEMS.map((item) => {
              const active =
                "exact" in item && item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <main className={styles.main}>{children}</main>
      </div>
    </StudentManagementProvider>
  );
}
