"use client";

import { useClassManagement } from "../hooks/use-class-management";
import { ClassList } from "../components/class-list";
import { ClassStudentPanel } from "../components/class-student-panel";
import listStyles from "../student-list.module.css";

export function ClassManagementScreen() {
  const {
    classes,
    expandedClassId,
    toggleExpand,
    getClassStudents,
    getUnassignedStudents,
    selectedStudentIds,
    toggleStudentSelect,
    handleAssign,
    handleRemove,
    showAssignModal,
    setShowAssignModal,
  } = useClassManagement();

  return (
    <div>
      <div className={listStyles.pageHeader}>
        <div>
          <h1 className={listStyles.pageTitle}>코호트 관리</h1>
          <p className={listStyles.pageSubtitle}>{classes.length}개 코호트</p>
        </div>
      </div>

      <ClassList
        classes={classes}
        expandedClassId={expandedClassId}
        onToggleExpand={toggleExpand}
        getClassStudents={getClassStudents}
      />

      {expandedClassId !== null && (
        <ClassStudentPanel
          classId={expandedClassId}
          assignedStudents={getClassStudents(expandedClassId)}
          unassignedStudents={getUnassignedStudents(expandedClassId)}
          selectedStudentIds={selectedStudentIds}
          onToggleStudent={toggleStudentSelect}
          onAssign={handleAssign}
          onRemove={handleRemove}
          showAssignModal={showAssignModal}
          onToggleAssignModal={setShowAssignModal}
        />
      )}
    </div>
  );
}
