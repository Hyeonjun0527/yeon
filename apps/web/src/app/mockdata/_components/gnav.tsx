import styles from "../mockdata.module.css";

type GnavProps = {
  activeMenu: "records" | "students";
};

export function Gnav({ activeMenu }: GnavProps) {
  return (
    <div className={styles.gnav}>
      <div
        className={`${styles.gnavItem} ${activeMenu === "records" ? styles.gnavItemActive : ""}`}
        title="상담 기록"
      >
        📝
      </div>
      <div
        className={`${styles.gnavItem} ${activeMenu === "students" ? styles.gnavItemActive : ""}`}
        title="학생 관리"
      >
        👥
      </div>
      <div className={styles.gnavSpacer} />
      <div className={styles.gnavItem} title="설정">
        ⚙
      </div>
      <div className={styles.gnavAvatar}>최</div>
    </div>
  );
}
