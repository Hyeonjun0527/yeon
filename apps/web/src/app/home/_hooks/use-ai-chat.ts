"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { AiMessage, AttachedImage } from "../_lib/types";

interface UseAiChatParams {
  selectedId: string | null;
  selectedMessages: AiMessage[];
  selectedStatus: "ready" | "processing" | "error" | null;
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

const INITIAL_ANALYSIS_PROMPT = `이 상담 내용을 분석해주세요. 반드시 아래 구조를 따라 작성하세요:

## 핵심 요약
3-4문장으로 상담의 핵심 내용과 결론을 정리합니다.

## 수강생 정보
- **이름**: 원문에서 파악된 이름 (없으면 "미확인")
- **특징**: 성격, 학습 스타일, 현재 상황 등 원문에서 관찰되는 특징
- **감정/태도**: 상담 중 드러난 감정 상태와 태도 변화

## 주요 이슈
원문에서 도출된 핵심 문제점이나 논의 사항을 3-5개 항목으로 정리합니다.

## 후속 조치
- **멘토 액션**: 멘토가 취해야 할 구체적 행동
- **수강생 과제**: 수강생에게 권하는 다음 단계
- **다음 상담 방향**: 후속 상담에서 확인할 사항`;

export function useAiChat({
  selectedId,
  selectedMessages,
  selectedStatus,
  onUpdateMessages,
}: UseAiChatParams) {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoAnalyzedRef = useRef<Set<string>>(new Set());
  // H-2: selectedMessages를 ref로 미러링 — send/sendQuickChip 클로저 stale 방지
  const selectedMessagesRef = useRef<AiMessage[]>(selectedMessages);
  selectedMessagesRef.current = selectedMessages;

  // 레코드 전환 시 진행 중인 SSE 스트림 abort
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
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
    async (recordId: string, messages: AiMessage[], options?: { stream?: boolean }) => {
      const shouldStream = options?.stream ?? true;

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

      const reader = res.body.getReader();
      let accumulated = "";

      if (shouldStream) {
        // 스트리밍: 청크마다 UI 업데이트
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
      } else {
        // 비스트리밍: 전체 응답을 모은 뒤 한 번에 표시
        await readSseStream(reader, (chunk) => {
          try {
            const parsed = JSON.parse(chunk) as { content?: string };
            accumulated += parsed.content ?? "";
          } catch {
            accumulated += chunk;
          }
        });

        onUpdateMessages(recordId, (prev) => [
          ...prev,
          { role: "assistant" as const, text: accumulated },
        ]);
      }
    },
    [onUpdateMessages],
  );

  // 레코드 선택 시 메시지가 없으면 자동으로 초기 분석 실행
  useEffect(() => {
    if (
      !selectedId ||
      selectedStatus !== "ready" ||
      streaming ||
      selectedMessages.length > 0 ||
      autoAnalyzedRef.current.has(selectedId)
    ) {
      return;
    }

    autoAnalyzedRef.current.add(selectedId);

    const userMsg: AiMessage = { role: "user", text: INITIAL_ANALYSIS_PROMPT };
    onUpdateMessages(selectedId, (prev) => [...prev, userMsg]);

    setStreaming(true);
    sendToApi(selectedId, [userMsg], { stream: false })
      .catch(() => {
        onUpdateMessages(selectedId, (prev) => {
          const updated = [...prev];
          const lastIdx = updated.length - 1;
          if (lastIdx >= 0 && updated[lastIdx].role === "assistant" && !updated[lastIdx].text) {
            updated[lastIdx] = { ...updated[lastIdx], text: "AI 분석에 실패했습니다." };
          } else {
            updated.push({ role: "assistant", text: "AI 분석에 실패했습니다." });
          }
          return updated;
        });
      })
      .finally(() => {
        setStreaming(false);
        abortRef.current = null;
      });
  }, [selectedId, selectedStatus, streaming, selectedMessages.length, onUpdateMessages, sendToApi]);

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

    onUpdateMessages(selectedId, (prev) => [
      ...prev,
      {
        role: "user" as const,
        text: userMsg || `[파일 ${attachedImages?.length}개 첨부]`,
        images: attachedImages,
      },
    ]);

    const allMessages: AiMessage[] = [
      ...selectedMessagesRef.current,
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
  }, [input, images, selectedId, streaming, onUpdateMessages, sendToApi]);

  const sendQuickChip = useCallback(
    (text: string) => {
      if (!selectedId || streaming) return;

      onUpdateMessages(selectedId, (prev) => [
        ...prev,
        { role: "user" as const, text },
      ]);

      const allMessages: AiMessage[] = [
        ...selectedMessagesRef.current,
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
    [selectedId, streaming, onUpdateMessages, sendToApi],
  );

  // H-1: 레코드 삭제 후 재생성 시 autoAnalyzedRef에서 해당 ID 제거
  const resetAutoAnalysis = useCallback((id: string) => {
    autoAnalyzedRef.current.delete(id);
  }, []);

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
    canSend: selectedStatus === "ready" && !streaming && (!!input.trim() || images.length > 0),
    resetAutoAnalysis,
  };
}
