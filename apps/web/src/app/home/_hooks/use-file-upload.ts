"use client";

import { useState, useRef, useCallback } from "react";
import type { CounselingRecordDetail } from "@yeon/api-contract/counseling-records";

import {
  AUDIO_UPLOAD_ERROR_MESSAGE,
  isAcceptedAudioFile,
} from "@/lib/audio-file";

import type { RecordItem } from "../_lib/types";
import { createTimestamp, fmtDurationMs } from "../_lib/utils";
import { readAudioDurationMs } from "@/features/counseling-record-workspace/utils";

interface UseFileUploadParams {
  onFileUpload: (record: RecordItem) => void;
  onUploadComplete: (tempId: string, record: RecordItem) => void;
  onUploadError: (tempId: string, message: string) => void;
  onBeforeProcess?: () => void;
  getDefaultRecordContext?: () => {
    memberId: string | null;
    studentName: string;
  };
}

export function useFileUpload({
  onFileUpload,
  onUploadComplete,
  onUploadError,
  onBeforeProcess,
  getDefaultRecordContext,
}: UseFileUploadParams) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragCountRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const processFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!isAcceptedAudioFile(file)) {
        setError(AUDIO_UPLOAD_ERROR_MESSAGE);
        return;
      }

      setUploading(true);
      const tempId = `temp-${Date.now()}`;
      try {
        const context = getDefaultRecordContext?.() ?? {
          memberId: null,
          studentName: "",
        };
        const audioDurationMs = await readAudioDurationMs(file);
        const tempRecord: RecordItem = {
          id: tempId,
          spaceId: null,
          memberId: context.memberId,
          createdAt: new Date().toISOString(),
          title:
            file.name.replace(/\.[^.]+$/, "") || `업로드 ${createTimestamp()}`,
          status: "processing",
          errorMessage: null,
          meta: "",
          duration: fmtDurationMs(audioDurationMs) || "업로드 중",
          durationMs: audioDurationMs ?? 0,
          studentName: context.studentName,
          type: "",
          audioUrl: null,
          transcript: [],
          aiSummary: "업로드 중...",
          aiMessages: [],
          analysisResult: null,
          processingStage: "queued",
          processingProgress: 5,
          processingMessage:
            "오디오 업로드가 시작되어 전사 작업을 준비하고 있습니다.",
          analysisStatus: "idle",
          analysisProgress: 0,
        };

        onBeforeProcess?.();
        onFileUpload(tempRecord);

        const formData = new FormData();
        formData.append("audio", file);
        formData.append("sessionTitle", file.name.replace(/\.[^.]+$/, ""));
        formData.append("studentName", context.studentName);
        formData.append("counselingType", "");
        if (context.memberId) {
          formData.append("memberId", context.memberId);
        }
        if (audioDurationMs !== null) {
          formData.append("audioDurationMs", String(audioDurationMs));
        }

        const res = await fetch("/api/v1/counseling-records", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "업로드에 실패했습니다.");
        }

        const data = (await res.json()) as { record: CounselingRecordDetail };
        const item = data.record;

        const record: RecordItem = {
          id: item.id,
          spaceId: item.spaceId,
          memberId: item.memberId ?? context.memberId,
          createdAt: item.createdAt,
          title: item.sessionTitle || file.name.replace(/\.[^.]+$/, ""),
          status: "processing",
          errorMessage: null,
          meta: "",
          duration: fmtDurationMs(item.audioDurationMs) || "분석 중",
          durationMs: item.audioDurationMs ?? 0,
          studentName: item.studentName || context.studentName,
          type: item.counselingType || "",
          audioUrl: null,
          transcript: [],
          aiSummary: "",
          aiMessages: [],
          analysisResult: null,
          processingStage: item.processingStage,
          processingProgress: item.processingProgress,
          processingMessage: item.processingMessage,
          analysisStatus: item.analysisStatus,
          analysisProgress: item.analysisProgress,
        };

        onUploadComplete(tempId, record);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "업로드에 실패했습니다.";
        setError(message);
        onUploadError(tempId, message);
      } finally {
        setUploading(false);
      }
    },
    [
      getDefaultRecordContext,
      onBeforeProcess,
      onFileUpload,
      onUploadComplete,
      onUploadError,
    ],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
      e.target.value = "";
    },
    [processFile],
  );

  const hasFiles = useCallback((e: React.DragEvent) => {
    return e.dataTransfer.types.includes("Files");
  }, []);

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!hasFiles(e)) return;
      dragCountRef.current += 1;
      if (dragCountRef.current === 1) setIsDragging(true);
    },
    [hasFiles],
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isDragging) return;
      dragCountRef.current -= 1;
      if (dragCountRef.current <= 0) {
        dragCountRef.current = 0;
        setIsDragging(false);
      }
    },
    [isDragging],
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    },
    [hasFiles],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      dragCountRef.current = 0;
      setIsDragging(false);
      if (!hasFiles(e)) return;
      const file = e.dataTransfer.files[0];
      if (file && isAcceptedAudioFile(file)) {
        processFile(file);
      } else if (file) {
        setError(AUDIO_UPLOAD_ERROR_MESSAGE);
      }
    },
    [processFile, hasFiles],
  );

  return {
    isDragging,
    uploading,
    error,
    fileInputRef,
    openFilePicker,
    handleInputChange,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
