"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AiMessage, AttachedImage } from "../_lib/types";

interface UseAiChatParams {
  selectedId: string | null;
  selectedMessages: AiMessage[];
  isProcessing: boolean;
  onUpdateMessages: (id: string, updater: (prev: AiMessage[]) => AiMessage[]) => void;
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

export function useAiChat({
  selectedId,
  selectedMessages,
  isProcessing,
  onUpdateMessages,
}: UseAiChatParams) {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

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
      // AiMessage → API 형식 변환. images는 텍스트 설명으로 대체
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

      // 스트리밍 어시스턴트 메시지를 state에 추가 (빈 문자열로 시작)
      onUpdateMessages(recordId, (prev) => [
        ...prev,
        { role: "assistant" as const, text: "" },
      ]);

      const reader = res.body.getReader();
      let accumulated = "";

      await readSseStream(reader, (chunk) => {
        accumulated += chunk;
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

  const send = useCallback(() => {
    if ((!input.trim() && images.length === 0) || !selectedId || streaming) return;

    const userMsg = input.trim();
    const attachedImages = images.length > 0 ? [...images] : undefined;
    setInput("");
    setImages([]);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    onUpdateMessages(selectedId, (prev) => [
      ...prev,
      {
        role: "user" as const,
        text: userMsg || `[파일 ${attachedImages?.length}개 첨부]`,
        images: attachedImages,
      },
    ]);

    const allMessages: AiMessage[] = [
      ...selectedMessages,
      {
        role: "user" as const,
        text: userMsg || `[파일 ${attachedImages?.length}개 첨부]`,
        images: attachedImages,
      },
    ];

    setStreaming(true);
    sendToApi(selectedId, allMessages).catch(() => {
      // 에러 시 "응답을 가져오지 못했습니다" 메시지로 대체
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
  }, [input, images, selectedId, streaming, selectedMessages, onUpdateMessages, sendToApi]);

  const sendQuickChip = useCallback(
    (text: string) => {
      if (!selectedId || streaming) return;

      onUpdateMessages(selectedId, (prev) => [
        ...prev,
        { role: "user" as const, text },
      ]);

      const allMessages: AiMessage[] = [
        ...selectedMessages,
        { role: "user" as const, text },
      ];

      setStreaming(true);
      sendToApi(selectedId, allMessages).catch(() => {
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
    [selectedId, streaming, selectedMessages, onUpdateMessages, sendToApi],
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
    canSend: !isProcessing && !streaming && (!!input.trim() || images.length > 0),
  };
}
