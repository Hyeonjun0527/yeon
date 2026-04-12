import type { Dispatch, SetStateAction } from "react";

import type { ImportAnalysisStage } from "@/lib/import-analysis-progress";
import type {
  ChatMessage,
  DriveFile,
  ImportPreview,
  ImportResult,
} from "../types";

interface ImportStateResetters {
  setAnalyzing: Dispatch<SetStateAction<boolean>>;
  setStreamingText: Dispatch<SetStateAction<string | null>>;
  setEditablePreview: Dispatch<SetStateAction<ImportPreview | null>>;
  setImportResult: Dispatch<SetStateAction<ImportResult | null>>;
  setError: Dispatch<SetStateAction<string | null>>;
  setChatMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  setSelectedFile?: Dispatch<SetStateAction<DriveFile | null>>;
  setLocalPreviewUrl?: Dispatch<SetStateAction<string | null>>;
  setProcessingStage?: Dispatch<SetStateAction<ImportAnalysisStage | null>>;
  setProcessingProgress?: Dispatch<SetStateAction<number>>;
  setProcessingMessage?: Dispatch<SetStateAction<string | null>>;
}

interface ResetImportStateOptions {
  clearSelectedFile?: boolean;
  clearLocalPreviewUrl?: boolean;
  clearProcessingState?: boolean;
}

export function resetImportState(
  resetters: ImportStateResetters,
  options: ResetImportStateOptions = {},
) {
  if (options.clearSelectedFile) {
    resetters.setSelectedFile?.(null);
  }

  if (options.clearLocalPreviewUrl) {
    resetters.setLocalPreviewUrl?.(null);
  }

  resetters.setAnalyzing(false);
  resetters.setStreamingText(null);
  resetters.setEditablePreview(null);
  resetters.setImportResult(null);
  resetters.setError(null);
  resetters.setChatMessages([]);

  if (options.clearProcessingState) {
    resetters.setProcessingStage?.(null);
    resetters.setProcessingProgress?.(0);
    resetters.setProcessingMessage?.(null);
  }
}
