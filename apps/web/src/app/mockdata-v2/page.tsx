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
  TopNav,
  Gnav,
  EmptyState,
  RecordingState,
  Sidebar,
  CenterPanel,
  AiPanel,
} from "./_components";

export default function MockV2Workspace() {
  /* ── 훅 조합: 각 훅은 하나의 관심사만 담당 ── */

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

  /* 레코드 전환 시 오디오 리셋 */
  const handleSelectRecord = (id: string) => {
    records.selectRecord(id);
    audio.reset();
  };

  /* 녹음 시작 → phase 전환 */
  const handleStartRecording = () => {
    records.setPhase("recording");
    recording.start();
  };

  /* ── 렌더: 훅 결과를 프레젠테이션 컴포넌트에 prop으로 전달 ── */

  return (
    <div
      className={styles.appShell}
      style={{ flexDirection: "column" }}
      onDragEnter={fileUpload.handleDragEnter}
      onDragLeave={fileUpload.handleDragLeave}
      onDragOver={fileUpload.handleDragOver}
      onDrop={fileUpload.handleDrop}
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

      <TopNav />

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        <Gnav activeMenu="records" />

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
    </div>
  );
}
