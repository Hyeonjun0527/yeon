"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatMessage,
  DriveFile,
  ImportHook,
  ImportPreview,
  ImportResult,
} from "../types";
import { detectFileKind } from "../file-kind";
import { diffText, nextId, readImportSSE, summaryText } from "./import-helpers";

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
  expiresAt: string;
  updatedAt: string;
};

export interface UseLocalImportReturn extends ImportHook {
  selectLocalFile: (file: File) => void;
}

export function useLocalImport(
  onImportComplete?: () => void,
): UseLocalImportReturn {
  const rawFileRef = useRef<File | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  const previewSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [selectedFile, setSelectedFile] = useState<DriveFile | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [editablePreview, setEditablePreview] = useState<ImportPreview | null>(
    null,
  );
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);

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

  const clearStoredDraftId = useCallback(() => {
    setDraftId(null);
    setRecoveryNotice(null);
    setRestoredFromDraft(false);
    localStorage.removeItem(LOCAL_IMPORT_DRAFT_STORAGE_KEY);
  }, []);

  const persistDraftId = useCallback((nextDraftId: string) => {
    setDraftId(nextDraftId);
    localStorage.setItem(LOCAL_IMPORT_DRAFT_STORAGE_KEY, nextDraftId);
  }, []);

  const applyDraftSnapshot = useCallback(
    (snapshot: LocalImportDraftSnapshot) => {
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

        const snapshot = (await res.json()) as LocalImportDraftSnapshot;
        applyDraftSnapshot(snapshot);
      } catch {
        clearStoredDraftId();
      }
    },
    [applyDraftSnapshot, clearStoredDraftId],
  );

  useEffect(() => {
    const savedDraftId = localStorage.getItem(LOCAL_IMPORT_DRAFT_STORAGE_KEY);
    if (!savedDraftId) return;
    void restoreDraft(savedDraftId);
  }, [restoreDraft]);

  useEffect(() => {
    if (!draftId || !restoredFromDraft || !analyzing) return;

    const timer = setInterval(() => {
      void restoreDraft(draftId);
    }, 4000);

    return () => clearInterval(timer);
  }, [analyzing, draftId, restoredFromDraft, restoreDraft]);

  const selectLocalFile = useCallback(
    (file: File) => {
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
      setRecoveryNotice(null);
      setAnalyzing(false);
      setStreamingText(null);
      setEditablePreview(null);
      setImportResult(null);
      setError(null);
      setChatMessages([]);
    },
    [clearStoredDraftId],
  );

  const analyzeSelectedFile = useCallback(async () => {
    if (!rawFileRef.current && !draftId) return;

    analyzeAbortRef.current?.abort();
    const controller = new AbortController();
    analyzeAbortRef.current = controller;

    try {
      setAnalyzing(true);
      setError(null);
      setStreamingText(null);

      const formData = new FormData();
      if (rawFileRef.current) {
        formData.append("file", rawFileRef.current);
      }
      if (draftId) {
        formData.append("draftId", draftId);
      }

      const res = await fetch("/api/v1/integrations/local/analyze", {
        method: "POST",
        headers: { Accept: "text/event-stream" },
        body: formData,
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(
          await res.text().catch(() => "파일 분석에 실패했습니다."),
        );
      }

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
  }, [draftId, persistDraftId, pushMessage]);

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
    setSelectedFile(null);
    setLocalPreviewUrl(null);
    setAnalyzing(false);
    setStreamingText(null);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
    setChatMessages([]);
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
    setSelectedFile(null);
    setLocalPreviewUrl(null);
    setAnalyzing(false);
    setStreamingText(null);
    setEditablePreview(null);
    setImportResult(null);
    setError(null);
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
      if ((!rawFileRef.current && !draftId) || !editablePreview) return;

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
        if (rawFileRef.current) {
          formData.append("file", rawFileRef.current);
        }
        if (draftId) {
          formData.append("draftId", draftId);
        }
        formData.append("instruction", instruction);
        formData.append("previousResult", JSON.stringify(prevPreview));

        const res = await fetch("/api/v1/integrations/local/analyze", {
          method: "POST",
          headers: { Accept: "text/event-stream" },
          body: formData,
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error(
            await res.text().catch(() => "파일 재분석에 실패했습니다."),
          );
        }

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
    [draftId, editablePreview, persistDraftId, pushMessage],
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
  };
}
