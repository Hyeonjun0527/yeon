import { describe, expect, it, vi } from "vitest";

import { resetImportState } from "./import-state-reset";

describe("resetImportState", () => {
  it("공통 상태를 초기화하고 옵션에 따라 선택/processing 상태를 비운다", () => {
    const setSelectedFile = vi.fn();
    const setLocalPreviewUrl = vi.fn();
    const setAnalyzing = vi.fn();
    const setStreamingText = vi.fn();
    const setEditablePreview = vi.fn();
    const setImportResult = vi.fn();
    const setError = vi.fn();
    const setChatMessages = vi.fn();
    const setProcessingStage = vi.fn();
    const setProcessingProgress = vi.fn();
    const setProcessingMessage = vi.fn();

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
        setProcessingStage,
        setProcessingProgress,
        setProcessingMessage,
      },
      {
        clearSelectedFile: true,
        clearLocalPreviewUrl: true,
        clearProcessingState: true,
      },
    );

    expect(setSelectedFile).toHaveBeenCalledWith(null);
    expect(setLocalPreviewUrl).toHaveBeenCalledWith(null);
    expect(setAnalyzing).toHaveBeenCalledWith(false);
    expect(setStreamingText).toHaveBeenCalledWith(null);
    expect(setEditablePreview).toHaveBeenCalledWith(null);
    expect(setImportResult).toHaveBeenCalledWith(null);
    expect(setError).toHaveBeenCalledWith(null);
    expect(setChatMessages).toHaveBeenCalledWith([]);
    expect(setProcessingStage).toHaveBeenCalledWith(null);
    expect(setProcessingProgress).toHaveBeenCalledWith(0);
    expect(setProcessingMessage).toHaveBeenCalledWith(null);
  });
});
