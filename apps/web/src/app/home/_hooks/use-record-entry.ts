"use client";

import { useState, useCallback, useRef } from "react";
import type { RecordItem } from "../_lib/types";

// ---------------------------------------------------------------------------
// 이 훅의 유일한 책임: 녹음 / 파일 업로드 / 텍스트 메모 진입 flow 관리
// ---------------------------------------------------------------------------

interface RecordEntryDeps {
  /** 선택 해제 (녹음·업로드 시작 시 기존 선택을 지운다) */
  clearSelection: () => void;
  /** member 선택 (녹음 취소 시 복귀용) */
  selectMember: (id: string) => void;
  /** record 선택 (퀵메모 생성 후 즉시 선택) */
  selectRecord: (id: string) => void;
  /** useRecords.startRecording */
  startRecording: () => void;
  /** useRecords.stopRecording */
  stopRecording: () => void;
  /** useRecords.cancelRecording */
  cancelRecording: () => void;
  /** useRecords.addReadyRecord */
  addReadyRecord: (record: RecordItem) => void;
  /** useRecording.start */
  recordingStart: () => void;
  /** useRecording.stop */
  recordingStop: () => void;
  /** useRecording.cancel */
  recordingCancel: () => void;
  /** useFileUpload.openFilePicker */
  openFilePicker: () => void;
}

export function useRecordEntry(deps: RecordEntryDeps) {
  // ── 모달 상태 ─────────────────────────────────────────────────
  const [newRecordEntryOpen, setNewRecordEntryOpen] = useState(false);
  const [quickMemoOpen, setQuickMemoOpen] = useState(false);

  // ── refs: 진입 컨텍스트 ────────────────────────────────────────
  /** 녹음 취소 시 복귀할 memberId */
  const recordingReturnMemberIdRef = useRef<string | null>(null);
  /** 퀵메모·녹음 진입 시 원래 선택되어 있던 memberId */
  const quickMemoOriginMemberIdRef = useRef<string | null>(null);
  /** 신규 기록 생성 시 기본 수강생 정보 */
  const entryMemberContextRef = useRef<{
    memberId: string | null;
    studentName: string;
  }>({ memberId: null, studentName: "" });

  // ── 핸들러 ─────────────────────────────────────────────────────
  const handleStartRecording = useCallback(
    (returnMemberId: string | null = null) => {
      recordingReturnMemberIdRef.current = returnMemberId;
      deps.clearSelection();
      deps.startRecording();
      deps.recordingStart();
    },
    [deps.clearSelection, deps.startRecording, deps.recordingStart],
  );

  const handleStopRecording = useCallback(() => {
    recordingReturnMemberIdRef.current = null;
    deps.stopRecording();
    deps.recordingStop();
  }, [deps.recordingStop, deps.stopRecording]);

  const handleCancelRecording = useCallback(() => {
    const returnMemberId = recordingReturnMemberIdRef.current;
    deps.recordingCancel();
    deps.cancelRecording();
    recordingReturnMemberIdRef.current = null;
    if (returnMemberId) {
      deps.selectMember(returnMemberId);
    }
  }, [deps.recordingCancel, deps.cancelRecording, deps.selectMember]);

  const handleOpenFileUpload = useCallback(() => {
    deps.clearSelection();
    deps.openFilePicker();
  }, [deps.clearSelection, deps.openFilePicker]);

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
    handleOpenFileUpload();
  }, [handleOpenFileUpload]);

  const handleChooseTextEntry = useCallback(() => {
    setNewRecordEntryOpen(false);
    setQuickMemoOpen(true);
  }, []);

  const handleQuickMemoClose = useCallback(() => {
    setQuickMemoOpen(false);
    quickMemoOriginMemberIdRef.current = null;
  }, []);

  const handleQuickMemoCreated = useCallback(
    (rec: RecordItem) => {
      quickMemoOriginMemberIdRef.current = null;
      deps.addReadyRecord(rec);
      // selectRecord가 member → record로 원자적 전환 (member 자동 해제)
      deps.selectRecord(rec.id);
    },
    [deps.addReadyRecord, deps.selectRecord],
  );

  const handleNewRecordEntryClose = useCallback(() => {
    setNewRecordEntryOpen(false);
    quickMemoOriginMemberIdRef.current = null;
  }, []);

  return {
    // 모달 상태
    newRecordEntryOpen,
    quickMemoOpen,
    // 진입 컨텍스트 (read-only)
    entryMemberContext: entryMemberContextRef,
    // 핸들러
    handleStartRecording,
    handleStopRecording,
    handleCancelRecording,
    handleOpenFileUpload,
    handleOpenNewRecordEntry,
    handleChooseRecordingEntry,
    handleChooseUploadEntry,
    handleChooseTextEntry,
    handleQuickMemoClose,
    handleQuickMemoCreated,
    handleNewRecordEntryClose,
  };
}
