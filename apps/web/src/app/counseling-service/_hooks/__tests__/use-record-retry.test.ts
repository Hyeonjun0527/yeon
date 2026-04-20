// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRecordRetry } from "../use-record-retry";
import type { RecordItem } from "../../_lib/types";

function makeSelectedRecord(overrides: Partial<RecordItem> = {}): RecordItem {
  return {
    id: "rec-1",
    spaceId: "space-1",
    memberId: "member-1",
    createdAt: new Date().toISOString(),
    title: "상담 기록",
    status: "error",
    errorMessage: "전사 실패",
    meta: "메타",
    duration: "1:00",
    durationMs: 60000,
    studentName: "홍길동",
    type: "1:1",
    recordSource: "audio_upload",
    audioUrl: null,
    transcript: [],
    aiSummary: "",
    aiMessages: [],
    aiMessagesLoaded: false,
    analysisResult: null,
    processingStage: "queued",
    processingProgress: 0,
    processingMessage: null,
    analysisStatus: "idle",
    analysisProgress: 0,
    ...overrides,
  };
}

describe("useRecordRetry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("전사 재시도 성공 시 detail 적용과 success feedback을 반환한다", async () => {
    const applyRecordDetail = vi.fn();
    const boostPolling = vi.fn();
    const markAnalysisRetryStart = vi.fn();
    const selectRecord = vi.fn();

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          record: { id: "rec-1", status: "processing" },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      ),
    );

    const { result } = renderHook(() =>
      useRecordRetry({
        selected: makeSelectedRecord(),
        applyRecordDetail,
        boostPolling,
        markAnalysisRetryStart,
        selectRecord,
      }),
    );

    await act(async () => {
      await result.current.retryFailedRecord();
    });

    expect(applyRecordDetail).toHaveBeenCalled();
    expect(boostPolling).toHaveBeenCalled();
    expect(result.current.retryFeedback.tone).toBe("success");
  });

  it("분석 재시도 성공 시 local processing 전환과 success feedback을 반환한다", async () => {
    const applyRecordDetail = vi.fn();
    const boostPolling = vi.fn();
    const markAnalysisRetryStart = vi.fn();
    const selectRecord = vi.fn();

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response("", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() =>
      useRecordRetry({
        selected: makeSelectedRecord({
          status: "ready",
          errorMessage: null,
          analysisStatus: "error",
        }),
        applyRecordDetail,
        boostPolling,
        markAnalysisRetryStart,
        selectRecord,
      }),
    );

    await act(async () => {
      await result.current.retryFailedAnalysis();
    });

    expect(markAnalysisRetryStart).toHaveBeenCalledWith("rec-1");
    expect(selectRecord).toHaveBeenCalledWith("rec-1");
    expect(result.current.retryFeedback.tone).toBe("success");
  });

  it("재시도 실패 시 error feedback을 반환한다", async () => {
    const applyRecordDetail = vi.fn();
    const boostPolling = vi.fn();
    const markAnalysisRetryStart = vi.fn();
    const selectRecord = vi.fn();

    vi.spyOn(global, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "재시도 실패" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { result } = renderHook(() =>
      useRecordRetry({
        selected: makeSelectedRecord(),
        applyRecordDetail,
        boostPolling,
        markAnalysisRetryStart,
        selectRecord,
      }),
    );

    await act(async () => {
      await result.current.retryFailedRecord();
    });

    await waitFor(() =>
      expect(result.current.retryFeedback).toEqual({
        message: "재시도 실패",
        tone: "error",
      }),
    );
  });
});
