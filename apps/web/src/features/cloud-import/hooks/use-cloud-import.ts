"use client";

import { useCallback, useState } from "react";
import type { CloudProvider, DriveFile, ImportPreview, ImportResult } from "../types";

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
  const lower = f.name.toLowerCase();
  return {
    ...f,
    isFolder: !f.mimeType,
    isSpreadsheet: lower.endsWith(".xlsx") || lower.endsWith(".xls"),
  };
}

function normalizeGoogleDriveFile(f: {
  id: string;
  name: string;
  size: number;
  lastModifiedAt: string;
  mimeType: string;
}): DriveFile {
  const lower = f.name.toLowerCase();
  return {
    ...f,
    isFolder: f.mimeType === "application/vnd.google-apps.folder",
    isSpreadsheet:
      f.mimeType === "application/vnd.google-apps.spreadsheet" ||
      lower.endsWith(".xlsx") ||
      lower.endsWith(".xls"),
  };
}

export function useCloudImport(provider: CloudProvider, onImportComplete?: () => void) {
  const base = API_BASE[provider];

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [editablePreview, setEditablePreview] = useState<ImportPreview | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
      try {
        setFilesLoading(true);
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

        setFiles(normalized);
      } catch (err) {
        setError(err instanceof Error ? err.message : "파일 목록을 불러오지 못했습니다.");
      } finally {
        setFilesLoading(false);
      }
    },
    [base, provider],
  );

  const analyzeFile = useCallback(
    async (file: DriveFile) => {
      try {
        setAnalyzing(true);
        setError(null);
        const body =
          provider === "googledrive"
            ? { fileId: file.id, mimeType: file.mimeType }
            : { fileId: file.id };

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
        setPreview(data);
        setEditablePreview(structuredClone(data));
        setShowFileBrowser(false);
        setShowPreview(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "파일 분석에 실패했습니다.");
      } finally {
        setAnalyzing(false);
      }
    },
    [base, provider],
  );

  const selectFile = useCallback(
    (file: DriveFile) => {
      setSelectedFile(file);
      analyzeFile(file);
    },
    [analyzeFile],
  );

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

  const resetState = useCallback(() => {
    setFiles([]);
    setSelectedFile(null);
    setPreview(null);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
    setShowFileBrowser(false);
    setShowPreview(false);
  }, []);

  return {
    connected,
    connecting,
    files,
    filesLoading,
    selectedFile,
    analyzing,
    preview,
    editablePreview,
    importing,
    importResult,
    error,
    showFileBrowser,
    showPreview,
    checkStatus,
    connectDrive,
    loadFiles,
    selectFile,
    analyzeFile,
    updatePreview,
    confirmImport,
    resetState,
    setShowFileBrowser,
    setShowPreview,
  };
}
