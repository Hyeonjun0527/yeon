"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  CloudProvider,
  DriveFile,
  FolderEntry,
  ImportPreview,
  ImportResult,
} from "../types";
import { detectFileKind } from "../file-kind";
import { nextId, summaryText, diffText, readImportSSE } from "./import-helpers";

const API_BASE: Record<CloudProvider, string> = {
  onedrive: "/api/v1/integrations/onedrive",
  googledrive: "/api/v1/integrations/googledrive",
};

function normalizeOneDriveFile(f: {
  id: string;
  name: string;
  size: number;
  lastModifiedAt: string;
  mimeType?: string;
}): DriveFile {
  const isFolder = !f.mimeType;
  const kind = isFolder ? "folder" : detectFileKind(f.name, f.mimeType);
  return {
    ...f,
    isFolder,
    isSpreadsheet: kind === "spreadsheet",
    isImage: kind === "image",
    fileKind: kind,
  };
}

function normalizeGoogleDriveFile(f: {
  id: string;
  name: string;
  size: number;
  lastModifiedAt: string;
  mimeType: string;
}): DriveFile {
  const isFolder = f.mimeType === "application/vnd.google-apps.folder";
  const kind = isFolder ? "folder" : detectFileKind(f.name, f.mimeType);
  return {
    ...f,
    isFolder,
    isSpreadsheet: kind === "spreadsheet",
    isImage: kind === "image",
    fileKind: kind,
  };
}

const ROOT_FOLDER: FolderEntry = { id: undefined, name: "루트" };

const CACHE_TTL_MS = 10 * 60 * 1000; // 10분

function storageCacheKey(provider: CloudProvider) {
  return `yeon:drive-cache:${provider}`;
}

function readFolderCache(provider: CloudProvider): Map<string, DriveFile[]> {
  try {
    const raw = localStorage.getItem(storageCacheKey(provider));
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as { ts: number; data: Record<string, DriveFile[]> };
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      localStorage.removeItem(storageCacheKey(provider));
      return new Map();
    }
    return new Map(Object.entries(parsed.data));
  } catch {
    return new Map();
  }
}

function writeFolderCache(provider: CloudProvider, cache: Map<string, DriveFile[]>) {
  try {
    const payload = { ts: Date.now(), data: Object.fromEntries(cache) };
    localStorage.setItem(storageCacheKey(provider), JSON.stringify(payload));
  } catch {
    // 스토리지 용량 초과 시 무시
  }
}

