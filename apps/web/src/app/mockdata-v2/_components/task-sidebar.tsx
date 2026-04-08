import styles from "../../mockdata/mockdata.module.css";
import type { FollowUpTask } from "../_lib/mock-tasks";
import { type StatusFilter, groupTasksByDate } from "../_hooks/use-task-filters";
import { STUDENTS } from "../../mockdata/app/_data/mock-data";

type TaskSidebarProps = {
  tasks: FollowUpTask[];
  selectedId: string | null;
  statusFilter: StatusFilter;
  studentFilter: string;
  onSelect: (id: string | null) => void;
  onStatusFilter: (f: StatusFilter) => void;
  onStudentFilter: (id: string) => void;
  onOpenForm: () => void;
};

const FILTER_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "pending", label: "미완료" },
  { value: "overdue", label: "지연" },
  { value: "done", label: "완료" },
];

export function TaskSidebar({
  tasks,
  selectedId,
  statusFilter,
  studentFilter,
  onSelect,
  onStatusFilter,
  onStudentFilter,
  onOpenForm,
}: TaskSidebarProps) {
  const groups = groupTasksByDate(tasks);

  return (
    <div className={styles.sidebar}>
      {/* 헤더 */}
      <div className={styles.sidebarHeader}>
        <h2 className={styles.sidebarTitle}>후속 조치</h2>
        <button className={styles.btnNew} onClick={onOpenForm}>
          + 조치 추가
        </button>
      </div>

      {/* 필터 칩 */}
      <div style={{ display: "flex", gap: 6, padding: "0 16px 8px", flexWrap: "wrap" }}>
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip.value}
            onClick={() => onStatusFilter(chip.value)}
            style={{
              padding: "4px 12px",
              borderRadius: 20,
              border: "1px solid",
              borderColor:
                statusFilter === chip.value
                  ? "var(--accent)"
                  : "var(--border)",
              background:
                statusFilter === chip.value
                  ? "var(--accent-dim)"
                  : "transparent",
              color:
                statusFilter === chip.value
                  ? "var(--accent)"
                  : "var(--text-secondary)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* 학생 필터 */}
      <div style={{ padding: "0 16px 12px" }}>
        <select
          value={studentFilter}
          onChange={(e) => onStudentFilter(e.target.value)}
          style={{
            width: "100%",
            padding: "6px 10px",
            borderRadius: "var(--radius-sm)",
            border: "1px solid var(--border)",
            background: "var(--surface2)",
            color: "var(--text)",
            fontSize: 13,
            fontFamily: "inherit",
          }}
        >
          <option value="all">모든 학생</option>
          {STUDENTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* 태스크 리스트 */}
      <div className={styles.sidebarList}>
        <TaskGroup
          label="지연"
          tasks={groups.overdue}
          selectedId={selectedId}
          onSelect={onSelect}
          labelColor="var(--red)"
        />
        <TaskGroup
          label="오늘"
          tasks={groups.today}
          selectedId={selectedId}
          onSelect={onSelect}
          labelColor="var(--amber)"
        />
        <TaskGroup
          label="이번 주"
          tasks={groups.thisWeek}
          selectedId={selectedId}
          onSelect={onSelect}
          labelColor="var(--text-secondary)"
        />
        <TaskGroup
          label="이후"
          tasks={groups.later}
          selectedId={selectedId}
          onSelect={onSelect}
          labelColor="var(--text-dim)"
        />
        <TaskGroup
          label="완료"
          tasks={groups.done}
          selectedId={selectedId}
          onSelect={onSelect}
          labelColor="var(--green)"
        />
      </div>
    </div>
  );
}

/* ── 날짜 그룹 ── */

function TaskGroup({
  label,
  tasks,
  selectedId,
  onSelect,
  labelColor,
}: {
  label: string;
  tasks: FollowUpTask[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  labelColor: string;
}) {
  if (tasks.length === 0) return null;

  return (
    <div style={{ marginBottom: 8 }}>
      <div
        style={{
          padding: "6px 16px",
          fontSize: 11,
          fontWeight: 600,
          color: labelColor,
          textTransform: "uppercase",
          letterSpacing: 0.5,
        }}
      >
        {label} ({tasks.length})
      </div>
      {tasks.map((task) => (
        <TaskItem
          key={task.id}
          task={task}
          isSelected={task.id === selectedId}
          onSelect={() => onSelect(task.id)}
        />
      ))}
    </div>
  );
}

/* ── 개별 태스크 아이템 ── */

function TaskItem({
  task,
  isSelected,
  onSelect,
}: {
  task: FollowUpTask;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const priorityColors: Record<string, string> = {
    high: "var(--red)",
    medium: "var(--amber)",
    low: "var(--text-dim)",
  };

  return (
    <div
      className={`${styles.sidebarItem} ${isSelected ? styles.sidebarItemActive : ""}`}
      onClick={onSelect}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
        {/* 우선순위 점 */}
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: priorityColors[task.priority],
            marginTop: 6,
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            className={styles.sidebarItemTitle}
            style={{
              textDecoration: task.status === "done" ? "line-through" : "none",
              opacity: task.status === "done" ? 0.5 : 1,
            }}
          >
            {task.description}
          </div>
          <div className={styles.sidebarItemMeta}>
            <span>{task.studentName}</span>
            <span style={{ margin: "0 4px" }}>·</span>
            <span>{task.dueDate}</span>
            {task.isAiGenerated && (
              <>
                <span style={{ margin: "0 4px" }}>·</span>
                <span style={{ color: "var(--accent)", fontSize: 10 }}>AI</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
