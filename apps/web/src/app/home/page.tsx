"use client";

import styles from "../mockdata/mockdata.module.css";
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
      style={{ display: "flex", flex: 1, overflow: "hidden", position: "relative" }}
      onDragEnter={fileUpload.handleDragEnter}
      onDragLeave={fileUpload.handleDragLeave}
      onDragOver={fileUpload.handleDragOver}
      onDrop={fileUpload.handleDrop}
    >
      <input
        ref={fileUpload.fileInputRef}
        type="file"
        accept="audio/*"
        style={{ display: "none" }}
        onChange={fileUpload.handleInputChange}
      />

      {fileUpload.isDragging && (
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
    </div>
  );
}
