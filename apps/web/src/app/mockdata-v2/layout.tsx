import type { ReactNode } from "react";
import styles from "../mockdata/mockdata.module.css";

export const metadata = { title: "YEON — 시뮬레이션" };

export default function MockV2Layout({ children }: { children: ReactNode }) {
  return <div className={styles.mockRoot}>{children}</div>;
}
