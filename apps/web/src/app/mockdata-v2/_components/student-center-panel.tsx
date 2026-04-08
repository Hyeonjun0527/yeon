import styles from "../../mockdata/mockdata.module.css";
import type { Student } from "../../mockdata/app/_data/mock-data";
import type { StudentTab } from "../_hooks/use-student-view";

type StudentCenterPanelProps = {
  selected: Student | null;
  activeTab: StudentTab;
  memoInput: string;
  onSetTab: (tab: StudentTab) => void;
  onMemoInputChange: (v: string) => void;
  onAddMemo: () => void;
};

const TABS: { id: StudentTab; label: string }[] = [
  { id: "overview", label: "개요" },
  { id: "counseling", label: "상담 기록" },
  { id: "memos", label: "메모" },
];

export function StudentCenterPanel({
  selected,
  activeTab,
  memoInput,
  onSetTab,
  onMemoInputChange,
  onAddMemo,
}: StudentCenterPanelProps) {
  if (!selected) {
    return (
      <div className={styles.stuCenter}>
        <div className={styles.stuEmptyCenter}>
          <div className={styles.stuEmptyIcon}>
            <StudentIcon size={32} />
          </div>
          <div className={styles.stuEmptyTitle}>학생을 선택하세요</div>
          <div className={styles.stuEmptyDesc}>
            왼쪽 목록에서 학생을 선택하면 상세 정보를 확인할 수 있습니다
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.stuCenter}>
      {/* ── 프로필 헤더 ── */}
      <div className={styles.stuProfile}>
        <div
          className={styles.stuProfileAvatar}
          style={{ background: selected.gradient }}
        >
          {selected.initial}
        </div>
        <div className={styles.stuProfileInfo}>
          <div className={styles.stuProfileName}>{selected.name}</div>
          <div className={styles.stuProfileMeta}>
            {selected.grade} · {selected.school ?? "부트캠프"}{" "}
            {selected.phone && (
              <span style={{ color: "var(--text-dim)" }}>· {selected.phone}</span>
            )}
          </div>
          <div className={styles.stuProfileTags}>
            {selected.tags.map((t) => (
              <span key={t.label} className={styles.stuTag}>
                {t.label}
              </span>
            ))}
            {selected.mainIssue && (
              <span className={styles.stuTagIssue}>{selected.mainIssue}</span>
            )}
          </div>
        </div>
        <div className={styles.stuProfileActions}>
          <button className={styles.stuActionBtn}>수정</button>
          <button className={styles.stuActionBtn}>상담 기록</button>
        </div>
      </div>

      {/* ── 통계 카드 ── */}
      <div className={styles.stuStats}>
        <StatCard label="총 상담" value={String(selected.counseling)} accent />
        <StatCard label="이번 달" value={String(selected.thisMonth)} />
        <StatCard label="메모" value={String(selected.memos.length)} />
        <StatCard label="최근 상담" value={selected.lastDate} mono />
      </div>

      {/* ── 탭 바 ── */}
      <div className={styles.stuTabBar}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`${styles.stuTabBtn} ${activeTab === tab.id ? styles.stuTabBtnActive : ""}`}
            onClick={() => onSetTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 탭 컨텐츠 ── */}
      <div className={styles.stuTabContent}>
        {activeTab === "overview" && <OverviewTab student={selected} />}
        {activeTab === "counseling" && <CounselingTab student={selected} />}
        {activeTab === "memos" && (
          <MemosTab
            student={selected}
            memoInput={memoInput}
            onMemoInputChange={onMemoInputChange}
            onAddMemo={onAddMemo}
          />
        )}
      </div>
    </div>
  );
}

/* ── 통계 카드 ── */

function StatCard({
  label,
  value,
  accent,
  mono,
}: {
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className={styles.stuStatCard}>
      <div className={styles.stuStatLabel}>{label}</div>
      <div
        className={styles.stuStatValue}
        style={{
          color: accent ? "var(--accent)" : undefined,
          fontFamily: mono ? '"JetBrains Mono", monospace' : undefined,
        }}
      >
        {value}
      </div>
    </div>
  );
}

/* ── 개요 탭 ── */

function OverviewTab({ student }: { student: Student }) {
  return (
    <>
      {/* AI 분석 */}
      <div className={styles.stuSection}>
        <div className={styles.stuSectionTitle}>
          <AiIcon size={14} />
          AI 분석 리포트
        </div>
        <div
          className={styles.stuAiCard}
          dangerouslySetInnerHTML={{ __html: student.aiReport }}
        />
      </div>

      {/* 최근 상담 */}
      <div className={styles.stuSection}>
        <div className={styles.stuSectionTitle}>최근 상담</div>
        {student.history.slice(0, 3).map((h, i) => (
          <div key={i} className={styles.stuHistoryItem}>
            <div className={styles.stuHistoryDate}>{h.date}</div>
            <div className={styles.stuHistoryBody}>
              <div className={styles.stuHistoryTitle}>{h.title}</div>
              <div className={styles.stuHistorySummary}>{h.summary}</div>
            </div>
            <span className={styles.stuHistoryType}>{h.type}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/* ── 상담 기록 탭 ── */

function CounselingTab({ student }: { student: Student }) {
  return (
    <div className={styles.stuSection}>
      <div className={styles.stuSectionTitle}>
        전체 상담 기록 ({student.history.length}건)
      </div>
      {student.history.map((h, i) => (
        <div key={i} className={styles.stuHistoryItem}>
          <div className={styles.stuHistoryDate}>{h.date}</div>
          <div className={styles.stuHistoryBody}>
            <div className={styles.stuHistoryTitle}>{h.title}</div>
            <div className={styles.stuHistorySummary}>{h.summary}</div>
          </div>
          <span className={styles.stuHistoryType}>{h.type}</span>
        </div>
      ))}
      {student.history.length === 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
          아직 상담 기록이 없습니다
        </div>
      )}
    </div>
  );
}

/* ── 메모 탭 ── */

function MemosTab({
  student,
  memoInput,
  onMemoInputChange,
  onAddMemo,
}: {
  student: Student;
  memoInput: string;
  onMemoInputChange: (v: string) => void;
  onAddMemo: () => void;
}) {
  return (
    <div className={styles.stuSection}>
      {/* 메모 입력 */}
      <div className={styles.stuMemoInput}>
        <textarea
          className={styles.stuMemoTextarea}
          placeholder="메모를 입력하세요…"
          value={memoInput}
          onChange={(e) => onMemoInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onAddMemo();
            }
          }}
          rows={2}
        />
        <button
          className={styles.stuMemoSubmit}
          disabled={!memoInput.trim()}
          onClick={onAddMemo}
        >
          추가
        </button>
      </div>

      {/* 메모 리스트 */}
      <div className={styles.stuSectionTitle}>
        메모 ({student.memos.length}건)
      </div>
      {student.memos.map((m) => (
        <div key={m.id} className={styles.stuMemoItem}>
          <div className={styles.stuMemoDate}>{m.date}</div>
          <div className={styles.stuMemoText}>{m.text}</div>
        </div>
      ))}
      {student.memos.length === 0 && (
        <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "24px 0", textAlign: "center" }}>
          아직 메모가 없습니다
        </div>
      )}
    </div>
  );
}

/* ── 아이콘 ── */

function StudentIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function AiIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a4 4 0 0 0-4 4v2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-2V6a4 4 0 0 0-4-4Z" />
      <circle cx="9" cy="13" r="1" />
      <circle cx="15" cy="13" r="1" />
    </svg>
  );
}
