"use client";

import { useRouter } from "next/navigation";
import { Suspense, useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
  useWorkspaceSelection,
  useRecordEntry,
  type Space,
} from "./_hooks";
import { useExport } from "./_lib/export-context";
import { detectRecordMemberMismatch } from "./_lib/record-member-mismatch";
import { getHomeWorkspaceUiPolicy } from "./_lib/home-workspace-ui-policy";
import { exportRecordDocx, exportMemberReportDocx } from "./_lib/export-docx";
import {
  EmptyState,
  HomeSpaceGate,
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
import {
  useRegisterTutorialPolicy,
  useSidebarToggleVisibility,
} from "./_components/home-sidebar-layout-context";
import { HomeTutorial } from "@/components/tutorial";
import { StudentSpaceCreateModal } from "@/features/student-management/components/space-create-modal";
import { useAppRoute } from "@/lib/app-route-context";
import { createPatchedHref } from "@/lib/route-state/search-params";

function MockV2WorkspaceInner() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { resolveAppHref } = useAppRoute();
  const autoEntryHandledRef = useRef(false);

  // ── refs: 순환 의존 해소 (selection ↔ records ↔ audio) ─────────
  const ensureDetailRef = useRef<(id: string) => void>(() => {});
  const resetAudioRef = useRef<() => void>(() => {});

  // ── 스페이스 ──────────────────────────────────────────────────
  const {
    spaces,
    currentSpace,
    currentSpaceId,
    setCurrentSpaceId,
    addSpace,
    removeSpace,
    loading: spacesLoading,
  } = useCurrentSpace();

  const [showSpaceGateModal, setShowSpaceGateModal] = useState<
    "blank" | "import" | null
  >(null);

  // ── 선택 (단일 source of truth) ──────────────────────────────
  const selection = useWorkspaceSelection({
    currentSpaceId,
    ensureDetailRef,
    resetAudioRef,
  });

  // ── 데이터 (선택 상태를 파라미터로 수신) ──────────────────────
  const records = useRecords(selection.selectedRecordId);
  ensureDetailRef.current = records.ensureDetail;

  // ── 멤버 ──────────────────────────────────────────────────────
  const { members, loading: membersLoading } = useSpaceMembers(
    currentSpaceId,
    records.records,
  );

  // ── selectedMember 파생 (page.tsx에서 직접 계산) ───────────────
  const selectedMember = selection.selectedMemberId
    ? (members.find((m) => m.id === selection.selectedMemberId) ?? null)
    : null;

  // ── 오디오 ─────────────────────────────────────────────────────
  const selectedAudioUrl = records.selected?.audioUrl ?? null;
  const selectedTotalSeconds = Math.round(
    (records.selected?.durationMs ?? 0) / 1000,
  );
  const audio = useAudioPlayer(selectedAudioUrl, selectedTotalSeconds);
  resetAudioRef.current = audio.reset;

  // ── URL → 선택 상태 초기화 (records 로드 후 1회) ───────────────
  useEffect(() => {
    selection.initFromUrl(records.records);
  }, [records.records, selection.initFromUrl]);

  // ── 녹음 ─────────────────────────────────────────────────────
  const recording = useRecording({
    onRecordingStop: (tempRecord) => {
      records.addProcessingRecord(tempRecord);
      selection.selectRecord(tempRecord.id);
    },
    onUploadComplete: (tempId, realRecord) => {
      records.replaceRecord(tempId, realRecord);
      selection.replaceSelectedRecordId(tempId, realRecord.id);
    },
    onUploadError: (tempId, msg) => records.markUploadError(tempId, msg),
    getDefaultRecordContext: () => entry.entryMemberContext.current,
  });

  // ── 파일 업로드 ───────────────────────────────────────────────
  const fileUpload = useFileUpload({
    onBeforeProcess: () => {
      selection.clearAll();
    },
    getDefaultRecordContext: () => entry.entryMemberContext.current,
    onFileUpload: (rec) => {
      records.addProcessingRecord(rec);
      selection.selectRecord(rec.id);
    },
    onUploadComplete: (tempId, realRecord) => {
      records.replaceRecord(tempId, realRecord);
      selection.replaceSelectedRecordId(tempId, realRecord.id);
    },
    onUploadError: (tempId, msg) => records.markUploadError(tempId, msg),
  });

  // ── 진입 flow (녹음 / 업로드 / 텍스트) ────────────────────────
  const entry = useRecordEntry({
    clearSelection: selection.clearAll,
    selectMember: selection.selectMember,
    selectRecord: selection.selectRecord,
    startRecording: records.startRecording,
    stopRecording: records.stopRecording,
    cancelRecording: records.cancelRecording,
    addReadyRecord: records.addReadyRecord,
    recordingStart: recording.start,
    recordingStop: recording.stop,
    recordingCancel: recording.cancel,
    openFilePicker: fileUpload.openFilePicker,
  });

  useEffect(() => {
    if (autoEntryHandledRef.current || typeof window === "undefined") {
      return;
    }

    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("newRecordEntry") !== "true") {
      autoEntryHandledRef.current = true;
      return;
    }

    entry.handleOpenNewRecordEntry(
      searchParams.get("memberId"),
      searchParams.get("studentName") ?? "",
    );

    window.history.replaceState(
      null,
      "",
      createPatchedHref(window.location.pathname, searchParams, {
        newRecordEntry: null,
        studentName: null,
      }),
    );

    autoEntryHandledRef.current = true;
  }, [entry.handleOpenNewRecordEntry]);

  // ── AI 채팅 / 패널 ────────────────────────────────────────────
  const aiPanel = useAiPanel({
    hasSelectedRecord: selection.selectedRecordId !== null,
  });
  const aiChat = useAiChat({
    selectedId: selection.selectedRecordId,
    selectedMessages: records.selected?.aiMessages || [],
    selectedStatus: records.selected?.status ?? null,
    selectedAnalysisResult: records.selected?.analysisResult ?? null,
    useWebSearch: aiPanel.useWebSearch,
    onUpdateMessages: records.updateMessages,
    onUpdateAnalysisResult: records.updateAnalysisResult,
  });

  // ── 재시도 ─────────────────────────────────────────────────────
  const recordRetry = useRecordRetry({
    selected: records.selected,
    applyRecordDetail: records.applyRecordDetail,
    boostPolling: records.boostPolling,
    markAnalysisRetryStart: records.markAnalysisRetryStart,
    selectRecord: selection.handleSelectRecord,
  });

  // ── 내보내기 ───────────────────────────────────────────────────
  const { register } = useExport();

  // ── 모달 상태 (링크 멤버) ──────────────────────────────────────
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkTargetId, setLinkTargetId] = useState<string | null>(null);

  // ── 스페이스 핸들러 ────────────────────────────────────────────
  const handleChangeSpace = useCallback(
    (spaceId: string) => {
      if (currentSpaceId === spaceId) {
        return;
      }

      selection.clearAll();
      setCurrentSpaceId(spaceId);
    },
    [currentSpaceId, selection.clearAll, setCurrentSpaceId],
  );

  const redirectToStudentManagementSpace = useCallback(
    (spaceId: string) => {
      router.push(
        createPatchedHref(
          resolveAppHref("/home/student-management"),
          new URLSearchParams(),
          { spaceId },
        ),
      );
    },
    [resolveAppHref, router],
  );

  const handleSpaceCreated = useCallback(
    (space: Space) => {
      selection.clearAll();
      addSpace(space);
      redirectToStudentManagementSpace(space.id);
    },
    [addSpace, redirectToStudentManagementSpace, selection.clearAll],
  );

  const handleImportedSpaceCreated = useCallback(
    (spaceId: string | null) => {
      if (!spaceId) {
        setShowSpaceGateModal(null);
        return;
      }

      selection.clearAll();
      setShowSpaceGateModal(null);
      redirectToStudentManagementSpace(spaceId);
    },
    [redirectToStudentManagementSpace, selection.clearAll],
  );

  // ── 삭제 핸들러 ───────────────────────────────────────────────
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
      selection.clearRecordIfSelected(recordId);
    },
    [records, selection],
  );

  const handleDeleteMember = useCallback(
    async (memberId: string) => {
      if (!currentSpaceId) {
        throw new Error("선택된 스페이스가 없습니다.");
      }
      const res = await fetch(
        `/api/v1/spaces/${currentSpaceId}/members/${memberId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "수강생을 삭제하지 못했습니다.");
      }
      selection.clearMemberIfSelected(memberId);
      await queryClient.invalidateQueries({
        queryKey: ["space-members", currentSpaceId],
      });
      await queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
    },
    [currentSpaceId, queryClient, selection],
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
        selection.clearAll();
      }
      await queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
    },
    [currentSpaceId, queryClient, removeSpace, selection.clearAll],
  );

  // ── 내보내기 핸들러 ────────────────────────────────────────────
  const handleExportRecord = useCallback(
    async (recordId: string) => {
      const target = records.records.find((r) => r.id === recordId);
      if (!target) throw new Error("내보낼 상담 기록을 찾지 못했습니다.");
      await exportRecordDocx(target);
    },
    [records.records],
  );

  const handleExportMember = useCallback(
    async (memberId: string) => {
      const target = members.find((m) => m.id === memberId);
      if (!target) throw new Error("내보낼 수강생을 찾지 못했습니다.");
      await exportMemberReportDocx(target, records.records);
    },
    [members, records.records],
  );

  // ── 패널 표시 결정 ─────────────────────────────────────────────
  const selectedRecordMismatchWarning = detectRecordMemberMismatch(
    records.selected,
    members,
    records.selected?.memberId ?? null,
  );

  const homeUiPolicy = getHomeWorkspaceUiPolicy({
    spacesLoading,
    spaceCount: spaces.length,
    viewStateKind: records.viewState.kind,
    hasSelectedMember: selectedMember !== null,
    selectedRecordStatus: records.selected?.status ?? null,
  });

  useSidebarToggleVisibility("records", homeUiPolicy.canToggleSidebar);
  useRegisterTutorialPolicy("home", homeUiPolicy.tutorial);

  // ── 내보내기 등록 ──────────────────────────────────────────────
  useEffect(() => {
    if (homeUiPolicy.showMemberPanel && selectedMember) {
      register(() => exportMemberReportDocx(selectedMember, records.records));
    } else if (records.selected?.status === "ready") {
      const sel = records.selected;
      register(() => exportRecordDocx(sel));
    } else {
      register(null);
    }
  }, [
    homeUiPolicy.showMemberPanel,
    selectedMember,
    records.selected,
    records.records,
    register,
  ]);

  // ── 렌더 ──────────────────────────────────────────────────────
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

      {homeUiPolicy.surface === "space-gate" ? (
        <>
          <HomeSpaceGate
            onCreateBlankSpace={() => setShowSpaceGateModal("blank")}
            onImportSpace={() => setShowSpaceGateModal("import")}
          />

          {showSpaceGateModal ? (
            <StudentSpaceCreateModal
              initialStep={showSpaceGateModal}
              onClose={() => setShowSpaceGateModal(null)}
              onCreated={(space) => {
                handleSpaceCreated(space);
                setShowSpaceGateModal(null);
              }}
              onImported={(result) => {
                handleImportedSpaceCreated(result.spaceIds[0] ?? null);
              }}
            />
          ) : null}
        </>
      ) : (
        <>
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

          {homeUiPolicy.surface === "empty" ? (
            <EmptyState
              onStartRecording={() => entry.handleStartRecording()}
              onFileUpload={entry.handleOpenFileUpload}
            />
          ) : null}

          {homeUiPolicy.surface === "recording" ? (
            <RecordingState
              elapsed={recording.elapsed}
              onStop={entry.handleStopRecording}
              onCancel={entry.handleCancelRecording}
            />
          ) : null}

          {homeUiPolicy.showSidebar ? (
            <Sidebar
              records={records.records}
              selectedId={selection.selectedRecordId}
              onSelect={selection.handleSelectRecord}
              spaces={spaces}
              currentSpace={currentSpace}
              onSpaceChange={handleChangeSpace}
              onSpaceCreated={handleSpaceCreated}
              members={members}
              membersLoading={membersLoading}
              selectedMemberId={selection.selectedMemberId}
              onSelectMember={selection.handleSelectMember}
              onOpenNewRecordEntry={() => entry.handleOpenNewRecordEntry()}
              onDeleteRecord={handleDeleteRecord}
              onDeleteMember={handleDeleteMember}
              onDeleteSpace={handleDeleteSpace}
              onExportRecord={handleExportRecord}
              onExportMember={handleExportMember}
            />
          ) : null}

          {homeUiPolicy.showMemberPanel && selectedMember ? (
            <div className="flex flex-1 overflow-hidden">
              <MemberPanel
                member={selectedMember}
                records={records.records}
                onSelectRecord={selection.handleSelectRecord}
                onOpenNewRecordEntry={() =>
                  entry.handleOpenNewRecordEntry(
                    selectedMember.id,
                    selectedMember.name,
                  )
                }
              />
            </div>
          ) : null}

          {homeUiPolicy.showCenterPanel ? (
            <div className="flex flex-1 overflow-hidden">
              <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
                <InsightBanner
                  members={members}
                  onHighlightWarning={() => {
                    const target = members.find(
                      (m) => m.indicator === "warning",
                    );
                    if (target) selection.handleSelectMember(target.id);
                  }}
                  onHighlightNone={() => {
                    const target = members.find((m) => m.indicator === "none");
                    if (target) selection.handleSelectMember(target.id);
                  }}
                />
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
              </div>

              <AiPanel
                width={aiPanel.width}
                collapsed={aiPanel.collapsed}
                canExpand={aiPanel.canExpand}
                tab={aiPanel.tab}
                panelRef={aiPanel.panelRef}
                model={aiPanel.model}
                useWebSearch={aiPanel.useWebSearch}
                onSetTab={aiPanel.setTab}
                onToggleCollapsed={aiPanel.toggleCollapsed}
                onExpand={aiPanel.expand}
                onToggleModel={aiPanel.toggleModel}
                onToggleWebSearch={aiPanel.toggleWebSearch}
                onStartResize={aiPanel.startResize}
                phase={records.viewState.kind as "processing" | "ready"}
                selected={records.selected}
                selectedId={selection.selectedRecordId}
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
          ) : null}

          {entry.newRecordEntryOpen && (
            <NewRecordEntryModal
              onClose={entry.handleNewRecordEntryClose}
              onChooseRecording={entry.handleChooseRecordingEntry}
              onChooseUpload={entry.handleChooseUploadEntry}
              onChooseText={entry.handleChooseTextEntry}
              linkedStudentName={
                entry.entryMemberContext.current.studentName || undefined
              }
            />
          )}

          {entry.quickMemoOpen && (
            <QuickMemoModal
              onClose={entry.handleQuickMemoClose}
              defaultMemberId={entry.entryMemberContext.current.memberId}
              defaultStudentName={entry.entryMemberContext.current.studentName}
              onCreated={entry.handleQuickMemoCreated}
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
        </>
      )}
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
