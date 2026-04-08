import styles from "../../mockdata/mockdata.module.css";
import type { FollowUpTask } from "../_lib/mock-tasks";
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from "../_lib/mock-tasks";
import type { TaskStatus } from "../_lib/mock-tasks";

type TaskCenterPanelProps = {
  stats: {
    total: number;
    pending: number;
    inProgress: number;
    done: number;
    overdue: number;
  };
  selected: FollowUpTask | null;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onDeselect: () => void;
};

export function TaskCenterPanel({
  stats,
  selected,
  onUpdateStatus,
  onDelete,
  onDeselect,
}: TaskCenterPanelProps) {
  return (
    <div className={styles.center} style={{ padding: 0 }}>
      {/* 통계 카드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
          padding: "20px 24px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <StatCard label="전체 조치" value={stats.total} color="var(--text)" />
        <StatCard label="진행 중" value={stats.pending + stats.inProgress} color="var(--accent)" />
        <StatCard label="지연" value={stats.overdue} color="var(--red)" />
        <StatCard label="완료" value={stats.done} color="var(--green)" />
      </div>

      {/* 상세 또는 안내 */}
      {selected ? (
        <TaskDetail
          task={selected}
          onUpdateStatus={onUpdateStatus}
          onDelete={onDelete}
          onBack={onDeselect}
        />
      ) : (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-dim)",
            gap: 8,
          }}
        >
          <TaskListIcon size={40} />
          <div style={{ fontSize: 15 }}>왼쪽에서 조치를 선택하세요</div>
          <div style={{ fontSize: 13 }}>
            또는 &quot;+ 조치 추가&quot;로 새 조치를 만들 수 있습니다
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 통계 카드 ── */

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div
      style={{
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1.2 }}>
        {value}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

/* ── 태스크 상세 ── */

function TaskDetail({
  task,
  onUpdateStatus,
  onDelete,
  onBack,
}: {
  task: FollowUpTask;
  onUpdateStatus: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}) {
  const priorityColors: Record<string, string> = {
    high: "var(--red)",
    medium: "var(--amber)",
    low: "var(--text-dim)",
  };

  const statusColors: Record<string, string> = {
    pending: "var(--amber)",
    "in-progress": "var(--accent)",
    done: "var(--green)",
  };

  return (
    <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
      {/* 뒤로가기 */}
      <button
        onClick={onBack}
        style={{
          background: "none",
          border: "none",
          color: "var(--text-secondary)",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "inherit",
          padding: 0,
          marginBottom: 16,
        }}
      >
        ← 목록으로
      </button>

      {/* 제목 영역 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: priorityColors[task.priority],
            }}
          />
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: priorityColors[task.priority],
            }}
          >
            {TASK_PRIORITY_LABELS[task.priority]}
          </span>
          <span
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 12,
              background:
                task.status === "done"
                  ? "var(--green-dim)"
                  : task.status === "in-progress"
                    ? "var(--accent-dim)"
                    : "var(--amber-dim)",
              color: statusColors[task.status],
              border: `1px solid ${
                task.status === "done"
                  ? "var(--green-border)"
                  : task.status === "in-progress"
                    ? "var(--accent-border)"
                    : "var(--amber-border)"
              }`,
            }}
          >
            {TASK_STATUS_LABELS[task.status]}
          </span>
          {task.isAiGenerated && (
            <span
              style={{
                fontSize: 10,
                padding: "2px 8px",
                borderRadius: 12,
                background: "var(--accent-dim)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border)",
              }}
            >
              AI 생성
            </span>
          )}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, lineHeight: 1.4 }}>
          {task.description}
        </h2>
      </div>

      {/* 정보 그리드 */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "120px 1fr",
          gap: "12px 16px",
          fontSize: 14,
          marginBottom: 32,
          padding: 20,
          background: "var(--surface2)",
          borderRadius: "var(--radius)",
          border: "1px solid var(--border)",
        }}
      >
        <span style={{ color: "var(--text-dim)" }}>학생</span>
        <span>{task.studentName}</span>
        <span style={{ color: "var(--text-dim)" }}>마감일</span>
        <span>{task.dueDate}</span>
        <span style={{ color: "var(--text-dim)" }}>출처 상담</span>
        <span style={{ color: "var(--accent)" }}>{task.sourceRecordTitle}</span>
        <span style={{ color: "var(--text-dim)" }}>생성일</span>
        <span>{task.createdAt}</span>
      </div>

      {/* 액션 버튼 */}
      <div style={{ display: "flex", gap: 8 }}>
        {task.status !== "done" && (
          <>
            {task.status === "pending" && (
              <ActionButton
                label="진행 시작"
                color="var(--accent)"
                onClick={() => onUpdateStatus(task.id, "in-progress")}
              />
            )}
            <ActionButton
              label="완료 처리"
              color="var(--green)"
              onClick={() => onUpdateStatus(task.id, "done")}
            />
          </>
        )}
        {task.status === "done" && (
          <ActionButton
            label="다시 열기"
            color="var(--amber)"
            onClick={() => onUpdateStatus(task.id, "pending")}
          />
        )}
        <ActionButton
          label="삭제"
          color="var(--red)"
          onClick={() => onDelete(task.id)}
        />
      </div>
    </div>
  );
}

function ActionButton({
  label,
  color,
  onClick,
}: {
  label: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "8px 20px",
        borderRadius: "var(--radius-sm)",
        border: `1px solid ${color}`,
        background: "transparent",
        color,
        fontSize: 13,
        fontWeight: 500,
        cursor: "pointer",
        fontFamily: "inherit",
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.background = `${color}15`)
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.background = "transparent")
      }
    >
      {label}
    </button>
  );
}

function TaskListIcon({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
