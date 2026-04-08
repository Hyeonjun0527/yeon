"use client";

import React from "react";
import { useStudentManagement } from "../student-management-provider";
import { useStudentDetail } from "../hooks/use-student-detail";
import { useStudentMemos } from "../hooks/use-student-memos";
import { StudentDetailHeader } from "../components/student-detail-header";
import { StudentDetailTabs } from "../components/student-detail-tabs";
import { TabOverview } from "../components/tab-overview";
import { TabCounseling } from "../components/tab-counseling";
import { TabCourses } from "../components/tab-courses";
import { TabGuardian } from "../components/tab-guardian";
import { TabMemos } from "../components/tab-memos";

interface StudentDetailScreenProps {
  paramsPromise: Promise<{ studentId: string }>;
}

export function StudentDetailScreen({
  paramsPromise,
}: StudentDetailScreenProps) {
  const { studentId } = React.use(paramsPromise);
  const { sheetMode } = useStudentManagement();
  const { student, activeTab, setActiveTab } = useStudentDetail({ studentId });
  const { memos, newMemoText, setNewMemoText, addMemo } = useStudentMemos({
    studentId,
  });

  if (!student) {
    return (
      <div
        style={{
          padding: "48px 0",
          textAlign: "center",
          color: "#94a3b8",
          fontSize: 16,
        }}
      >
        학생을 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div>
      <StudentDetailHeader student={student} />
      <StudentDetailTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "overview" && <TabOverview student={student} />}
      {activeTab === "counseling" && (
        <TabCounseling history={student.counselingHistory} />
      )}
      {activeTab === "courses" && (
        <TabCourses history={student.courseHistory} />
      )}
      {activeTab === "guardian" && (
        <TabGuardian guardians={student.guardians} />
      )}
      {activeTab === "memos" && (
        <TabMemos
          memos={memos}
          newMemoText={newMemoText}
          setNewMemoText={setNewMemoText}
          addMemo={addMemo}
        />
      )}

      {sheetMode !== null && (
        <div suppressHydrationWarning>
          {/* StudentSheet는 별도 구현 후 여기에 마운트됩니다 */}
        </div>
      )}
    </div>
  );
}
