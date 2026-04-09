import { useState, useRef, useCallback } from "react";
import type { RecordItem } from "../_lib/types";

interface UseFileUploadParams {
  onFileUpload: (record: RecordItem) => void;
}

export function useFileUpload({ onFileUpload }: UseFileUploadParams) {
  const [isDragging, setIsDragging] = useState(false);
  const dragCountRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const processFile = useCallback(
    (file: File) => {
      const record: RecordItem = {
        id: `rec-${Date.now()}`,
        title: file.name.replace(/\.[^.]+$/, ""),
        status: "processing",
        meta: "",
        duration: "분석 중",
        studentName: "",
        type: "",
        transcript: [],
        aiSummary: "",
        aiMessages: [],
      };
      onFileUpload(record);
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

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!hasFiles(e)) return;
    dragCountRef.current += 1;
    if (dragCountRef.current === 1) setIsDragging(true);
  }, [hasFiles]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDragging) return;
    dragCountRef.current -= 1;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setIsDragging(false);
    }
  }, [isDragging]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    if (!hasFiles(e)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, [hasFiles]);

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
    fileInputRef,
    openFilePicker,
    handleInputChange,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
  };
}
