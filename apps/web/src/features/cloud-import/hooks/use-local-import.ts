"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, DriveFile, ImportHook, ImportPreview, ImportResult } from "../types";
import { detectFileKind } from "../file-kind";
import { nextId, summaryText, diffText, readImportSSE } from "./import-helpers";

export interface UseLocalImportReturn extends ImportHook {
  selectLocalFile: (file: File) => void;
}

export function useLocalImport(onImportComplete?: () => void): UseLocalImportReturn {
  const rawFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);

  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [fileProxyUrl, setFileProxyUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [editablePreview, setEditablePreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // 언마운트 시 진행 중인 분석 abort + Object URL 정리
  useEffect(() => {
    return () => {
      analyzeAbortRef.current?.abort();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const pushMessage = useCallback((role: ChatMessage["role"], text: string) => {
    setChatMessages((prev) => [...prev, { role, text, id: nextId() }]);
  }, []);

  const selectLocalFile = useCallback((file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
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
    setChatMessages([]);
  }, []);

  const analyzeSelectedFile = useCallback(async () => {
    if (!rawFileRef.current) return;
    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    try {
      setAnalyzing(true);
      setError(null);
      setStreamingText(null);
      const formData = new FormData();
      formData.append("file", rawFileRef.current);
      const res = await fetch("/api/v1/integrations/local/analyze", {
        method: "POST",
        headers: { Accept: "text/event-stream" },
        body: formData,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "파일 분석에 실패했습니다."));

      const result = await readImportSSE(res, (text) => setStreamingText(text), controller.signal);
      if (result.error) throw new Error(result.error);
      if (result.preview) {
        setEditablePreview(structuredClone(result.preview));
        pushMessage("ai", `파일 분석이 완료됐습니다! ${summaryText(result.preview)}을 찾았습니다. 수정이 필요하면 말씀해 주세요.`);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "파일 분석에 실패했습니다.");
    } finally {
      if (analyzeAbortRef.current === controller) {
        setAnalyzing(false);
        setStreamingText(null);
        analyzeAbortRef.current = null;
      }
    }
  }, [pushMessage]);

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
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
    setChatMessages([]);
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
    setChatMessages([]);
  }, []);

  const refineWithInstruction = useCallback(async (instruction: string) => {
    if (!rawFileRef.current || !editablePreview) return;
    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    pushMessage("user", instruction);
    const prevPreview = editablePreview;
    try {
      setAnalyzing(true);
      setError(null);
      setStreamingText(null);
      const formData = new FormData();
      formData.append("file", rawFileRef.current);
      formData.append("instruction", instruction);
      formData.append("previousResult", JSON.stringify(prevPreview));
      const res = await fetch("/api/v1/integrations/local/analyze", {
        method: "POST",
        headers: { Accept: "text/event-stream" },
        body: formData,
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "파일 재분석에 실패했습니다."));

      const result = await readImportSSE(res, (text) => setStreamingText(text), controller.signal);
      if (result.error) throw new Error(result.error);
      if (result.preview) {
        setEditablePreview(structuredClone(result.preview));
        pushMessage("ai", diffText(prevPreview, result.preview));
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const msg = err instanceof Error ? err.message : "파일 재분석에 실패했습니다.";
      setError(msg);
      pushMessage("ai", `오류가 발생했습니다: ${msg}`);
    } finally {
      if (analyzeAbortRef.current === controller) {
        setAnalyzing(false);
        setStreamingText(null);
        analyzeAbortRef.current = null;
      }
    }
  }, [editablePreview, pushMessage]);

  return {
    selectedFile,
    fileProxyUrl,
    analyzing,
    streamingText,
    editablePreview,
    importing,
    importResult,
    error,
    chatMessages,
    analyzeSelectedFile,
    updatePreview,
    confirmImport,
    selectFileForPreview,
    deselectFile,
    refineWithInstruction,
    selectLocalFile,
  };
}
