"use client";

import styles from "../mockdata/mockdata.module.css";
import {
  useRecords,
  useRecording,
  useFileUpload,
  useAudioPlayer,
  useAiChat,
  useAiPanel,
  useWorkspaceNav,
  useTasks,
  useTaskFilters,
  useTaskForm,
  useReports,
  useReportPreview,
  useReportEditor,
  useStudentView,
} from "./_hooks";
import {
  TopNav,
  Gnav,
  EmptyState,
  RecordingState,
  Sidebar,
  CenterPanel,
  AiPanel,
  TaskSidebar,
  TaskCenterPanel,
  ReportSidebar,
  ReportCenterPanel,
  ReportPreviewOverlay,
  StudentSidebar,
  StudentCenterPanel,
} from "./_components";
import { STUDENTS } from "../mockdata/app/_data/mock-data";

export default function MockV2Workspace() {
  /* ── 워크스페이스 네비게이션 ── */
  const nav = useWorkspaceNav();

  /* ── 상담 기록 훅 ── */
  const records = useRecords();

  const recording = useRecording({
    onRecordingStop: (rec) => records.addProcessingRecord(rec),
  });

  const fileUpload = useFileUpload({
    onFileUpload: (rec) => records.addProcessingRecord(rec),
  });

  const audio = useAudioPlayer();

  const aiChat = useAiChat({
    selectedId: records.selectedId,
    selectedMessages: records.selected?.aiMessages ?? [],
    isProcessing: records.phase === "processing",
    onUpdateMessages: records.updateMessages,
  });

  const aiPanel = useAiPanel();

  /* ── 후속 조치 훅 ── */
  const tasks = useTasks();
  const taskFilters = useTaskFilters();
  const taskForm = useTaskForm();

  /* ── 학생 관리 훅 ── */
  const studentView = useStudentView();

  /* ── 보호자 리포트 훅 ── */
  const reportState = useReports();
  const reportPreview = useReportPreview();
  const reportEditor = useReportEditor();

  /* ── 상담 기록 핸들러 ── */
  const handleSelectRecord = (id: string) => {
    records.selectRecord(id);
    audio.reset();
  };

  const handleStartRecording = () => {
    records.setPhase("recording");
    recording.start();
  };

  /* ── 후속 조치: 수동 추가 핸들러 ── */
  const handleAddTask = () => {
    if (!taskForm.form.description || !taskForm.form.studentId) return;
    tasks.addTask({
      description: taskForm.form.description,
      studentId: taskForm.form.studentId,
      studentName: taskForm.form.studentName,
      dueDate: taskForm.form.dueDate,
      status: "pending",
      priority: taskForm.form.priority,
      sourceRecordId: "",
      sourceRecordTitle: "수동 등록",
      isAiGenerated: false,
    });
    taskForm.close();
  };

  /* ── 렌더 ── */
  const filteredTasks = taskFilters.applyFilters(tasks.tasks);

  /* 미리보기 대상 리포트 */
  const previewReport = reportPreview.previewReportId
    ? reportState.reports.find((r) => r.id === reportPreview.previewReportId) ?? null
    : null;

  return (
    <div
      className={styles.appShell}
      style={{ flexDirection: "column" }}
      onDragEnter={nav.activeMenu === "records" ? fileUpload.handleDragEnter : undefined}
      onDragLeave={nav.activeMenu === "records" ? fileUpload.handleDragLeave : undefined}
      onDragOver={nav.activeMenu === "records" ? fileUpload.handleDragOver : undefined}
      onDrop={nav.activeMenu === "records" ? fileUpload.handleDrop : undefined}
    >
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileUpload.fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: "none" }}
        onChange={fileUpload.handleInputChange}
      />

      {/* 드래그 앤 드롭 오버레이 */}
      {nav.activeMenu === "records" && fileUpload.isDragging && (
        <div className={styles.dropOverlay}>
          <div className={styles.dropBox}>
            <div className={styles.dropBoxIcon}>📁</div>
            <div className={styles.dropBoxTitle}>녹음 파일을 놓으세요</div>
            <div className={styles.dropBoxDesc}>
              오디오 파일을 드롭하면 자동으로 전사를 시작합니다
            </div>
          </div>
        </div>
      )}

      <TopNav activeMenu={nav.activeMenu} />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Gnav activeMenu={nav.activeMenu} onMenuChange={nav.setActiveMenu} />

        {/* ═══ 상담 기록 뷰 ═══ */}
        {nav.activeMenu === "records" && (
          <>
            {records.phase === "empty" && (
              <EmptyState
                onStartRecording={handleStartRecording}
                onFileUpload={fileUpload.openFilePicker}
              />
            )}

            {records.phase === "recording" && (
              <RecordingState
                elapsed={recording.elapsed}
                onStop={recording.stop}
              />
            )}

            {(records.phase === "processing" || records.phase === "ready") && (
              <>
                <Sidebar
                  records={records.records}
                  selectedId={records.selectedId}
                  onSelect={handleSelectRecord}
                  onStartRecording={handleStartRecording}
                  onFileUpload={fileUpload.openFilePicker}
                />

                <CenterPanel
                  phase={records.phase}
                  selected={records.selected}
                  processingStep={records.processingStep}
                  isPlaying={audio.isPlaying}
                  audioPosition={audio.position}
                  totalSeconds={audio.totalSeconds}
                  onTogglePlay={audio.toggle}
                  onSeek={audio.seek}
                />

                <AiPanel
                  width={aiPanel.width}
                  collapsed={aiPanel.collapsed}
                  tab={aiPanel.tab}
                  panelRef={aiPanel.panelRef}
                  model={aiPanel.model}
                  onSetTab={aiPanel.setTab}
                  onToggleCollapsed={aiPanel.toggleCollapsed}
                  onExpand={aiPanel.expand}
                  onToggleModel={aiPanel.toggleModel}
                  onStartResize={aiPanel.startResize}
                  phase={records.phase}
                  selected={records.selected}
                  selectedId={records.selectedId}
                  onClearMessages={records.clearMessages}
                  aiInput={aiChat.input}
                  onAiInputChange={aiChat.setInput}
                  onSend={aiChat.send}
                  onSendQuickChip={aiChat.sendQuickChip}
                  canSend={aiChat.canSend}
                  endRef={aiChat.endRef}
                  textareaRef={aiChat.textareaRef}
                  images={aiChat.images}
                  onAddImages={aiChat.addImages}
                  onRemoveImage={aiChat.removeImage}
                  imageInputRef={aiChat.imageInputRef}
                />
              </>
            )}
          </>
        )}

        {/* ═══ 학생 관리 뷰 ═══ */}
        {nav.activeMenu === "students" && (
          <>
            <StudentSidebar
              students={studentView.students}
              selectedId={studentView.selectedId}
              search={studentView.search}
              statusFilter={studentView.statusFilter}
              onSelect={studentView.selectStudent}
              onSearchChange={studentView.setSearch}
              onStatusFilter={studentView.setStatusFilter}
            />
            <StudentCenterPanel
              selected={studentView.selected}
              activeTab={studentView.activeTab}
              memoInput={studentView.memoInput}
              onSetTab={studentView.setActiveTab}
              onMemoInputChange={studentView.setMemoInput}
              onAddMemo={studentView.addMemo}
            />
          </>
        )}

        {/* ═══ 후속 조치 뷰 ═══ */}
        {nav.activeMenu === "tasks" && (
          <>
            <TaskSidebar
              tasks={filteredTasks}
              selectedId={tasks.selectedId}
              statusFilter={taskFilters.statusFilter}
              studentFilter={taskFilters.studentFilter}
              onSelect={tasks.selectTask}
              onStatusFilter={taskFilters.setStatusFilter}
              onStudentFilter={taskFilters.setStudentFilter}
              onOpenForm={taskForm.open}
            />
            <TaskCenterPanel
              stats={tasks.stats}
              selected={tasks.selected}
              onUpdateStatus={tasks.updateStatus}
              onDelete={tasks.deleteTask}
              onDeselect={() => tasks.selectTask(null)}
            />
          </>
        )}

        {/* ═══ 보호자 리포트 뷰 ═══ */}
        {nav.activeMenu === "reports" && (
          <>
            <ReportSidebar
              selectedStudentId={reportState.selectedStudentId}
              reports={reportState.reports}
              onSelectStudent={reportState.selectStudent}
            />
            <ReportCenterPanel
              selectedStudentId={reportState.selectedStudentId}
              studentReports={reportState.studentReports}
              isGenerating={reportState.isGenerating}
              editingIndex={reportEditor.editingIndex}
              editBuffer={reportEditor.editBuffer}
              onStartEdit={reportEditor.startEdit}
              onCancelEdit={reportEditor.cancelEdit}
              onEditBuffer={reportEditor.setEditBuffer}
              onGenerate={reportState.generateReport}
              onUpdateSection={reportState.updateSection}
              onMarkAsSent={reportState.markAsSent}
              onOpenPreview={reportPreview.openPreview}
            />
          </>
        )}
      </div>

      {/* 태스크 추가 모달 */}
      {taskForm.isOpen && (
        <TaskFormModal
          form={taskForm.form}
          onSetField={taskForm.setField}
          onSubmit={handleAddTask}
          onClose={taskForm.close}
        />
      )}

      {/* 리포트 미리보기 오버레이 */}
      {previewReport && (
        <ReportPreviewOverlay
          report={previewReport}
          onClose={reportPreview.closePreview}
        />
      )}
    </div>
  );
}

