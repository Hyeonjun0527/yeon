"use client";

import { Plus } from "lucide-react";
import { useClassManagement } from "../hooks/use-class-management";
import { useClassForm } from "../hooks/use-class-form";
import { ClassList } from "../components/class-list";
import { ClassStudentPanel } from "../components/class-student-panel";
import { ClassSheet } from "../components/class-sheet";
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

  const classForm = useClassForm();

  return (
    <div>
      <div className={listStyles.pageHeader}>
        <div>
          <h1 className={listStyles.pageTitle}>코호트 관리</h1>
          <p className={listStyles.pageSubtitle}>{classes.length}개 코호트</p>
        </div>
        <div className={listStyles.headerActions}>
          <button className={listStyles.addButton} onClick={classForm.openCreate}>
            <Plus size={16} />
            코호트 추가
          </button>
        </div>
      </div>

      <ClassList
        classes={classes}
        expandedClassId={expandedClassId}
        onToggleExpand={toggleExpand}
        getClassStudents={getClassStudents}
        onEdit={classForm.openEdit}
        onDelete={classForm.handleDelete}
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

      <ClassSheet
        mode={classForm.sheetMode}
        form={classForm.form}
        onUpdateField={classForm.updateField}
        onSubmit={classForm.handleSubmit}
        onClose={classForm.closeSheet}
      />
    </div>
  );
}
