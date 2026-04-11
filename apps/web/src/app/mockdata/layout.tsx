import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./mockdata.module.css";

const NAV_ITEMS = [
  { href: "/mockdata", label: "개요" },
  { href: "/mockdata/empty", label: "첫 화면" },
  { href: "/mockdata/recording", label: "녹음 플로우" },
  { href: "/mockdata/result", label: "전사 + AI 요약" },
  { href: "/mockdata/students", label: "학생 관리" },
  { href: "/mockdata/students/detail", label: "학생 상세" },
];

export default function MockdataLayout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.mockRoot}>
      <nav className={styles.topNav}>
        <span className={styles.logo}>YEON</span>
        <div className={styles.navTabs}>
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className={styles.navTab}>
              {item.label}
            </Link>
          ))}
        </div>
        <div className={styles.navSpacer} />
        <span className={styles.navMeta}>데모 모드 · 평가용 샘플 데이터</span>
      </nav>
      {children}
    </div>
  );
}
