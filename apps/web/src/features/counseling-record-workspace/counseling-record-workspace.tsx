"use client";

import { useMemo, useCallback } from "react";
import { CheckCheck, FileAudio, LogOut } from "lucide-react";

import styles from "./counseling-record-workspace.module.css";
import { buildStatusMeta } from "./constants";
import { buildQuickPrompts } from "./utils";
import {
  useSaveToast,
  useRecordingMachine,
  useRecordList,
  useRecordDetail,
  useAudioPlayer,
  useUploadForm,
  useAssistantChat,
  useTranscriptEditor,
  useExport,
  useTrendAnalysis,
  useDeleteRecord,
} from "./hooks";
import {
  EmptyLanding,
  RecordSidebar,
  RecordDetailHeader,
  TranscriptViewer,
  AssistantPanel,
  UploadPanel,
  StudentTimeline,
} from "./components";

export function CounselingRecordWorkspace() {
  const statusMeta = useMemo(() => buildStatusMeta(styles), []);

  // ── hooks (의존 순서대로) ──
  const toast = useSaveToast();
  const recording = useRecordingMachine();
  const recordList = useRecordList();

  const detail = useRecordDetail(
    recordList.selectedRecordId,
    recordList.selectedRecord,
    recordList.setRecords,
  );

  const audioPlayer = useAudioPlayer(
    recordList.selectedRecordId,
    detail.selectedRecordDetail?.audioUrl,
  );

  const uploadForm = useUploadForm({
    onRecordCreated: (record) => {
      recordList.setRecords((current) =>
        recordList.upsertRecordList(current, record),
      );
      recordList.setSelectedRecordId(record.id);
      detail.setRecordDetails((current) => ({
        ...current,
        [record.id]: record,
      }));
    },
    setSaveToast: toast.setSaveToast,
    setRecentlySavedId: toast.setRecentlySavedId,
    recordingPhase: recording.recordingPhase,
  });

  const assistantChat = useAssistantChat(
    recordList.selectedRecord,
    detail.selectedRecordDetail,
    statusMeta,
  );

  const transcriptEditor = useTranscriptEditor(
    recordList.selectedRecord,
    detail.setRecordDetails,
    toast.setSaveToast,
  );

  const exportHook = useExport(
    recordList.selectedRecord,
    detail.selectedRecordDetail,
    assistantChat.assistantMessagesByRecord,
    toast.setSaveToast,
  );

  const trendAnalysis = useTrendAnalysis(
    recordList.setSelectedRecordId,
    toast.setSaveToast,
  );

  const deleteRecord = useDeleteRecord(
    recordList.selectedRecord,
    recordList.setRecords,
    recordList.setSelectedRecordId,
    toast.setSaveToast,
    detail.setRecordDetails,
    assistantChat.setAssistantMessagesByRecord,
  );

  // ── 파생 값 ──
  const { selectedRecord } = recordList;

  const quickPrompts = useMemo(
    () => (selectedRecord ? buildQuickPrompts(selectedRecord) : []),
    [selectedRecord],
  );

  const transcriptMatchCount = transcriptEditor.computeTranscriptMatchCount(
    detail.selectedRecordDetail,
  );

  // ── 녹음 콜백 (startRecording에 onAudioReady, onOpenUploadPanel 전달) ──
  const handleStartRecording = useCallback(() => {
    recording.startRecording(uploadForm.applySelectedAudioFile, () =>
      uploadForm.setIsUploadPanelOpen(true),
    );
  }, [
    recording.startRecording,
    uploadForm.applySelectedAudioFile,
    uploadForm.setIsUploadPanelOpen,
  ]);

  const handleNewRecord = useCallback(() => {
    recordList.setSelectedRecordId(null);
    uploadForm.setIsUploadPanelOpen(true);
  }, [recordList.setSelectedRecordId, uploadForm.setIsUploadPanelOpen]);

  // ── 레이아웃 ──
  return (
    <main className={styles.page}>
      {toast.saveToast ? (
        <div
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] inline-flex items-center gap-2 px-5 py-[10px] rounded-full text-white text-sm font-semibold shadow-[0_8px_32px_rgba(0,0,0,0.16)]"
          style={{
            background: "var(--success-text)",
            animation: "toastSlideIn 0.3s ease",
          }}
          role="status"
        >
          <CheckCheck size={16} strokeWidth={2.2} />
          {toast.saveToast}
        </div>
      ) : null}

      <div className="w-[min(1920px,100%)] min-h-[calc(100vh-32px)] mx-auto grid grid-rows-[auto_minmax(0,1fr)] gap-3">
        {/* 슬림 헤더 */}
        <header className="flex items-start justify-between gap-4 pt-4 px-1">
          <div className="grid gap-[6px] min-w-0">
            <p
              className="m-0 text-xs font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              YEON
            </p>
            <h1
              className="m-0 font-bold leading-none tracking-[-0.05em]"
              style={{ fontSize: "clamp(28px, 3vw, 36px)" }}
            >
              상담 기록 워크스페이스
            </h1>
            <p
              className="m-0 max-w-[42ch] text-sm leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              업로드부터 원문 확인까지 한 화면에서 정리합니다.
            </p>
          </div>
          <form
            action="/api/auth/logout"
            method="post"
            className="flex flex-shrink-0"
          >
            <button
              type="submit"
              className="inline-flex items-center gap-[6px] min-h-9 px-3 border rounded-[10px] bg-transparent text-[13px] font-semibold cursor-pointer transition-[background-color,border-color] duration-[180ms]"
              style={{
                borderColor: "var(--border-soft)",
                color: "var(--text-secondary)",
              }}
            >
              <LogOut size={15} strokeWidth={2.1} />
              로그아웃
            </button>
          </form>
        </header>

        {/* 초기 목록 로딩 중에는 빈 화면 유지 (EmptyLanding 깜빡임 방지) */}
        {recordList.isLoadingList && recordList.records.length === 0 ? (
          <div className={styles.workspace} />
        ) : recordList.records.length === 0 ? (
          uploadForm.isUploadPanelOpen ? (
            <div className={styles.workspace}>
              <section className={`${styles.centerColumn} col-[2_/_-1]`}>
                <UploadPanel
                  isUploadPanelOpen={uploadForm.isUploadPanelOpen}
                  setIsUploadPanelOpen={uploadForm.setIsUploadPanelOpen}
                  formState={uploadForm.formState}
                  updateFormState={uploadForm.updateFormState}
                  uploadState={uploadForm.uploadState}
                  selectedAudioFile={uploadForm.selectedAudioFile}
                  selectedAudioDurationMs={uploadForm.selectedAudioDurationMs}
                  selectedAudioPreviewUrl={uploadForm.selectedAudioPreviewUrl}
                  hasAudioReady={uploadForm.hasAudioReady}
                  isAdditionalInfoOpen={uploadForm.isAdditionalInfoOpen}
                  setIsAdditionalInfoOpen={uploadForm.setIsAdditionalInfoOpen}
                  recordingPhase={recording.recordingPhase}
                  recordingElapsedMs={recording.recordingElapsedMs}
                  recordingError={recording.recordingError}
                  fileInputRef={uploadForm.fileInputRef}
                  onStartRecording={handleStartRecording}
                  onStopRecording={recording.stopRecording}
                  onCancelRecording={recording.cancelRecording}
                  handleUploadSubmit={uploadForm.handleUploadSubmit}
                />
              </section>
            </div>
          ) : (
            <EmptyLanding
              recordingPhase={recording.recordingPhase}
              hasAudioReady={uploadForm.hasAudioReady}
              selectedAudioFile={uploadForm.selectedAudioFile}
              selectedAudioDurationMs={uploadForm.selectedAudioDurationMs}
              selectedAudioPreviewUrl={uploadForm.selectedAudioPreviewUrl}
              recordingElapsedMs={recording.recordingElapsedMs}
              recordingError={recording.recordingError}
              fileInputRef={uploadForm.fileInputRef}
              handleAudioFileChange={uploadForm.handleAudioFileChange}
              onFileInputClick={() => uploadForm.fileInputRef.current?.click()}
              onStartRecording={handleStartRecording}
              onStopRecording={recording.stopRecording}
              onCancelRecording={recording.cancelRecording}
              onGoToUploadPanel={handleNewRecord}
            />
          )
        ) : (
          <div className={styles.workspace}>
            {/* 좌측 사이드바 */}
            <RecordSidebar
              records={recordList.records}
              filteredRecords={recordList.filteredRecords}
              selectedRecord={selectedRecord}
              recentlySavedId={toast.recentlySavedId}
              searchTerm={recordList.searchTerm}
              setSearchTerm={recordList.setSearchTerm}
              recordFilter={recordList.recordFilter}
              setRecordFilter={recordList.setRecordFilter}
              sidebarViewMode={recordList.sidebarViewMode}
              setSidebarViewMode={recordList.setSidebarViewMode}
              expandedStudents={recordList.expandedStudents}
              setExpandedStudents={recordList.setExpandedStudents}
              selectedStudentName={recordList.selectedStudentName}
              setSelectedStudentName={recordList.setSelectedStudentName}
              isFilterOpen={recordList.isFilterOpen}
              setIsFilterOpen={recordList.setIsFilterOpen}
              isLoadingList={recordList.isLoadingList}
              loadError={recordList.loadError}
              studentGroups={recordList.studentGroups}
              statusMeta={statusMeta}
              fileInputRef={uploadForm.fileInputRef}
              handleAudioFileChange={uploadForm.handleAudioFileChange}
              handleSelectRecord={recordList.handleSelectRecord}
              onNewRecord={handleNewRecord}
            />

            {/* 메인 콘텐츠 영역 */}
            {selectedRecord ? (
              <>
                <section className={styles.centerColumn}>
                  <RecordDetailHeader
                    selectedRecord={selectedRecord}
                    selectedRecordDetail={detail.selectedRecordDetail}
                    statusMeta={statusMeta}
                    isDeleteConfirmOpen={deleteRecord.isDeleteConfirmOpen}
                    setIsDeleteConfirmOpen={deleteRecord.setIsDeleteConfirmOpen}
                    isDeleting={deleteRecord.isDeleting}
                    handleDeleteRecord={deleteRecord.handleDeleteRecord}
                    isDetailMetaOpen={detail.isDetailMetaOpen}
                    setIsDetailMetaOpen={detail.setIsDetailMetaOpen}
                    retryState={detail.retryState}
                    audioPlayerRef={audioPlayer.audioPlayerRef}
                    audioLoadError={audioPlayer.audioLoadError}
                    setAudioLoadError={audioPlayer.setAudioLoadError}
                    handleAudioTimeUpdate={audioPlayer.handleAudioTimeUpdate}
                    refreshRecordDetail={(id) => detail.refreshRecordDetail(id)}
                    retryTranscription={(id) => detail.retryTranscription(id)}
                    retryAnalysis={(id) => detail.retryAnalysis(id)}
                  />

                  <TranscriptViewer
                    selectedRecord={selectedRecord}
                    selectedRecordDetail={detail.selectedRecordDetail}
                    isLoadingDetail={detail.isLoadingDetail}
                    transcriptQuery={transcriptEditor.transcriptQuery}
                    setTranscriptQuery={transcriptEditor.setTranscriptQuery}
                    normalizedTranscriptQuery={
                      transcriptEditor.normalizedTranscriptQuery
                    }
                    transcriptMatchCount={transcriptMatchCount}
                    isAutoScrollEnabled={audioPlayer.isAutoScrollEnabled}
                    setIsAutoScrollEnabled={audioPlayer.setIsAutoScrollEnabled}
                    handleExportClipboard={exportHook.handleExportClipboard}
                    editingSegmentId={transcriptEditor.editingSegmentId}
                    editingSegmentText={transcriptEditor.editingSegmentText}
                    setEditingSegmentText={
                      transcriptEditor.setEditingSegmentText
                    }
                    editingSegmentSaving={transcriptEditor.editingSegmentSaving}
                    startEditingSegment={transcriptEditor.startEditingSegment}
                    cancelEditingSegment={transcriptEditor.cancelEditingSegment}
                    saveEditingSegment={transcriptEditor.saveEditingSegment}
                    handleSpeakerLabelChange={
                      transcriptEditor.handleSpeakerLabelChange
                    }
                    currentAudioTimeMs={audioPlayer.currentAudioTimeMs}
                    activeSegmentRef={audioPlayer.activeSegmentRef}
                    seekAudioToTime={audioPlayer.seekAudioToTime}
                  />
                </section>

                <AssistantPanel
                  selectedRecord={selectedRecord}
                  statusMeta={statusMeta}
                  assistantMessages={assistantChat.assistantMessages}
                  assistantDraft={assistantChat.assistantDraft}
                  setAssistantDraft={assistantChat.setAssistantDraft}
                  isAiStreaming={assistantChat.isAiStreaming}
                  quickPrompts={quickPrompts}
                  appendAssistantExchange={
                    assistantChat.appendAssistantExchange
                  }
                  handleStopStreaming={assistantChat.handleStopStreaming}
                  messageListRef={assistantChat.messageListRef}
                  isAiExportOpen={exportHook.isAiExportOpen}
                  setIsAiExportOpen={exportHook.setIsAiExportOpen}
                  exportDropdownRef={exportHook.exportDropdownRef}
                  handleAiExportClipboard={exportHook.handleAiExportClipboard}
                  handleAiExportTextFile={exportHook.handleAiExportTextFile}
                  handleComprehensiveReportClipboard={
                    exportHook.handleComprehensiveReportClipboard
                  }
                  handleComprehensiveReportTextFile={
                    exportHook.handleComprehensiveReportTextFile
                  }
                />
              </>
            ) : (
              <section className={`${styles.centerColumn} col-[2_/_-1]`}>
                {uploadForm.isUploadPanelOpen ? (
                  <UploadPanel
                    isUploadPanelOpen={uploadForm.isUploadPanelOpen}
                    setIsUploadPanelOpen={uploadForm.setIsUploadPanelOpen}
                    formState={uploadForm.formState}
                    updateFormState={uploadForm.updateFormState}
                    uploadState={uploadForm.uploadState}
                    selectedAudioFile={uploadForm.selectedAudioFile}
                    selectedAudioDurationMs={uploadForm.selectedAudioDurationMs}
                    selectedAudioPreviewUrl={uploadForm.selectedAudioPreviewUrl}
                    hasAudioReady={uploadForm.hasAudioReady}
                    isAdditionalInfoOpen={uploadForm.isAdditionalInfoOpen}
                    setIsAdditionalInfoOpen={uploadForm.setIsAdditionalInfoOpen}
                    recordingPhase={recording.recordingPhase}
                    recordingElapsedMs={recording.recordingElapsedMs}
                    recordingError={recording.recordingError}
                    fileInputRef={uploadForm.fileInputRef}
                    onStartRecording={handleStartRecording}
                    onStopRecording={recording.stopRecording}
                    onCancelRecording={recording.cancelRecording}
                    handleUploadSubmit={uploadForm.handleUploadSubmit}
                  />
                ) : recordList.sidebarViewMode === "student" &&
                  recordList.selectedStudentName ? (
                  <StudentTimeline
                    selectedStudentName={recordList.selectedStudentName}
                    filteredRecords={recordList.filteredRecords}
                    statusMeta={statusMeta}
                    handleSelectRecord={recordList.handleSelectRecord}
                    trendAnalysis={trendAnalysis.trendAnalysis}
                    handleStartTrendAnalysis={
                      trendAnalysis.handleStartTrendAnalysis
                    }
                    handleStopTrendAnalysis={
                      trendAnalysis.handleStopTrendAnalysis
                    }
                    setSaveToast={toast.setSaveToast}
                  />
                ) : (
                  <div className="grid gap-[10px] place-items-center content-center text-center max-w-[380px] mx-auto min-h-[320px] justify-items-center">
                    <div
                      className="inline-flex items-center justify-center w-14 h-14 rounded-[10px] mb-1"
                      style={{
                        background: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      <FileAudio size={32} strokeWidth={1.5} />
                    </div>
                    <h2 className="m-0 text-xl font-bold tracking-[-0.02em]">
                      {recordList.records.length === 0
                        ? "첫 기록을 만들어 보세요"
                        : "기록을 선택하세요"}
                    </h2>
                    <p
                      className="m-0 text-sm leading-relaxed"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {recordList.records.length === 0
                        ? "왼쪽 상단의 새 기록 버튼으로 시작합니다."
                        : "왼쪽 목록에서 기록을 선택하면 원문을 바로 열 수 있습니다."}
                    </p>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
