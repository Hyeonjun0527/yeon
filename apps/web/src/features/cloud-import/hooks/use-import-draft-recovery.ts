"use client";

import { useCallback, useEffect, useState } from "react";

import {
  getDraftRecoveryNotice,
  type RecoverableImportDraftStatus,
} from "./import-helpers";

type RecoverableImportDraftSnapshot = {
  id: string;
  status: RecoverableImportDraftStatus;
};

interface UseImportDraftRecoveryOptions<
  TSnapshot extends RecoverableImportDraftSnapshot,
> {
  storageKey: string;
  analyzing: boolean;
  initialDraftId?: string | null;
  loadDraft: (draftId: string) => Promise<TSnapshot | null>;
  applySnapshot: (snapshot: TSnapshot) => void;
}

export function useImportDraftRecovery<
  TSnapshot extends RecoverableImportDraftSnapshot,
>({
  storageKey,
  analyzing,
  initialDraftId,
  loadDraft,
  applySnapshot,
}: UseImportDraftRecoveryOptions<TSnapshot>) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<string | null>(null);
  const [restoredFromDraft, setRestoredFromDraft] = useState(false);

  const clearStoredDraftId = useCallback(() => {
    setDraftId(null);
    setRecoveryNotice(null);
    setRestoredFromDraft(false);
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const persistDraftId = useCallback(
    (nextDraftId: string) => {
      setDraftId(nextDraftId);
      localStorage.setItem(storageKey, nextDraftId);
    },
    [storageKey],
  );

  const clearRecoveryNotice = useCallback(() => {
    setRecoveryNotice(null);
  }, []);

  const markFreshDraft = useCallback(
    (nextDraftId: string) => {
      persistDraftId(nextDraftId);
      setRecoveryNotice(null);
      setRestoredFromDraft(false);
    },
    [persistDraftId],
  );

  const restoreDraft = useCallback(
    async (targetDraftId: string) => {
      try {
        const snapshot = await loadDraft(targetDraftId);
        if (!snapshot) {
          clearStoredDraftId();
          return;
        }

        persistDraftId(snapshot.id);
        applySnapshot(snapshot);
        setRecoveryNotice(getDraftRecoveryNotice(snapshot.status));
        setRestoredFromDraft(true);
      } catch {
        clearStoredDraftId();
      }
    },
    [applySnapshot, clearStoredDraftId, loadDraft, persistDraftId],
  );

  useEffect(() => {
    const preferredDraftId = initialDraftId?.trim();

    if (!preferredDraftId) {
      return;
    }

    markFreshDraft(preferredDraftId);
    void restoreDraft(preferredDraftId);
  }, [initialDraftId, markFreshDraft, restoreDraft, storageKey]);

  useEffect(() => {
    if (!draftId || !restoredFromDraft || !analyzing) {
      return;
    }

    const timer = setInterval(() => {
      void restoreDraft(draftId);
    }, 4000);

    return () => clearInterval(timer);
  }, [analyzing, draftId, restoredFromDraft, restoreDraft]);

  return {
    draftId,
    recoveryNotice,
    clearStoredDraftId,
    clearRecoveryNotice,
    markFreshDraft,
    restoreDraft,
  };
}
