"use client";

import { Plus } from "lucide-react";
import { useClassManagement } from "../hooks/use-class-management";
import { useClassForm } from "../hooks/use-class-form";
import { ClassList } from "../components/class-list";
import { ClassStudentPanel } from "../components/class-student-panel";
import { ClassSheet } from "../components/class-sheet";

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
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 md:flex-row flex-col md:items-center items-start">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-[-0.02em]">코호트 관리</h1>
          <p className="text-sm text-text-secondary mt-0.5">{classes.length}개 코호트</p>
        </div>
        <div className="flex items-center gap-[10px] md:w-auto w-full flex-wrap">
          <button
            className="flex items-center gap-1.5 py-2 px-4 bg-accent text-white border-none rounded-sm text-sm font-semibold cursor-pointer transition-[opacity,box-shadow] duration-150 hover:opacity-90 hover:shadow-[0_8px_32px_rgba(129,140,248,0.25)]"
            onClick={classForm.openCreate}
          >
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
