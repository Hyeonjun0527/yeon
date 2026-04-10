"use client";

import { useState, useRef, useCallback } from "react";
import type { CounselingRecordDetail } from "@yeon/api-contract/counseling-records";
import type { RecordItem } from "../_lib/types";
import { fmtDurationMs } from "../_lib/utils";

interface UseFileUploadParams {
  onFileUpload: (record: RecordItem) => void;
}

export function useFileUpload({ onFileUpload }: UseFileUploadParams) {
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
      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("audio", file);
        formData.append("sessionTitle", file.name.replace(/\.[^.]+$/, ""));
        formData.append("studentName", "");
        formData.append("counselingType", "");

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
          memberId: null,
          title: item.sessionTitle || file.name.replace(/\.[^.]+$/, ""),
          status: "processing",
          errorMessage: null,
          meta: "",
          duration: fmtDurationMs(item.audioDurationMs) || "분석 중",
          durationMs: item.audioDurationMs ?? 0,
          studentName: item.studentName || "",
          type: item.counselingType || "",
          audioUrl: null,
          transcript: [],
          aiSummary: "",
          aiMessages: [],
          analysisResult: null,
        };

        onFileUpload(record);
      } catch (err) {
        setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [onFileUpload],
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
      if (file && file.type.startsWith("audio/")) {
        processFile(file);
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
