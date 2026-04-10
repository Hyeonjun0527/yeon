"use client";

import {
  useRecords,
  useRecording,
  useFileUpload,
  useAudioPlayer,
  useAiChat,
  useAiPanel,
} from "./_hooks";
import {
  EmptyState,
  RecordingState,
  Sidebar,
  CenterPanel,
  AiPanel,
} from "./_components";

export default function MockV2Workspace() {
  const records = useRecords();

  const recording = useRecording({
    onRecordingStop: (tempRecord) => records.addProcessingRecord(tempRecord),
    onUploadComplete: (tempId, realRecord) => records.replaceRecord(tempId, realRecord),
    onUploadError: (tempId, msg) => records.markUploadError(tempId, msg),
  });

  const fileUpload = useFileUpload({
    onFileUpload: (rec) => records.addProcessingRecord(rec),
  });

  const selectedAudioUrl = records.selected?.audioUrl ?? null;
  const selectedTotalSeconds = Math.round((records.selected?.durationMs ?? 0) / 1000);
  const audio = useAudioPlayer(selectedAudioUrl, selectedTotalSeconds);

  const aiChat = useAiChat({
    selectedId: records.selectedId,
    selectedMessages: records.selected?.aiMessages ?? [],
    selectedStatus: records.selected?.status ?? null,
    onUpdateMessages: records.updateMessages,
  });

  const aiPanel = useAiPanel();

  const handleSelectRecord = (id: string) => {
    records.selectRecord(id);
    audio.reset();
  };

  const handleStartRecording = () => {
    records.setPhase("recording");
    recording.start();
  };

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
            <div className="text-lg font-semibold text-text mb-1">녹음 파일을 놓으세요</div>
            <div className="text-sm text-text-secondary">
              오디오 파일을 드롭하면 자동으로 전사를 시작합니다
            </div>
          </div>
        </div>
      )}

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
            transcriptLoading={records.transcriptLoading}
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
    </div>
  );
}
