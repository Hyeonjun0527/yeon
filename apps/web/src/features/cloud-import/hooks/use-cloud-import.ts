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
import {
  diffText,
  getCompletedAnalysisState,
  getQueuedAnalysisState,
  nextId,
  runImportAnalysisRequest,
  summaryText,
} from "./import-helpers";
import { normalizeCloudDriveFiles } from "./cloud-file-normalizers";
import { resetImportState } from "./import-state-reset";
import { useImportDraftRecovery } from "./use-import-draft-recovery";

const API_BASE: Record<CloudProvider, string> = {
  onedrive: "/api/v1/integrations/onedrive",
  googledrive: "/api/v1/integrations/googledrive",
};

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
  processingStage: import("@/lib/import-analysis-progress").ImportAnalysisStage;
  processingProgress: number;
  processingMessage: string | null;
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
  const [processingStage, setProcessingStage] = useState<
    import("@/lib/import-analysis-progress").ImportAnalysisStage | null
  >(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingMessage, setProcessingMessage] = useState<string | null>(
    null,
  );
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [editablePreview, setEditablePreview] = useState<ImportPreview | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [folderStack, setFolderStack] = useState<FolderEntry[]>([ROOT_FOLDER]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
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

  const applyDraftSnapshot = useCallback(
    (snapshot: CloudImportDraftSnapshot) => {
      setSelectedFile(snapshot.selectedFile);
      setEditablePreview(snapshot.preview);
      setImportResult(snapshot.importResult);
      setError(snapshot.error);
      setAnalyzing(snapshot.status === "analyzing");
      setProcessingStage(snapshot.processingStage);
      setProcessingProgress(snapshot.processingProgress);
      setProcessingMessage(snapshot.processingMessage);
      setStreamingText(
        snapshot.status === "analyzing" ? snapshot.processingMessage : null,
      );
    },
    [],
  );

  const loadDraft = useCallback(
    async (targetDraftId: string) => {
      const res = await fetch(
        `/api/v1/integrations/local/drafts/${targetDraftId}`,
      );
      if (!res.ok) {
        throw new Error(
          await res.text().catch(() => "가져오기 초안을 불러오지 못했습니다."),
        );
      }

      const snapshot = (await res.json()) as CloudImportDraftSnapshot;
      return snapshot.provider === provider ? snapshot : null;
    },
    [provider],
  );

  const {
    draftId,
    recoveryNotice,
    clearStoredDraftId,
    clearRecoveryNotice,
    markFreshDraft,
  } = useImportDraftRecovery({
    storageKey: draftStorageKey(provider),
    analyzing,
    loadDraft,
    applySnapshot: applyDraftSnapshot,
  });

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

        const normalized = normalizeCloudDriveFiles(
          provider,
          data.files as Array<{
            id: string;
            name: string;
            size: number;
            lastModifiedAt: string;
            mimeType?: string;
          }>,
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
      resetImportState({
        setAnalyzing,
        setStreamingText,
        setEditablePreview,
        setImportResult,
        setError,
        setChatMessages,
      });
    },
    [clearStoredDraftId, selectedFile?.id],
  );

  const analyzeSelectedFile = useCallback(async () => {
    if (!selectedFile) return;
    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    try {
      const queuedState = getQueuedAnalysisState();
      setAnalyzing(true);
      setError(null);
      setProcessingStage(queuedState.stage);
      setProcessingProgress(queuedState.progress);
      setProcessingMessage(queuedState.message);
      setStreamingText(null);
      const preview = await runImportAnalysisRequest({
        request: () =>
          fetch(`${base}/analyze`, {
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
          }),
        signal: controller.signal,
        fallbackErrorMessage: "파일 분석에 실패했습니다.",
        onDraftId: markFreshDraft,
        onProgress: (event) => {
          setStreamingText(event.text);
          setProcessingStage(event.stage ?? null);
          setProcessingProgress(event.progress ?? 0);
          setProcessingMessage(event.text);
        },
      });

      const completedState = getCompletedAnalysisState();
      setProcessingStage(completedState.stage);
      setProcessingProgress(completedState.progress);
      setProcessingMessage(completedState.message);
      setEditablePreview(structuredClone(preview));
      pushMessage(
        "ai",
        `파일 분석이 완료됐습니다! ${summaryText(preview)}을 찾았습니다. 수정이 필요하면 말씀해 주세요.`,
      );
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
  }, [base, draftId, markFreshDraft, selectedFile, pushMessage]);

  const updatePreview = useCallback(
    (updated: ImportPreview) => {
      setEditablePreview(updated);

      clearRecoveryNotice();

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
    [clearRecoveryNotice, draftId],
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
    resetImportState(
      {
        setSelectedFile,
        setAnalyzing,
        setStreamingText,
        setEditablePreview,
        setImportResult,
        setError,
        setChatMessages,
      },
      { clearSelectedFile: true },
    );
  }, [clearStoredDraftId]);

  const discardDraft = useCallback(async () => {
    analyzeAbortRef.current?.abort();
    const currentDraftId = draftId;

    clearStoredDraftId();
    resetImportState(
      {
        setSelectedFile,
        setAnalyzing,
        setStreamingText,
        setEditablePreview,
        setImportResult,
        setError,
        setChatMessages,
      },
      { clearSelectedFile: true },
    );

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
        const queuedState = getQueuedAnalysisState();
        setAnalyzing(true);
        setError(null);
        setProcessingStage(queuedState.stage);
        setProcessingProgress(queuedState.progress);
        setProcessingMessage(queuedState.message);
        setStreamingText(null);
        const preview = await runImportAnalysisRequest({
          request: () =>
            fetch(`${base}/analyze`, {
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
            }),
          signal: controller.signal,
          fallbackErrorMessage: "파일 재분석에 실패했습니다.",
          onDraftId: markFreshDraft,
          onProgress: ({ text, stage, progress }) => {
            setStreamingText(text);
            if (stage) setProcessingStage(stage);
            if (typeof progress === "number") setProcessingProgress(progress);
            setProcessingMessage(text);
          },
        });

        const completedState = getCompletedAnalysisState();
        setProcessingStage(completedState.stage);
        setProcessingProgress(completedState.progress);
        setProcessingMessage(completedState.message);
        setEditablePreview(structuredClone(preview));
        pushMessage("ai", diffText(prevPreview, preview));
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
    [base, draftId, markFreshDraft, selectedFile, editablePreview, pushMessage],
  );

  const resetState = useCallback(() => {
    clearStoredDraftId();
    setFiles([]);
    setFolderStack([ROOT_FOLDER]);
    resetImportState(
      {
        setSelectedFile,
        setAnalyzing,
        setStreamingText,
        setEditablePreview,
        setImportResult,
        setError,
        setChatMessages,
        setProcessingStage,
        setProcessingProgress,
        setProcessingMessage,
      },
      {
        clearSelectedFile: true,
        clearProcessingState: true,
      },
    );
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
    processingStage,
    processingProgress,
    processingMessage,
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
