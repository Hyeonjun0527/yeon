"use client";

import type { Student } from "../types";
import styles from "../student-detail.module.css";

interface TabOverviewProps {
  student: Student;
}

export function TabOverview({ student }: TabOverviewProps) {
  const recentCounseling = student.counselingHistory.slice(0, 3);
  const activeCourses = student.courseHistory.filter(
    (c) => c.status === "active",
  );

  return (
    <div>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>총 상담</div>
          <div className={styles.statCardValue}>
            {student.counselingHistory.length}건
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>수강 코호트</div>
          <div className={styles.statCardValue}>
            {student.courseHistory.length}개
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>메모</div>
          <div className={styles.statCardValue}>{student.memos.length}건</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statCardLabel}>등록일</div>
          <div
            className={styles.statCardValue}
            style={{ fontSize: 16 }}
          >
            {student.registeredAt}
          </div>
        </div>
      </div>

      {recentCounseling.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div className={styles.sectionTitle}>최근 상담</div>
          <div className={styles.counselingList}>
            {recentCounseling.map((item) => (
              <div key={item.id} className={styles.counselingItem}>
                <span className={styles.counselingDate}>{item.date}</span>
                <span className={styles.counselingTitle}>{item.title}</span>
                <span className={styles.counselingStatus}>{item.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeCourses.length > 0 && (
        <div>
          <div className={styles.sectionTitle}>수강 중인 코호트</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activeCourses.map((course) => (
              <div key={course.id} className={styles.courseItem}>
                <div>
                  <div className={styles.courseItemName}>{course.className}</div>
                  <div className={styles.courseItemMeta}>{course.period}</div>
                </div>
                {course.instructor && (
                  <span className={styles.courseItemMeta}>
                    멘토: {course.instructor}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
