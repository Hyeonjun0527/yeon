"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AiMessage, AnalysisResult, AttachedImage } from "../_lib/types";

interface UseAiChatParams {
  selectedId: string | null;
  selectedMessages: AiMessage[];
  selectedStatus: "ready" | "processing" | "error" | null;
  selectedAnalysisResult: AnalysisResult | null;
  onUpdateMessages: (id: string, updater: (prev: AiMessage[]) => AiMessage[]) => void;
  onUpdateAnalysisResult: (id: string, result: AnalysisResult) => void;
}

/** SSE 스트림에서 텍스트 청크를 누적해 반환 */
async function readSseStream(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onChunk: (text: string) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      if (data) onChunk(data);
    }
  }
}

// INITIAL_ANALYSIS_PROMPT 제거됨 — 분석은 /analyze 엔드포인트가 JSON으로 처리

export function useAiChat({
  selectedId,
  selectedMessages,
  selectedStatus,
  selectedAnalysisResult,
  onUpdateMessages,
  onUpdateAnalysisResult,
}: UseAiChatParams) {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const analyzeAbortRef = useRef<AbortController | null>(null);
  // 분석을 시도했던 recordId 추적 — 실패 후 무한 재시도 차단
  const analysisAttemptedRef = useRef<Set<string>>(new Set());
  const prevSelectedIdRef = useRef<string | null>(null);
  // H-2: selectedMessages를 ref로 미러링 — send/sendQuickChip 클로저 stale 방지
  const selectedMessagesRef = useRef<AiMessage[]>(selectedMessages);
  selectedMessagesRef.current = selectedMessages;

  // 레코드 전환 시 진행 중인 SSE 스트림/분석 abort
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
      analyzeAbortRef.current?.abort();
      analyzeAbortRef.current = null;
    };
  }, [selectedId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedMessages.length]);

  const addImages = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length === 0) return;

    const newImages: AttachedImage[] = fileArr.map((file) => ({
      id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: file.name,
      url: URL.createObjectURL(file),
      loading: true,
    }));

    setImages((prev) => [...prev, ...newImages]);

    newImages.forEach((img) => {
      setTimeout(() => {
        setImages((prev) =>
          prev.map((i) => (i.id === img.id ? { ...i, loading: false } : i)),
        );
      }, 400 + Math.random() * 200);
    });
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const removed = prev.find((i) => i.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const sendToApi = useCallback(
    async (recordId: string, messages: AiMessage[]) => {
      const apiMessages = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.images?.length
            ? `${m.text || ""}${m.text ? "\n" : ""}[이미지 ${m.images.length}장 첨부]`
            : m.text,
        }));

      abortRef.current = new AbortController();

      const res = await fetch(`/api/v1/counseling-records/${recordId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortRef.current.signal,
      });

      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "AI 응답에 실패했습니다.");
      }

      const reader = res.body.getReader();
      let accumulated = "";

      onUpdateMessages(recordId, (prev) => [
        ...prev,
        { role: "assistant" as const, text: "" },
      ]);

      await readSseStream(reader, (chunk) => {
        try {
          const parsed = JSON.parse(chunk) as { content?: string };
          accumulated += parsed.content ?? "";
        } catch {
          accumulated += chunk;
        }
        const finalText = accumulated;
        onUpdateMessages(recordId, (prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant") {
            updated[lastIdx] = { ...updated[lastIdx], text: finalText };
          }
          return updated;
        });
      });
    },
    [onUpdateMessages],
  );

  // 레코드 전환 시 이전 ID를 추적 (analysisAttemptedRef는 세션 내 유지 — 삭제 안 함)
  // polling이 analysisResult를 null로 덮어쓸 경우 무한 재분석 루프를 방지하기 위함
  useEffect(() => {
    prevSelectedIdRef.current = selectedId;
  }, [selectedId]);

  // 레코드 선택 시 분석 결과가 없으면 자동으로 /analyze 호출
  useEffect(() => {
    if (
      !selectedId ||
      selectedStatus !== "ready" ||
      selectedAnalysisResult !== null ||
      analysisAttemptedRef.current.has(selectedId)
    ) {
      return;
    }

    const capturedId = selectedId;
    analysisAttemptedRef.current.add(capturedId);
    const controller = new AbortController();
    analyzeAbortRef.current = controller;
    setAnalyzing(true);

    fetch(`/api/v1/counseling-records/${capturedId}/analyze`, {
      method: "POST",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("분석 실패");
        const data = (await res.json()) as { analysisResult: AnalysisResult };
        onUpdateAnalysisResult(capturedId, data.analysisResult);
      })
      .catch((err) => {
        if ((err as Error).name === "AbortError") return;
        console.error("자동 분석 실패:", err);
      })
      .finally(() => {
        if (analyzeAbortRef.current === controller) {
          setAnalyzing(false);
          analyzeAbortRef.current = null;
        }
      });
  }, [selectedId, selectedStatus, selectedAnalysisResult, onUpdateAnalysisResult]);

  const send = useCallback(() => {
    if ((!input.trim() && images.length === 0) || !selectedId || streaming) return;

    const userMsg = input.trim();
    const attachedImages = images.length > 0 ? [...images] : undefined;
    setInput("");
    setImages((prev) => {
      for (const img of prev) URL.revokeObjectURL(img.url);
      return [];
    });

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const newUserMessage: AiMessage = {
      role: "user" as const,
      text: userMsg || `[파일 ${attachedImages?.length}개 첨부]`,
      images: attachedImages,
    };

    onUpdateMessages(selectedId, (prev) => [...prev, newUserMessage]);

    const allMessages: AiMessage[] = [
      ...selectedMessagesRef.current,
      newUserMessage,
    ];

    setStreaming(true);
    sendToApi(selectedId, allMessages).catch((err) => {
      if ((err as Error).name === "AbortError") return;
      onUpdateMessages(selectedId, (prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        // 스트리밍 중 빈 assistant 메시지가 이미 추가된 경우 교체
        if (lastIdx >= 0 && updated[lastIdx].role === "assistant" && !updated[lastIdx].text) {
          updated[lastIdx] = { ...updated[lastIdx], text: "AI 응답을 가져오지 못했습니다." };
        } else {
          updated.push({ role: "assistant", text: "AI 응답을 가져오지 못했습니다." });
        }
        return updated;
      });
    }).finally(() => {
      setStreaming(false);
      abortRef.current = null;
    });
  }, [input, images, selectedId, streaming, onUpdateMessages, sendToApi]);

  const sendQuickChip = useCallback(
    (text: string) => {
      if (!selectedId || streaming) return;

      const newUserMessage: AiMessage = { role: "user" as const, text };

      onUpdateMessages(selectedId, (prev) => [...prev, newUserMessage]);

      const allMessages: AiMessage[] = [
        ...selectedMessagesRef.current,
        newUserMessage,
      ];

      setStreaming(true);
      sendToApi(selectedId, allMessages).catch((err) => {
        if ((err as Error).name === "AbortError") return;
        onUpdateMessages(selectedId, (prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant" && !updated[lastIdx].text) {
            updated[lastIdx] = { ...updated[lastIdx], text: "AI 응답을 가져오지 못했습니다." };
          } else {
            updated.push({ role: "assistant", text: "AI 응답을 가져오지 못했습니다." });
          }
          return updated;
        });
      }).finally(() => {
        setStreaming(false);
        abortRef.current = null;
      });
    },
    [selectedId, streaming, onUpdateMessages, sendToApi],
  );

  return {
    input,
    setInput,
    images,
    addImages,
    removeImage,
    imageInputRef,
    endRef,
    textareaRef,
    send,
    sendQuickChip,
    streaming,
    analyzing,
    canSend: selectedStatus === "ready" && !streaming && (!!input.trim() || images.length > 0),
  };
}
