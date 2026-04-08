"use client";

import { BulkActionBar } from "../components/bulk-action-bar";
import { EmptyState } from "../components/empty-state";
import { StudentListHeader } from "../components/student-list-header";
import { StudentListView } from "../components/student-list-view";
import { StudentSheet } from "../components/student-sheet";
import { useBulkActions } from "../hooks/use-bulk-actions";
import { useStudentList } from "../hooks/use-student-list";
import { useStudentManagement } from "../student-management-provider";

export function StudentListScreen() {
  const { openSheet } = useStudentManagement();

  const {
    filteredStudents,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    classFilter,
    setClassFilter,
    tagFilter,
    setTagFilter,
    viewMode,
    setViewMode,
  } = useStudentList();

  const { selectedIds, toggleSelect, clearSelection, selectedCount } =
    useBulkActions();

  return (
    <div>
      <StudentListHeader
        totalCount={filteredStudents.length}
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        classFilter={classFilter}
        onClassFilterChange={setClassFilter}
        tagFilter={tagFilter}
        onTagFilterChange={setTagFilter}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onAddStudent={() => openSheet("create")}
      />

      {filteredStudents.length === 0 ? (
        <EmptyState onAdd={() => openSheet("create")} />
      ) : (
        <StudentListView
          students={filteredStudents}
          viewMode={viewMode}
          selectedIds={selectedIds}
          onToggleSelect={toggleSelect}
        />
      )}

      <BulkActionBar
        selectedCount={selectedCount}
        onAssignClass={() => {}}
        onChangeStatus={() => {}}
        onClose={clearSelection}
      />

      <StudentSheet />
    </div>
  );
}
