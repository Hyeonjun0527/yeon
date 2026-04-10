"use client";

import { useCallback, useRef, useState } from "react";
import type { DriveFile, ImportHook, ImportPreview, ImportResult } from "../types";
import { detectFileKind } from "../file-kind";

export interface UseLocalImportReturn extends ImportHook {
  selectLocalFile: (file: File) => void;
}

export function useLocalImport(onImportComplete?: () => void): UseLocalImportReturn {
  const rawFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [fileProxyUrl, setFileProxyUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [editablePreview, setEditablePreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectLocalFile = useCallback((file: File) => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    rawFileRef.current = file;
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;

    const kind = detectFileKind(file.name, file.type);
    const driveFile: DriveFile = {
      id: `local:${file.name}:${file.lastModified}`,
      name: file.name,
      size: file.size,
      lastModifiedAt: new Date(file.lastModified).toISOString(),
      mimeType: file.type || undefined,
      isFolder: false,
      isSpreadsheet: kind === "spreadsheet",
      isImage: kind === "image",
      fileKind: kind,
    };

    setSelectedFile(driveFile);
    setFileProxyUrl(url);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
  }, []);

  const analyzeSelectedFile = useCallback(async () => {
    if (!rawFileRef.current) return;
    try {
      setAnalyzing(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", rawFileRef.current);
      const res = await fetch("/api/v1/integrations/local/analyze", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "파일 분석에 실패했습니다.");
      }
      const data = (await res.json()) as ImportPreview;
      setEditablePreview(structuredClone(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 분석에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const updatePreview = useCallback((updated: ImportPreview) => {
    setEditablePreview(updated);
  }, []);

  const confirmImport = useCallback(async () => {
    if (!editablePreview) return;
    try {
      setImporting(true);
      setError(null);
      const res = await fetch("/api/v1/integrations/local/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editablePreview),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "가져오기에 실패했습니다.");
      }
      const data = (await res.json()) as { created: { spaces: number; members: number } };
      setImportResult(data.created);
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "가져오기에 실패했습니다.");
    } finally {
      setImporting(false);
    }
  }, [editablePreview, onImportComplete]);

  const selectFileForPreview = useCallback((_file: DriveFile) => {
    // 로컬 모드에서 분석 취소 → 분석 결과만 초기화, 파일은 유지
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
  }, []);

  const deselectFile = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    rawFileRef.current = null;
    setSelectedFile(null);
    setFileProxyUrl(null);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
  }, []);

  const refineWithInstruction = useCallback(async (instruction: string) => {
    if (!rawFileRef.current || !editablePreview) return;
    try {
      setAnalyzing(true);
      setError(null);
      const formData = new FormData();
      formData.append("file", rawFileRef.current);
      formData.append("instruction", instruction);
      formData.append("previousResult", JSON.stringify(editablePreview));
      const res = await fetch("/api/v1/integrations/local/analyze", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "파일 재분석에 실패했습니다.");
      }
      const data = (await res.json()) as ImportPreview;
      setEditablePreview(structuredClone(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : "파일 재분석에 실패했습니다.");
    } finally {
      setAnalyzing(false);
    }
  }, [editablePreview]);

  return {
    selectedFile,
    fileProxyUrl,
    analyzing,
    editablePreview,
    importing,
    importResult,
    error,
    analyzeSelectedFile,
    updatePreview,
    confirmImport,
    selectFileForPreview,
    deselectFile,
    refineWithInstruction,
    selectLocalFile,
  };
}
