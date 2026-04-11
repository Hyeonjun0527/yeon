"use client";

import { useState, useCallback, useEffect } from "react";
import {
  useRecords,
  useRecording,
  useFileUpload,
  useAudioPlayer,
  useAiChat,
  useAiPanel,
  useCurrentSpace,
  useSpaceMembers,
} from "./_hooks";
import { useExport } from "./_lib/export-context";
import { exportRecordDocx, exportMemberReportDocx } from "./_lib/export-docx";
import {
  EmptyState,
  RecordingState,
  Sidebar,
  CenterPanel,
  AiPanel,
  LinkMemberModal,
  MemberPanel,
  QuickMemoModal,
  InsightBanner,
} from "./_components";
import { HomeTutorial } from "@/components/tutorial";

export default function MockV2Workspace() {
  const records = useRecords();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  // 모달 열림 시점의 recordId를 캡처 — async 완료 전에 selected가 바뀌어도 안전
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null);
  const [quickMemoOpen, setQuickMemoOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const { spaces, currentSpace, currentSpaceId, setCurrentSpaceId, addSpace } =
    useCurrentSpace();
  const { members, loading: membersLoading } = useSpaceMembers(
    currentSpaceId,
    records.records,
  );

  const recording = useRecording({
    onRecordingStop: (tempRecord) => records.addProcessingRecord(tempRecord),
    onUploadComplete: (tempId, realRecord) =>
      records.replaceRecord(tempId, realRecord),
    onUploadError: (tempId, msg) => records.markUploadError(tempId, msg),
  });

  const fileUpload = useFileUpload({
    onFileUpload: (rec) => records.addProcessingRecord(rec),
  });

  const selectedAudioUrl = records.selected?.audioUrl ?? null;
  const selectedTotalSeconds = Math.round(
    (records.selected?.durationMs ?? 0) / 1000,
  );
  const audio = useAudioPlayer(selectedAudioUrl, selectedTotalSeconds);

  const aiChat = useAiChat({
    selectedId: records.selectedId,
    selectedMessages: records.selected?.aiMessages || [],
    selectedStatus: records.selected?.status ?? null,
    selectedAnalysisResult: records.selected?.analysisResult ?? null,
    onUpdateMessages: records.updateMessages,
    onUpdateAnalysisResult: records.updateAnalysisResult,
  });

  const aiPanel = useAiPanel();

  const { register } = useExport();

  const handleSelectRecord = useCallback(
    (id: string) => {
      setSelectedMemberId(null);
      records.selectRecord(id);
      audio.reset();
    },
    [records, audio],
  );

  const handleSelectMember = useCallback((id: string) => {
    setSelectedMemberId((prev) => (prev === id ? null : id));
  }, []);

  const handleStartRecording = useCallback(() => {
    setSelectedMemberId(null);
    records.startRecording();
    recording.start();
  }, [records, recording]);

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;

  /* 멤버가 선택되면 레코드 선택 해제 */
  const showMemberPanel =
    selectedMember !== null &&
    records.viewState.kind !== "recording" &&
    records.viewState.kind !== "empty" &&
    records.viewState.kind !== "loading";
  const showCenterPanel =
    !showMemberPanel &&
    (records.viewState.kind === "processing" ||
      records.viewState.kind === "ready");

  useEffect(() => {
    if (showMemberPanel && selectedMember) {
      register(() => exportMemberReportDocx(selectedMember, records.records));
    } else if (records.selected?.status === "ready") {
      const sel = records.selected;
      register(() => exportRecordDocx(sel));
    } else {
      register(null);
    }
  }, [
    showMemberPanel,
    selectedMember,
    records.selected,
    records.records,
    register,
  ]);

  return (
    <div
      className="flex flex-1 overflow-hidden relative"
      onDragEnter={fileUpload.handleDragEnter}
      onDragLeave={fileUpload.handleDragLeave}
      onDragOver={fileUpload.handleDragOver}
      onDrop={fileUpload.handleDrop}
    >
      <input
        ref={fileUpload.fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={fileUpload.handleInputChange}
      />

      {fileUpload.isDragging && (
        <div className="fixed inset-0 z-[200] bg-[rgba(9,9,11,0.8)] flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-accent rounded-lg p-12 px-16 text-center bg-[rgba(129,140,248,0.06)]">
            <div className="text-5xl mb-3">📁</div>
            <div className="text-lg font-semibold text-text mb-1">
              녹음 파일을 놓으세요
            </div>
            <div className="text-sm text-text-secondary">
              오디오 파일을 드롭하면 자동으로 전사를 시작합니다
            </div>
          </div>
        </div>
      )}

      {records.viewState.kind === "empty" && !selectedMember && (
        <EmptyState
          onStartRecording={handleStartRecording}
          onFileUpload={fileUpload.openFilePicker}
        />
      )}

      {records.viewState.kind === "recording" && (
        <RecordingState elapsed={recording.elapsed} onStop={recording.stop} />
      )}

      {(records.viewState.kind === "processing" ||
        records.viewState.kind === "ready" ||
        showMemberPanel) && (
        <Sidebar
          records={records.records}
          selectedId={records.selectedId}
          onSelect={handleSelectRecord}
          onStartRecording={handleStartRecording}
          onFileUpload={fileUpload.openFilePicker}
          spaces={spaces}
          currentSpace={currentSpace}
          onSpaceChange={setCurrentSpaceId}
          onSpaceCreated={addSpace}
          members={members}
          membersLoading={membersLoading}
          selectedMemberId={selectedMemberId}
          onSelectMember={handleSelectMember}
          onOpenQuickMemo={() => setQuickMemoOpen(true)}
        />
      )}

      {showMemberPanel && selectedMember && (
        <div className="flex flex-1 overflow-hidden">
          <MemberPanel
            member={selectedMember}
            records={records.records}
            onSelectRecord={handleSelectRecord}
            onStartRecording={handleStartRecording}
          />
        </div>
      )}

      {showCenterPanel && (
        <div className="flex flex-col flex-1 overflow-hidden">
          <InsightBanner
            members={members}
            onHighlightWarning={() => {
              const target =
                members.find((m) => m.indicator === "warning") ??
                members.find((m) => m.indicator === "none");
              if (target) handleSelectMember(target.id);
            }}
          />
          <div className="flex flex-1 overflow-hidden">
            <CenterPanel
              phase={records.viewState.kind as "processing" | "ready"}
              selected={records.selected}
              processingStep={records.processingStep}
              transcriptLoading={records.transcriptLoading}
              analyzing={aiChat.analyzing}
              isPlaying={audio.isPlaying}
              audioPosition={audio.position}
              totalSeconds={audio.totalSeconds}
              onTogglePlay={audio.toggle}
              onSeek={audio.seek}
              onLinkMember={() => {
                if (records.selected) {
                  setLinkTargetId(records.selected.id);
                  setLinkModalOpen(true);
                }
              }}
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
              phase={records.viewState.kind as "processing" | "ready"}
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
          </div>
        </div>
      )}

      {quickMemoOpen && (
        <QuickMemoModal
          onClose={() => setQuickMemoOpen(false)}
          onCreated={(rec) => {
            records.addReadyRecord(rec);
          }}
        />
      )}

      {linkModalOpen && linkTargetId && records.selected && (
        <LinkMemberModal
          recordId={linkTargetId}
          studentName={records.selected.studentName}
          currentMemberId={records.selected.memberId}
          onClose={() => setLinkModalOpen(false)}
          onLinked={(memberId) => {
            records.updateMemberId(linkTargetId, memberId);
          }}
        />
      )}

      <HomeTutorial />
    </div>
  );
}
