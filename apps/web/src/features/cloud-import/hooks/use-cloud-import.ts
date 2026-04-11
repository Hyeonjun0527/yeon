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

function draftStorageKey(provider: CloudProvider) {
  return `yeon:import-draft:${provider}`;
}

const IMPORT_DRAFT_RETENTION_TEXT =
  "임시 초안은 마지막 저장 시점부터 7일간 보관되며, 새로고침 후에도 복구할 수 있습니다.";

type CloudImportDraftSnapshot = {
  id: string;
  provider: "local" | CloudProvider;
  status:
    | "uploaded"
    | "analyzing"
    | "analyzed"
    | "edited"
    | "imported"
    | "error";
  selectedFile: DriveFile;
  preview: ImportPreview | null;
  importResult: ImportResult | null;
  error: string | null;
  expiresAt: string;
  updatedAt: string;
};

function readFolderCache(provider: CloudProvider): Map<string, DriveFile[]> {
  try {
    const raw = localStorage.getItem(storageCacheKey(provider));
    if (!raw) return new Map();
    const parsed = JSON.parse(raw) as {
      ts: number;
      data: Record<string, DriveFile[]>;
    };
    if (Date.now() - parsed.ts > CACHE_TTL_MS) {
      localStorage.removeItem(storageCacheKey(provider));
      return new Map();
    }
    return new Map(Object.entries(parsed.data));
  } catch {
    return new Map();
  }
}

function writeFolderCache(
  provider: CloudProvider,
  cache: Map<string, DriveFile[]>,
) {
  try {
    const payload = { ts: Date.now(), data: Object.fromEntries(cache) };
    localStorage.setItem(storageCacheKey(provider), JSON.stringify(payload));
  } catch {
    // 스토리지 용량 초과 시 무시
  }
}

