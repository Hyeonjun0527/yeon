import { useState, useCallback } from "react";
import type { FollowUpTask } from "../_lib/mock-tasks";

export type StatusFilter = "all" | "pending" | "done" | "overdue";

const TODAY = "2026-04-09";

export function useTaskFilters() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [studentFilter, setStudentFilter] = useState<string>("all");

  const applyFilters = useCallback(
    (tasks: FollowUpTask[]) => {
      let filtered = tasks;

      if (statusFilter === "pending") {
        filtered = filtered.filter((t) => t.status !== "done");
      } else if (statusFilter === "done") {
        filtered = filtered.filter((t) => t.status === "done");
      } else if (statusFilter === "overdue") {
        filtered = filtered.filter((t) => {
          if (t.status === "done") return false;
          const due = t.dueDate.replace(/\./g, "-");
          return new Date(due) < new Date(TODAY);
        });
      }

      if (studentFilter !== "all") {
        filtered = filtered.filter((t) => t.studentId === studentFilter);
      }

      return filtered;
    },
    [statusFilter, studentFilter],
  );

  const reset = useCallback(() => {
    setStatusFilter("all");
    setStudentFilter("all");
  }, []);

  return {
    statusFilter,
    studentFilter,
    setStatusFilter,
    setStudentFilter,
    applyFilters,
    reset,
  } as const;
}

/** 태스크를 날짜 그룹으로 분류 */
export function groupTasksByDate(tasks: FollowUpTask[]) {
  const overdue: FollowUpTask[] = [];
  const today: FollowUpTask[] = [];
  const thisWeek: FollowUpTask[] = [];
  const later: FollowUpTask[] = [];
  const done: FollowUpTask[] = [];

  const todayDate = new Date(TODAY);
  const weekEnd = new Date(TODAY);
  weekEnd.setDate(weekEnd.getDate() + 7);

  for (const task of tasks) {
    if (task.status === "done") {
      done.push(task);
      continue;
    }
    const due = new Date(task.dueDate.replace(/\./g, "-"));
    if (due < todayDate) overdue.push(task);
    else if (due.toDateString() === todayDate.toDateString()) today.push(task);
    else if (due < weekEnd) thisWeek.push(task);
    else later.push(task);
  }

  return { overdue, today, thisWeek, later, done };
}
