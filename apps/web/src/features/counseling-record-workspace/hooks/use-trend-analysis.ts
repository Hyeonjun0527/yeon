import { useEffect, useRef, useState } from "react";
import { readErrorMessage } from "../utils";

interface TrendAnalysisState {
  studentName: string;
  content: string;
  isStreaming: boolean;
}

export function useTrendAnalysis(
  setSelectedRecordId: (id: string | null) => void,
  setSaveToast: (message: string) => void,
) {
  const [trendAnalysis, setTrendAnalysis] =
    useState<TrendAnalysisState | null>(null);
  const trendAbortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => { trendAbortControllerRef.current?.abort(); }, []);

  async function handleStartTrendAnalysis(
    studentName: string,
    recordIds: string[],
  ) {
    trendAbortControllerRef.current?.abort();

    const controller = new AbortController();
    trendAbortControllerRef.current = controller;

    setTrendAnalysis({ studentName, content: "", isStreaming: true });
    setSelectedRecordId(null);

    try {
      const response = await fetch(
        "/api/v1/counseling-records/analyze-trend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordIds }),
          signal: controller.signal,
        },
      );

      if (!response.ok || !response.body) {
        throw new Error(
          (await readErrorMessage(response)) ?? "추이 분석 요청에 실패했습니다.",
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          const payload = line.slice(6);

          if (payload === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(payload) as { content?: string };
            const token = parsed.content ?? "";

            if (token) {
              setTrendAnalysis((prev) =>
                prev
                  ? { ...prev, content: prev.content + token }
                  : null,
              );
            }
          } catch {
            // SSE 파싱 실패 무시
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setSaveToast(
          (error as Error).message || "추이 분석 중 오류가 발생했습니다.",
        );
      }
    } finally {
      setTrendAnalysis((prev) =>
        prev ? { ...prev, isStreaming: false } : null,
      );
      trendAbortControllerRef.current = null;
    }
  }

  function handleStopTrendAnalysis() {
    trendAbortControllerRef.current?.abort();
  }

  return {
    trendAnalysis,
    handleStartTrendAnalysis,
    handleStopTrendAnalysis,
  };
}
