"use client";

import { useCallback, useRef, useState } from "react";
import type {
  CloudProvider,
  DriveFile,
  FolderEntry,
  ImportPreview,
  ImportResult,
} from "../types";
import { detectFileKind } from "../file-kind";

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

export function useCloudImport(provider: CloudProvider, onImportComplete?: () => void) {
  const base = API_BASE[provider];

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [editablePreview, setEditablePreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<FolderEntry[]>([ROOT_FOLDER]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const folderCacheRef = useRef<Map<string, DriveFile[]>>(new Map());

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
      const cacheKey = folderId ?? "__root__";
      const cached = folderCacheRef.current.get(cacheKey);
      if (cached) {
        setFiles(cached); // 캐시 즉시 표시 → 스피너 없이 바로 보임
      }
      try {
        if (!cached) setFilesLoading(true); // 캐시 없을 때만 로딩 표시
        setError(null);
        const url = folderId ? `${base}/files?folderId=${folderId}` : `${base}/files`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("파일 목록을 불러오지 못했습니다.");
        const data = (await res.json()) as { files: unknown[] };

        const normalized =
          provider === "onedrive"
            ? (data.files as Parameters<typeof normalizeOneDriveFile>[0][]).map(
                normalizeOneDriveFile,
              )
            : (data.files as Parameters<typeof normalizeGoogleDriveFile>[0][]).map(
                normalizeGoogleDriveFile,
              );

        folderCacheRef.current.set(cacheKey, normalized);
        // 캐시와 다를 때만 업데이트 (불필요한 리렌더 방지)
        if (
          !cached ||
          JSON.stringify(normalized.map((f) => f.id)) !==
            JSON.stringify(cached.map((f) => f.id))
        ) {
          setFiles(normalized);
        }
      } catch (err) {
        if (!cached) {
          // 캐시 없는 상태에서 실패 → 에러 표시
          setError(err instanceof Error ? err.message : "파일 목록을 불러오지 못했습니다.");
        }
        // 캐시 있는 상태에서 백그라운드 갱신 실패는 무시 (이미 캐시 데이터 표시 중)
      } finally {
        setFilesLoading(false);
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
    setFolderStack((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      const parentId = next[next.length - 1]?.id;
      setSelectedFile(null);
      setEditablePreview(null);
      loadFiles(parentId);
      return next;
    });
  }, [loadFiles]);

  const navigateToBreadcrumbIndex = useCallback(
    (index: number) => {
      setFolderStack((prev) => {
        const next = prev.slice(0, index + 1);
        const targetId = next[next.length - 1]?.id;
        setSelectedFile(null);
        setEditablePreview(null);
        loadFiles(targetId);
        return next;
      });
    },
    [loadFiles],
  );

  const selectFileForPreview = useCallback((file: DriveFile) => {
    setSelectedFile(file);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
  }, []);

  const analyzeSelectedFile = useCallback(async () => {
    if (!selectedFile) return;
    try {
      setAnalyzing(true);
      setError(null);
      const body = {
        fileId: selectedFile.id,
        fileName: selectedFile.name,
        mimeType: selectedFile.mimeType,
      };

      const res = await fetch(`${base}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
  }, [base, selectedFile]);

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
    try {
      setAnalyzing(true);
      setError(null);
      const res = await fetch(`${base}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: selectedFile.id,
          fileName: selectedFile.name,
          mimeType: selectedFile.mimeType,
          instruction,
          previousResult: editablePreview,
        }),
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
  }, [base, selectedFile, editablePreview]);

  const resetState = useCallback(() => {
    setFiles([]);
    setSelectedFile(null);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
    setFolderStack([ROOT_FOLDER]);
  }, []);

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
    editablePreview,
    importing,
    importResult,
    error,
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