/* ── 태스크 추가 모달 ── */

function TaskFormModal({
  form,
  onSetField,
  onSubmit,
  onClose,
}: {
  form: {
    description: string;
    studentId: string;
    studentName: string;
    dueDate: string;
    priority: "high" | "medium" | "low";
  };
  onSetField: <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          background: "var(--surface2)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: 24,
        }}
      >
        <h3 style={{ margin: "0 0 20px", fontSize: 16, fontWeight: 600 }}>
          조치 수동 추가
        </h3>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* 설명 */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
              조치 내용
            </label>
            <textarea
              value={form.description}
              onChange={(e) => onSetField("description", e.target.value)}
              placeholder="후속 조치 내용을 입력하세요"
              style={{
                width: "100%",
                minHeight: 60,
                padding: 10,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "inherit",
                resize: "vertical",
              }}
            />
          </div>

          {/* 학생 */}
          <div>
            <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
              학생
            </label>
            <select
              value={form.studentId}
              onChange={(e) => {
                const student = STUDENTS.find((s) => s.id === e.target.value);
                onSetField("studentId", e.target.value);
                onSetField("studentName", student?.name ?? "");
              }}
              style={{
                width: "100%",
                padding: "8px 10px",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                fontSize: 14,
                fontFamily: "inherit",
              }}
            >
              <option value="">학생 선택</option>
              {STUDENTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.grade})
                </option>
              ))}
            </select>
          </div>

          {/* 마감일 + 우선순위 */}
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                마감일
              </label>
              <input
                type="text"
                value={form.dueDate}
                onChange={(e) => onSetField("dueDate", e.target.value)}
                placeholder="2026.04.16"
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, color: "var(--text-dim)", display: "block", marginBottom: 4 }}>
                우선순위
              </label>
              <select
                value={form.priority}
                onChange={(e) => onSetField("priority", e.target.value as "high" | "medium" | "low")}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border)",
                  background: "var(--surface)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                <option value="high">긴급</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
          </div>
        </div>

        {/* 버튼 */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 20px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-secondary)",
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={!form.description || !form.studentId}
            style={{
              padding: "8px 20px",
              borderRadius: "var(--radius-sm)",
              border: "none",
              background:
                form.description && form.studentId
                  ? "var(--accent)"
                  : "var(--surface3)",
              color:
                form.description && form.studentId
                  ? "#fff"
                  : "var(--text-dim)",
              fontSize: 13,
              fontWeight: 600,
              cursor:
                form.description && form.studentId ? "pointer" : "default",
              fontFamily: "inherit",
            }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  );
}