export function useCloudImport(provider: CloudProvider, onImportComplete?: () => void) {
  const base = API_BASE[provider];

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [editablePreview, setEditablePreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<FolderEntry[]>([ROOT_FOLDER]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const folderCacheRef = useRef<Map<string, DriveFile[]>>(readFolderCache(provider));
  const loadSeqRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const folderStackRef = useRef(folderStack);
  folderStackRef.current = folderStack;

  // 언마운트 시 진행 중인 분석 abort
  useEffect(() => {
    return () => {
      analyzeAbortRef.current?.abort();
    };
  }, []);

  const pushMessage = useCallback((role: ChatMessage["role"], text: string) => {
    setChatMessages((prev) => [...prev, { role, text, id: nextId() }]);
  }, []);

  const currentFolderId = folderStack[folderStack.length - 1]?.id;

  const checkStatus = useCallback(async () => {
    try {
      setConnecting(true);
      const res = await fetch(`${base}/status`);
      if (!res.ok) return;
      const data = (await res.json()) as { connected: boolean };
      setConnected(data.connected);
    } catch {
      // 연결 상태 확인 실패는 치명적이지 않음
    } finally {
      setConnecting(false);
    }
  }, [base]);

  const connectDrive = useCallback(() => {
    window.location.href = `${base}/auth`;
  }, [base]);

  const loadFiles = useCallback(
    async (folderId?: string) => {
      loadAbortRef.current?.abort();
      const abortController = new AbortController();
      loadAbortRef.current = abortController;

      const seq = ++loadSeqRef.current;
      const cacheKey = folderId ?? "__root__";
      const cached = folderCacheRef.current.get(cacheKey);
      if (cached) {
        setFiles(cached);
      }
      try {
        if (!cached) setFilesLoading(true);
        setError(null);
        const url = folderId ? `${base}/files?folderId=${folderId}` : `${base}/files`;
        const res = await fetch(url, { signal: abortController.signal });
        if (!res.ok) throw new Error("파일 목록을 불러오지 못했습니다.");
        const data = (await res.json()) as { files: unknown[] };

        if (seq !== loadSeqRef.current) return;

        const normalized =
          provider === "onedrive"
            ? (data.files as Parameters<typeof normalizeOneDriveFile>[0][]).map(
                normalizeOneDriveFile,
              )
            : (data.files as Parameters<typeof normalizeGoogleDriveFile>[0][]).map(
                normalizeGoogleDriveFile,
              );

        folderCacheRef.current.set(cacheKey, normalized);
        writeFolderCache(provider, folderCacheRef.current);
        if (
          !cached ||
          JSON.stringify(normalized.map((f) => f.id)) !==
            JSON.stringify(cached.map((f) => f.id))
        ) {
          setFiles(normalized);
        }
      } catch (err) {
        if (abortController.signal.aborted || seq !== loadSeqRef.current) return;
        if (!cached) {
          setError(err instanceof Error ? err.message : "파일 목록을 불러오지 못했습니다.");
        }
      } finally {
        if (seq === loadSeqRef.current) setFilesLoading(false);
      }
    },
    [base, provider],
  );

  const navigateToFolder = useCallback(
    (id: string, name: string) => {
      setFolderStack((prev) => [...prev, { id, name }]);
      setSelectedFile(null);
      setEditablePreview(null);
      loadFiles(id);
    },
    [loadFiles],
  );

  const navigateBack = useCallback(() => {
    const stack = folderStackRef.current;
    if (stack.length <= 1) return;
    const next = stack.slice(0, -1);
    const targetId = next[next.length - 1]?.id;
    setFolderStack(next);
    setSelectedFile(null);
    setEditablePreview(null);
    loadFiles(targetId);
  }, [loadFiles]);

  const navigateToBreadcrumbIndex = useCallback(
    (index: number) => {
      const next = folderStackRef.current.slice(0, index + 1);
      const targetId = next[next.length - 1]?.id;
      setFolderStack(next);
      setSelectedFile(null);
      setEditablePreview(null);
      loadFiles(targetId);
    },
    [loadFiles],
  );

  const selectFileForPreview = useCallback((file: DriveFile) => {
    setSelectedFile(file);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
    setChatMessages([]);
  }, []);

  const analyzeSelectedFile = useCallback(async () => {
    if (!selectedFile) return;
    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    try {
      setAnalyzing(true);
      setError(null);
      setStreamingText(null);
      const res = await fetch(`${base}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          fileId: selectedFile.id,
          fileName: selectedFile.name,
          mimeType: selectedFile.mimeType,
        }),
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
  }, [base, selectedFile, pushMessage]);

  const updatePreview = useCallback((updated: ImportPreview) => {
    setEditablePreview(updated);
  }, []);

  const confirmImport = useCallback(async () => {
    if (!editablePreview) return;
    try {
      setImporting(true);
      setError(null);
      const res = await fetch(`${base}/import`, {
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
  }, [base, editablePreview, onImportComplete]);

  const deselectFile = useCallback(() => {
    setSelectedFile(null);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
  }, []);

  const refineWithInstruction = useCallback(async (instruction: string) => {
    if (!selectedFile || !editablePreview) return;
    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    pushMessage("user", instruction);
    const prevPreview = editablePreview;
    try {
      setAnalyzing(true);
      setError(null);
      setStreamingText(null);
      const res = await fetch(`${base}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          fileId: selectedFile.id,
          fileName: selectedFile.name,
          mimeType: selectedFile.mimeType,
          instruction,
          previousResult: prevPreview,
        }),
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
  }, [base, selectedFile, editablePreview, pushMessage]);

  const resetState = useCallback(() => {
    setFiles([]);
    setSelectedFile(null);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
    setFolderStack([ROOT_FOLDER]);
    setChatMessages([]);
    folderCacheRef.current.clear();
    localStorage.removeItem(storageCacheKey(provider));
  }, [provider]);

  const fileProxyUrl =
    selectedFile
      ? `${base}/file/${selectedFile.id}${selectedFile.mimeType ? `?mimeType=${encodeURIComponent(selectedFile.mimeType)}` : ""}`
      : null;

  return {
    connected,
    connecting,
    files,
    filesLoading,
    selectedFile,
    analyzing,
    streamingText,
    editablePreview,
    importing,
    importResult,
    error,
    chatMessages,
    folderStack,
    currentFolderId,
    fileProxyUrl,
    viewMode,
    setViewMode,
    checkStatus,
    connectDrive,
    loadFiles,
    navigateToFolder,
    navigateBack,
    navigateToBreadcrumbIndex,
    selectFileForPreview,
    deselectFile,
    analyzeSelectedFile,
    updatePreview,
    confirmImport,
    refineWithInstruction,
    resetState,
  };
}