export function useCloudImport(
  provider: CloudProvider,
  onImportComplete?: () => void,
) {
  const base = API_BASE[provider];

  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [editablePreview, setEditablePreview] = useState<ImportPreview | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<FolderEntry[]>([ROOT_FOLDER]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);
  const folderCacheRef = useRef<Map<string, DriveFile[]>>(
    readFolderCache(provider),
  );
  const loadSeqRef = useRef(0);
  const loadAbortRef = useRef<AbortController | null>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const previewSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const folderStackRef = useRef(folderStack);
  folderStackRef.current = folderStack;

  // 언마운트 시 진행 중인 분석 abort
  useEffect(() => {
    return () => {
      analyzeAbortRef.current?.abort();
      if (previewSaveTimerRef.current) {
        clearTimeout(previewSaveTimerRef.current);
        previewSaveTimerRef.current = null;
      }
    };
  }, []);

  const pushMessage = useCallback((role: ChatMessage["role"], text: string) => {
    setChatMessages((prev) => [...prev, { role, text, id: nextId() }]);
  }, []);

  const clearStoredDraftId = useCallback(() => {
    setDraftId(null);
    setRecoveryNotice(null);
    setRestoredFromDraft(false);
    localStorage.removeItem(draftStorageKey(provider));
  }, [provider]);

  const persistDraftId = useCallback(
    (nextDraftId: string) => {
      setDraftId(nextDraftId);
      localStorage.setItem(draftStorageKey(provider), nextDraftId);
    },
    [provider],
  );

  const applyDraftSnapshot = useCallback(
    (snapshot: CloudImportDraftSnapshot) => {
      setDraftId(snapshot.id);
      setSelectedFile(snapshot.selectedFile);
      setEditablePreview(snapshot.preview);
      setImportResult(snapshot.importResult);
      setError(snapshot.error);
      setAnalyzing(snapshot.status === "analyzing");
      setRecoveryNotice(
        snapshot.status === "analyzing"
          ? "분석 중이던 작업을 복구했습니다. 완료되면 결과가 이어집니다."
          : snapshot.status === "edited"
            ? "수정 중이던 가져오기 초안을 복구했습니다."
            : snapshot.status === "analyzed"
              ? "분석 결과를 복구했습니다. 이어서 검토하고 가져오세요."
              : null,
      );
      setStreamingText(
        snapshot.status === "analyzing"
          ? "이전 분석 작업을 복구하고 있습니다..."
          : null,
      );
      setRestoredFromDraft(true);
    },
    [],
  );

  const restoreDraft = useCallback(
    async (targetDraftId: string) => {
      try {
        const res = await fetch(
          `/api/v1/integrations/local/drafts/${targetDraftId}`,
        );
        if (!res.ok) {
          throw new Error(
            await res
              .text()
              .catch(() => "가져오기 초안을 불러오지 못했습니다."),
          );
        }

        const snapshot = (await res.json()) as CloudImportDraftSnapshot;
        if (snapshot.provider !== provider) {
          clearStoredDraftId();
          return;
        }
        applyDraftSnapshot(snapshot);
      } catch {
        clearStoredDraftId();
      }
    },
    [applyDraftSnapshot, clearStoredDraftId, provider],
  );

  useEffect(() => {
    const savedDraftId = localStorage.getItem(draftStorageKey(provider));
    if (!savedDraftId) return;
    void restoreDraft(savedDraftId);
  }, [provider, restoreDraft]);

  useEffect(() => {
    if (!draftId || !restoredFromDraft || !analyzing) return;

    const timer = setInterval(() => {
      void restoreDraft(draftId);
    }, 4000);

    return () => clearInterval(timer);
  }, [analyzing, draftId, restoredFromDraft, restoreDraft]);

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
        const url = folderId
          ? `${base}/files?folderId=${folderId}`
          : `${base}/files`;
        const res = await fetch(url, { signal: abortController.signal });
        if (!res.ok) throw new Error("파일 목록을 불러오지 못했습니다.");
        const data = (await res.json()) as { files: unknown[] };

        if (seq !== loadSeqRef.current) return;

        const normalized =
          provider === "onedrive"
            ? (data.files as Parameters<typeof normalizeOneDriveFile>[0][]).map(
                normalizeOneDriveFile,
              )
            : (
                data.files as Parameters<typeof normalizeGoogleDriveFile>[0][]
              ).map(normalizeGoogleDriveFile);

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
        if (abortController.signal.aborted || seq !== loadSeqRef.current)
          return;
        if (!cached) {
          setError(
            err instanceof Error
              ? err.message
              : "파일 목록을 불러오지 못했습니다.",
          );
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

  const selectFileForPreview = useCallback(
    (file: DriveFile) => {
      if (selectedFile?.id !== file.id) {
        clearStoredDraftId();
      }
      setSelectedFile(file);
      setEditablePreview(null);
      setImportResult(null);
      setError(null);
      setChatMessages([]);
      setAnalyzing(false);
      setStreamingText(null);
    },
    [clearStoredDraftId, selectedFile?.id],
  );

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
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        body: JSON.stringify({
          draftId: draftId ?? undefined,
          fileId: selectedFile.id,
          fileName: selectedFile.name,
          mimeType: selectedFile.mimeType,
          size: selectedFile.size,
          lastModifiedAt: selectedFile.lastModifiedAt,
        }),
        signal: controller.signal,
      });
      if (!res.ok)
        throw new Error(
          await res.text().catch(() => "파일 분석에 실패했습니다."),
        );

      const nextDraftId = res.headers.get("x-import-draft-id");
      if (nextDraftId) {
        persistDraftId(nextDraftId);
        setRecoveryNotice(null);
        setRestoredFromDraft(false);
      }

      const result = await readImportSSE(
        res,
        (text) => setStreamingText(text),
        controller.signal,
      );
      if (result.error) throw new Error(result.error);
      if (result.preview) {
        setEditablePreview(structuredClone(result.preview));
        pushMessage(
          "ai",
          `파일 분석이 완료됐습니다! ${summaryText(result.preview)}을 찾았습니다. 수정이 필요하면 말씀해 주세요.`,
        );
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(
        err instanceof Error ? err.message : "파일 분석에 실패했습니다.",
      );
    } finally {
      if (analyzeAbortRef.current === controller) {
        setAnalyzing(false);
        setStreamingText(null);
        analyzeAbortRef.current = null;
      }
    }
  }, [base, draftId, persistDraftId, selectedFile, pushMessage]);

  const updatePreview = useCallback(
    (updated: ImportPreview) => {
      setEditablePreview(updated);

      setRecoveryNotice(null);

      if (!draftId) return;

      if (previewSaveTimerRef.current) {
        clearTimeout(previewSaveTimerRef.current);
      }

      previewSaveTimerRef.current = setTimeout(() => {
        void fetch(`/api/v1/integrations/local/drafts/${draftId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updated),
        }).catch(() => {
          // 자동 저장 실패는 다음 입력 기회에서 재시도
        });
      }, 400);
    },
    [draftId],
  );

  const confirmImport = useCallback(async () => {
    if (!editablePreview) return;
    try {
      setImporting(true);
      setError(null);
      const res = await fetch(`${base}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftId: draftId ?? undefined,
          preview: editablePreview,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "가져오기에 실패했습니다.");
      }
      const data = (await res.json()) as {
        created: { spaces: number; members: number };
      };
      setImportResult(data.created);
      clearStoredDraftId();
      onImportComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "가져오기에 실패했습니다.");
    } finally {
      setImporting(false);
    }
  }, [base, clearStoredDraftId, draftId, editablePreview, onImportComplete]);

  const deselectFile = useCallback(() => {
    clearStoredDraftId();
    setSelectedFile(null);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
    setAnalyzing(false);
    setStreamingText(null);
    setChatMessages([]);
  }, [clearStoredDraftId]);

  const discardDraft = useCallback(async () => {
    analyzeAbortRef.current?.abort();
    const currentDraftId = draftId;

    clearStoredDraftId();
    setSelectedFile(null);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
    setAnalyzing(false);
    setStreamingText(null);
    setChatMessages([]);

    if (!currentDraftId) return;

    await fetch(`/api/v1/integrations/local/drafts/${currentDraftId}`, {
      method: "DELETE",
    }).catch(() => {
      // 초안 삭제 실패는 조용히 무시하고 UI 상태만 정리
    });
  }, [clearStoredDraftId, draftId]);

  const refineWithInstruction = useCallback(
    async (instruction: string) => {
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
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            draftId: draftId ?? undefined,
            fileId: selectedFile.id,
            fileName: selectedFile.name,
            mimeType: selectedFile.mimeType,
            size: selectedFile.size,
            lastModifiedAt: selectedFile.lastModifiedAt,
            instruction,
            previousResult: prevPreview,
          }),
          signal: controller.signal,
        });
        if (!res.ok)
          throw new Error(
            await res.text().catch(() => "파일 재분석에 실패했습니다."),
          );

        const nextDraftId = res.headers.get("x-import-draft-id");
        if (nextDraftId) {
          persistDraftId(nextDraftId);
          setRecoveryNotice(null);
          setRestoredFromDraft(false);
        }

        const result = await readImportSSE(
          res,
          (text) => setStreamingText(text),
          controller.signal,
        );
        if (result.error) throw new Error(result.error);
        if (result.preview) {
          setEditablePreview(structuredClone(result.preview));
          pushMessage("ai", diffText(prevPreview, result.preview));
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        const msg =
          err instanceof Error ? err.message : "파일 재분석에 실패했습니다.";
        setError(msg);
        pushMessage("ai", `오류가 발생했습니다: ${msg}`);
      } finally {
        if (analyzeAbortRef.current === controller) {
          setAnalyzing(false);
          setStreamingText(null);
          analyzeAbortRef.current = null;
        }
      }
    },
    [base, draftId, persistDraftId, selectedFile, editablePreview, pushMessage],
  );

  const resetState = useCallback(() => {
    clearStoredDraftId();
    setFiles([]);
    setSelectedFile(null);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
    setFolderStack([ROOT_FOLDER]);
    setChatMessages([]);
    folderCacheRef.current.clear();
    localStorage.removeItem(storageCacheKey(provider));
  }, [clearStoredDraftId, provider]);

  const fileProxyUrl = selectedFile
    ? `${base}/file/${selectedFile.id}${selectedFile.mimeType ? `?mimeType=${encodeURIComponent(selectedFile.mimeType)}` : ""}`
    : null;
  const draftPolicyText = draftId ? IMPORT_DRAFT_RETENTION_TEXT : null;

  return {
    connected,
    connecting,
    files,
    filesLoading,
    selectedFile,
    recoveryNotice,
    draftPolicyText,
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
    discardDraft,
    resetState,
  };
}
