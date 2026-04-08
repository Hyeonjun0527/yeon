import styles from "../../mockdata/mockdata.module.css";
import { STUDENTS } from "../../mockdata/app/_data/mock-data";
import type { ParentReport } from "../_lib/mock-reports";

type ReportSidebarProps = {
  selectedStudentId: string | null;
  reports: ParentReport[];
  onSelectStudent: (id: string) => void;
};

export function ReportSidebar({
  selectedStudentId,
  reports,
  onSelectStudent,
}: ReportSidebarProps) {
  return (
    <div className={styles.sidebar}>
      {/* 헤더 */}
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>수강생 리포트</h2>
      </div>

      {/* 학생 리스트 */}
      <div className={styles.sidebarList}>
        {STUDENTS.map((student) => {
          const studentReports = reports.filter(
            (r) => r.studentId === student.id,
          );
          const draftCount = studentReports.filter(
            (r) => r.status === "draft",
          ).length;

          return (
            <div
              key={student.id}
              className={`${styles.sidebarItem} ${
                selectedStudentId === student.id
                  ? styles.sidebarItemActive
                  : ""
              }`}
              onClick={() => onSelectStudent(student.id)}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                {/* 아바타 */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background: student.gradient,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fff",
                    flexShrink: 0,
                  }}
                >
                  {student.initial}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span className={styles.sidebarItemTitle}>
                      {student.name}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-dim)",
                      }}
                    >
                      {student.grade}
                    </span>
                  </div>
                  <div className={styles.sidebarItemMeta}>
                    <span>상담 {student.counseling}회</span>
                    <span style={{ margin: "0 4px" }}>·</span>
                    <span>리포트 {studentReports.length}건</span>
                    {draftCount > 0 && (
                      <>
                        <span style={{ margin: "0 4px" }}>·</span>
                        <span style={{ color: "var(--amber)" }}>
                          초안 {draftCount}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
