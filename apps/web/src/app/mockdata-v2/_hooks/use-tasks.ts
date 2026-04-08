import { useState, useCallback } from "react";
import { MOCK_TASKS, type FollowUpTask, type TaskStatus } from "../_lib/mock-tasks";

export function useTasks() {
  const [tasks, setTasks] = useState<FollowUpTask[]>(MOCK_TASKS);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = tasks.find((t) => t.id === selectedId) ?? null;

  const selectTask = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const updateStatus = useCallback((id: string, status: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status } : t)),
    );
  }, []);

  const addTask = useCallback((task: Omit<FollowUpTask, "id" | "createdAt">) => {
    const newTask: FollowUpTask = {
      ...task,
      id: `t_${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
    };
    setTasks((prev) => [newTask, ...prev]);
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
  }, []);

  /* 통계 */
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === "pending").length,
    inProgress: tasks.filter((t) => t.status === "in-progress").length,
    done: tasks.filter((t) => t.status === "done").length,
    overdue: tasks.filter((t) => {
      if (t.status === "done") return false;
      const due = t.dueDate.replace(/\./g, "-");
      return new Date(due) < new Date("2026-04-09");
    }).length,
  };

  return {
    tasks,
    selectedId,
    selected,
    stats,
    selectTask,
    updateStatus,
    addTask,
    deleteTask,
  } as const;
}
