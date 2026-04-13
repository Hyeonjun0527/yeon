"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ChatMessage,
  ImportCommitResult,
  DriveFile,
  ImportHook,
  ImportPreview,
  ImportResult,
} from "../types";
import { detectFileKind } from "../file-kind";
import {
  diffText,
  getCompletedAnalysisState,
  getQueuedAnalysisState,
  nextId,
  runImportAnalysisRequest,
  summaryText,
} from "./import-helpers";
import { answerLocalPreviewQuestion } from "./local-preview-assistant";
import { applyLocalPreviewRefinement } from "./local-preview-refinement";
import { resetImportState } from "./import-state-reset";
import { useImportDraftRecovery } from "./use-import-draft-recovery";

const LOCAL_IMPORT_DRAFT_STORAGE_KEY = "yeon:local-import:last-draft-id";
const IMPORT_DRAFT_RETENTION_TEXT =
  "임시 초안은 마지막 저장 시점부터 7일간 보관되며, 새로고침 후에도 복구할 수 있습니다.";

type LocalImportDraftSnapshot = {
  id: string;
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

export interface UseLocalImportReturn extends ImportHook {
  selectLocalFile: (file: File) => void;
  restoreDraftById: (draftId: string) => Promise<void>;
  currentDraftId: string | null;
}

export function useLocalImport(
  onImportComplete?: (result: ImportCommitResult) => void,
  initialDraftId?: string | null,
  onDraftDiscarded?: () => void,
): UseLocalImportReturn {
  const rawFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const previewSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    return () => {
      analyzeAbortRef.current?.abort();
      if (previewSaveTimerRef.current) {
        clearTimeout(previewSaveTimerRef.current);
        previewSaveTimerRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  const pushMessage = useCallback((role: ChatMessage["role"], text: string) => {
    setChatMessages((prev) => [...prev, { role, text, id: nextId() }]);
  }, []);

  const applyDraftSnapshot = useCallback(
    (snapshot: LocalImportDraftSnapshot) => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      rawFileRef.current = null;
      setSelectedFile(snapshot.selectedFile);
      setLocalPreviewUrl(null);
      setEditablePreview(snapshot.preview);
      setImportResult(snapshot.importResult);
      setError(snapshot.error);
      setChatMessages([]);
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

  const loadDraft = useCallback(async (targetDraftId: string) => {
    const res = await fetch(
      `/api/v1/integrations/local/drafts/${targetDraftId}`,
    );
    if (!res.ok) {
      throw new Error(
        await res.text().catch(() => "가져오기 초안을 불러오지 못했습니다."),
      );
    }

    return (await res.json()) as LocalImportDraftSnapshot;
  }, []);

  const {
    draftId,
    recoveryNotice,
    clearStoredDraftId,
    clearRecoveryNotice,
    markFreshDraft,
    restoreDraft,
  } = useImportDraftRecovery({
    storageKey: LOCAL_IMPORT_DRAFT_STORAGE_KEY,
    analyzing,
    initialDraftId,
    loadDraft,
    applySnapshot: applyDraftSnapshot,
  });

  const selectLocalFile = useCallback(
    (file: File) => {
      analyzeAbortRef.current?.abort();
      analyzeAbortRef.current = null;
      if (previewSaveTimerRef.current) {
        clearTimeout(previewSaveTimerRef.current);
        previewSaveTimerRef.current = null;
      }
      clearStoredDraftId();
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
      setLocalPreviewUrl(url);
      resetImportState(
        {
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
        { clearProcessingState: true },
      );
    },
    [clearStoredDraftId],
  );

  const analyzeSelectedFile = useCallback(async () => {
    if (!rawFileRef.current && !draftId) return;

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

      const formData = new FormData();
      if (rawFileRef.current) {
        formData.append("file", rawFileRef.current);
      }
      if (draftId) {
        formData.append("draftId", draftId);
      }

      const analysisResult = await runImportAnalysisRequest({
        request: () =>
          fetch("/api/v1/integrations/local/analyze", {
            method: "POST",
            headers: { Accept: "text/event-stream" },
            body: formData,
            signal: controller.signal,
          }),
        signal: controller.signal,
        fallbackErrorMessage: "파일 분석에 실패했습니다.",
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
      startTransition(() => {
        setEditablePreview(analysisResult.preview);
      });
      pushMessage(
        "ai",
        `파일 분석이 완료됐습니다! ${summaryText(analysisResult.preview)}을 찾았습니다. 수정이 필요하면 말씀해 주세요.`,
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
  }, [draftId, markFreshDraft, pushMessage]);

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
      const res = await fetch("/api/v1/integrations/local/import", {
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

      const data = (await res.json()) as ImportCommitResult;
      setImportResult(data.created);
      clearStoredDraftId();
      onImportComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "가져오기에 실패했습니다.");
    } finally {
      setImporting(false);
    }
  }, [clearStoredDraftId, draftId, editablePreview, onImportComplete]);

  const selectFileForPreview = useCallback((_file: DriveFile) => {
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
    setChatMessages([]);
  }, []);

  const deselectFile = useCallback(() => {
    clearStoredDraftId();
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    rawFileRef.current = null;
    resetImportState(
      {
        setSelectedFile,
        setLocalPreviewUrl,
        setAnalyzing,
        setStreamingText,
        setEditablePreview,
        setImportResult,
        setError,
        setChatMessages,
      },
      {
        clearSelectedFile: true,
        clearLocalPreviewUrl: true,
      },
    );
  }, [clearStoredDraftId]);

  const discardDraft = useCallback(async () => {
    analyzeAbortRef.current?.abort();
    const currentDraftId = draftId;

    clearStoredDraftId();
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    rawFileRef.current = null;
    resetImportState(
      {
        setSelectedFile,
        setLocalPreviewUrl,
        setAnalyzing,
        setStreamingText,
        setEditablePreview,
        setImportResult,
        setError,
        setChatMessages,
      },
      {
        clearSelectedFile: true,
        clearLocalPreviewUrl: true,
      },
    );

    if (!currentDraftId) return;

    await fetch(`/api/v1/integrations/local/drafts/${currentDraftId}`, {
      method: "DELETE",
    }).catch(() => {
      // 초안 삭제 실패는 조용히 무시하고 UI 상태만 정리
    });
    onDraftDiscarded?.();
  }, [clearStoredDraftId, draftId, onDraftDiscarded]);

  const refineWithInstruction = useCallback(
    async (instruction: string) => {
      if ((!rawFileRef.current && !draftId) || !editablePreview) return;

      const trimmedInstruction = instruction.trim();
      if (!trimmedInstruction) return;

      pushMessage("user", trimmedInstruction);

      const localAnswer = answerLocalPreviewQuestion(
        editablePreview,
        trimmedInstruction,
      );

      if (localAnswer) {
        pushMessage("ai", localAnswer.message);
        return;
      }

      const localRefinement = applyLocalPreviewRefinement(
        editablePreview,
        trimmedInstruction,
      );

      if (localRefinement) {
        const completedState = getCompletedAnalysisState();
        setError(null);
        setProcessingStage(completedState.stage);
        setProcessingProgress(completedState.progress);
        setProcessingMessage(completedState.message);
        setStreamingText(null);
        startTransition(() => {
          setEditablePreview(localRefinement.preview);
        });
        clearRecoveryNotice();

        if (draftId) {
          if (previewSaveTimerRef.current) {
            clearTimeout(previewSaveTimerRef.current);
          }

          previewSaveTimerRef.current = setTimeout(() => {
            void fetch(`/api/v1/integrations/local/drafts/${draftId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(localRefinement.preview),
            }).catch(() => {
              // 자동 저장 실패는 다음 입력 기회에서 재시도
            });
          }, 400);
        }

        pushMessage("ai", localRefinement.message);
        return;
      }

      analyzeAbortRef.current?.abort();
      const controller = new AbortController();
      analyzeAbortRef.current = controller;
      const prevPreview = editablePreview;

      try {
        const queuedState = getQueuedAnalysisState();
        setAnalyzing(true);
        setError(null);
        setProcessingStage(queuedState.stage);
        setProcessingProgress(queuedState.progress);
        setProcessingMessage(queuedState.message);
        setStreamingText(null);

        const formData = new FormData();
        if (rawFileRef.current) {
          formData.append("file", rawFileRef.current);
        }
        if (draftId) {
          formData.append("draftId", draftId);
        }
        formData.append("instruction", trimmedInstruction);
        formData.append("previousResult", JSON.stringify(prevPreview));

        const analysisResult = await runImportAnalysisRequest({
          request: () =>
            fetch("/api/v1/integrations/local/analyze", {
              method: "POST",
              headers: { Accept: "text/event-stream" },
              body: formData,
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
        startTransition(() => {
          setEditablePreview(analysisResult.preview);
        });
        pushMessage(
          "ai",
          analysisResult.assistantMessage?.trim() ||
            diffText(prevPreview, analysisResult.preview),
        );
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
    [
      clearRecoveryNotice,
      draftId,
      editablePreview,
      markFreshDraft,
      pushMessage,
    ],
  );

  const fileProxyUrl =
    draftId != null
      ? `/api/v1/integrations/local/drafts/${draftId}/file`
      : localPreviewUrl;
  const draftPolicyText = draftId ? IMPORT_DRAFT_RETENTION_TEXT : null;

  return {
    selectedFile,
    fileProxyUrl,
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
    analyzeSelectedFile,
    updatePreview,
    confirmImport,
    selectFileForPreview,
    deselectFile,
    discardDraft,
    refineWithInstruction,
    selectLocalFile,
    restoreDraftById: restoreDraft,
    currentDraftId: draftId,
  };
}
