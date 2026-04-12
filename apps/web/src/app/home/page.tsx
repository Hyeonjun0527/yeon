"use client";

import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import {
  useRecords,
  useRecording,
  useFileUpload,
  useAudioPlayer,
  useAiChat,
  useAiPanel,
  useCurrentSpace,
  useSpaceMembers,
  useRecordRetry,
} from "./_hooks";
import { useExport } from "./_lib/export-context";
import { detectRecordMemberMismatch } from "./_lib/record-member-mismatch";
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
  NewRecordEntryModal,
} from "./_components";
import { HomeTutorial } from "@/components/tutorial";
import { createPatchedHref } from "@/lib/route-state/search-params";

function MockV2WorkspaceInner() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const records = useRecords();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  // 모달 열림 시점의 recordId를 캡처 — async 완료 전에 selected가 바뀌어도 안전
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null);
  const [quickMemoOpen, setQuickMemoOpen] = useState(false);
  const [newRecordEntryOpen, setNewRecordEntryOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const recordingReturnMemberIdRef = useRef<string | null>(null);
  const quickMemoOriginMemberIdRef = useRef<string | null>(null);
  const entryMemberContextRef = useRef<{
    memberId: string | null;
    studentName: string;
  }>({ memberId: null, studentName: "" });
  const {
    spaces,
    currentSpace,
    currentSpaceId,
    setCurrentSpaceId,
    addSpace,
    removeSpace,
  } = useCurrentSpace();
  const currentSearchParams = () =>
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const routeRecordId = currentSearchParams().get("recordId");
  const routeMemberId = currentSearchParams().get("memberId");
  const { members, loading: membersLoading } = useSpaceMembers(
    currentSpaceId,
    records.records,
  );

  const updateRouteState = useCallback(
    (patch: Record<string, string | null>) => {
      router.replace(createPatchedHref(pathname, currentSearchParams(), patch));
    },
    [pathname, router],
  );

  const recording = useRecording({
    onRecordingStop: (tempRecord) => records.addProcessingRecord(tempRecord),
    onUploadComplete: (tempId, realRecord) =>
      records.replaceRecord(tempId, realRecord),
    onUploadError: (tempId, msg) => records.markUploadError(tempId, msg),
    getDefaultRecordContext: () => entryMemberContextRef.current,
  });

  const fileUpload = useFileUpload({
    onBeforeProcess: () => {
      setSelectedMemberId(null);
      recordingReturnMemberIdRef.current = null;
    },
    getDefaultRecordContext: () => entryMemberContextRef.current,
    onFileUpload: (rec) => records.addProcessingRecord(rec),
    onUploadComplete: (tempId, realRecord) =>
      records.replaceRecord(tempId, realRecord),
    onUploadError: (tempId, msg) => records.markUploadError(tempId, msg),
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

  const recordRetry = useRecordRetry({
    selected: records.selected,
    applyRecordDetail: records.applyRecordDetail,
    boostPolling: records.boostPolling,
    markAnalysisRetryStart: records.markAnalysisRetryStart,
    selectRecord: records.selectRecord,
  });

  const { register } = useExport();

  const handleSelectRecord = useCallback(
    (id: string) => {
      setSelectedMemberId(null);
      records.selectRecord(id);
      audio.reset();
      updateRouteState({
        recordId: id,
        memberId: null,
        spaceId: currentSpaceId,
      });
    },
    [audio, currentSpaceId, records, updateRouteState],
  );

  const handleSelectMember = useCallback(
    (id: string) => {
      setSelectedMemberId(id);
      updateRouteState({
        memberId: id,
        recordId: null,
        spaceId: currentSpaceId,
      });
    },
    [currentSpaceId, updateRouteState],
  );

  const handleStartRecording = useCallback(
    (returnMemberId: string | null = null) => {
      recordingReturnMemberIdRef.current = returnMemberId;
      setSelectedMemberId(null);
      records.startRecording();
      recording.start();
    },
    [records, recording],
  );

  const handleStopRecording = useCallback(() => {
    recordingReturnMemberIdRef.current = null;
    recording.stop();
  }, [recording]);

  const handleCancelRecording = useCallback(() => {
    recording.cancel();
    records.cancelRecording();
    setSelectedMemberId(recordingReturnMemberIdRef.current);
    recordingReturnMemberIdRef.current = null;
  }, [recording, records]);

  const handleOpenNewRecordEntry = useCallback(
    (memberId: string | null = null, studentName = "") => {
      quickMemoOriginMemberIdRef.current = memberId;
      entryMemberContextRef.current = { memberId, studentName };
      setNewRecordEntryOpen(true);
    },
    [],
  );

  const handleChooseRecordingEntry = useCallback(() => {
    setNewRecordEntryOpen(false);
    handleStartRecording(quickMemoOriginMemberIdRef.current);
    quickMemoOriginMemberIdRef.current = null;
  }, [handleStartRecording]);

  const handleChooseUploadEntry = useCallback(() => {
    setNewRecordEntryOpen(false);
    fileUpload.openFilePicker();
  }, [fileUpload]);

  const handleChooseTextEntry = useCallback(() => {
    setNewRecordEntryOpen(false);
    setQuickMemoOpen(true);
  }, []);

  const selectedMember = members.find((m) => m.id === selectedMemberId) ?? null;
  const selectedRecordMismatchWarning = detectRecordMemberMismatch(
    records.selected,
    members,
    records.selected?.memberId ?? null,
  );

  const handleDeleteRecord = useCallback(
    async (recordId: string) => {
      const res = await fetch(`/api/v1/counseling-records/${recordId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "상담 기록을 삭제하지 못했습니다.");
      }

      records.removeRecord(recordId);
      setSelectedMemberId((prev) => {
        if (!prev) return prev;
        const stillExists = records.records.some(
          (record) => record.memberId === prev && record.id !== recordId,
        );
        return stillExists ? prev : prev;
      });
    },
    [records],
  );

  const handleDeleteMember = useCallback(
    async (memberId: string) => {
      if (!currentSpaceId) {
        throw new Error("선택된 스페이스가 없습니다.");
      }

      const res = await fetch(
        `/api/v1/spaces/${currentSpaceId}/members/${memberId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "수강생을 삭제하지 못했습니다.");
      }

      setSelectedMemberId((prev) => (prev === memberId ? null : prev));
      await queryClient.invalidateQueries({
        queryKey: ["space-members", currentSpaceId],
      });
      await queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
    },
    [currentSpaceId, queryClient],
  );

  const handleDeleteSpace = useCallback(
    async (spaceId: string) => {
      const res = await fetch(`/api/v1/spaces/${spaceId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "스페이스를 삭제하지 못했습니다.");
      }

      removeSpace(spaceId);
      if (currentSpaceId === spaceId) {
        setSelectedMemberId(null);
      }

      await queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
    },
    [currentSpaceId, queryClient, removeSpace],
  );

  const handleExportRecord = useCallback(
    async (recordId: string) => {
      const target = records.records.find((record) => record.id === recordId);
      if (!target) {
        throw new Error("내보낼 상담 기록을 찾지 못했습니다.");
      }

      await exportRecordDocx(target);
    },
    [records.records],
  );

  const handleExportMember = useCallback(
    async (memberId: string) => {
      const target = members.find((member) => member.id === memberId);
      if (!target) {
        throw new Error("내보낼 수강생을 찾지 못했습니다.");
      }

      await exportMemberReportDocx(target, records.records);
    },
    [members, records.records],
  );

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
    if (routeMemberId !== null) {
      setSelectedMemberId((prev) =>
        prev === routeMemberId ? prev : routeMemberId,
      );
      return;
    }

    if (selectedMemberId !== null) {
      setSelectedMemberId(null);
    }
  }, [routeMemberId, selectedMemberId]);

  useEffect(() => {
    if (!routeRecordId) {
      return;
    }

    if (records.selectedId === routeRecordId) {
      return;
    }

    if (records.records.some((record) => record.id === routeRecordId)) {
      records.selectRecord(routeRecordId);
      audio.reset();
    }
  }, [
    audio,
    records.records,
    records.selectRecord,
    records.selectedId,
    routeRecordId,
  ]);

  useEffect(() => {
    const desiredMemberId = selectedMember ? selectedMemberId : null;
    const desiredRecordId = desiredMemberId ? null : records.selectedId;
    const params = currentSearchParams();

    if (
      routeRecordId === desiredRecordId &&
      routeMemberId === desiredMemberId &&
      params.get("spaceId") === currentSpaceId
    ) {
      return;
    }

    if (!desiredRecordId && !desiredMemberId && !currentSpaceId) {
      return;
    }

    router.replace(
      createPatchedHref(pathname, params, {
        spaceId: currentSpaceId,
        recordId: desiredRecordId,
        memberId: desiredMemberId,
      }),
    );
  }, [
    currentSpaceId,
    pathname,
    records.selectedId,
    routeMemberId,
    routeRecordId,
    router,
    selectedMemberId,
  ]);

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
          onStartRecording={() => handleStartRecording()}
          onFileUpload={fileUpload.openFilePicker}
        />
      )}

      {records.viewState.kind === "recording" && (
        <RecordingState
          elapsed={recording.elapsed}
          onStop={handleStopRecording}
          onCancel={handleCancelRecording}
        />
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
          onDeleteRecord={handleDeleteRecord}
          onDeleteMember={handleDeleteMember}
          onDeleteSpace={handleDeleteSpace}
          onExportRecord={handleExportRecord}
          onExportMember={handleExportMember}
        />
      )}

      {showMemberPanel && selectedMember && (
        <div className="flex flex-1 overflow-hidden">
          <MemberPanel
            member={selectedMember}
            records={records.records}
            onSelectRecord={handleSelectRecord}
            onOpenNewRecordEntry={() =>
              handleOpenNewRecordEntry(selectedMember.id, selectedMember.name)
            }
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
              mismatchWarning={selectedRecordMismatchWarning}
              onRetryFailedRecord={() => {
                void recordRetry.retryFailedRecord();
              }}
              onRetryFailedAnalysis={() => {
                void recordRetry.retryFailedAnalysis();
              }}
              retryPending={recordRetry.retryPending}
              retryFeedback={recordRetry.retryFeedback}
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

      {newRecordEntryOpen && (
        <NewRecordEntryModal
          onClose={() => {
            setNewRecordEntryOpen(false);
            quickMemoOriginMemberIdRef.current = null;
          }}
          onChooseRecording={handleChooseRecordingEntry}
          onChooseUpload={handleChooseUploadEntry}
          onChooseText={handleChooseTextEntry}
        />
      )}

      {quickMemoOpen && (
        <QuickMemoModal
          onClose={() => {
            setQuickMemoOpen(false);
            quickMemoOriginMemberIdRef.current = null;
          }}
          defaultMemberId={entryMemberContextRef.current.memberId}
          defaultStudentName={entryMemberContextRef.current.studentName}
          onCreated={(rec) => {
            if (quickMemoOriginMemberIdRef.current) {
              setSelectedMemberId(null);
            }
            quickMemoOriginMemberIdRef.current = null;
            records.addReadyRecord(rec);
          }}
        />
      )}

      {linkModalOpen && linkTargetId && records.selected && (
        <LinkMemberModal
          recordId={linkTargetId}
          record={records.selected}
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

export default function MockV2Workspace() {
  return (
    <Suspense fallback={null}>
      <MockV2WorkspaceInner />
    </Suspense>
  );
}
