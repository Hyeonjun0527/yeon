import { useEffect, useRef, useState } from "react";
import type {
  CounselingRecordDetail,
  CounselingRecordListItem,
} from "@yeon/api-contract";
import type { Message } from "../types";
import { buildInitialAssistantMessages } from "../utils";

export function useAssistantChat(
  selectedRecord: CounselingRecordListItem | null,
  selectedRecordDetail: CounselingRecordDetail | null,
  statusMeta: Record<string, { label: string }>,
) {
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantMessagesByRecord, setAssistantMessagesByRecord] = useState<
    Record<string, Message[]>
  >({});
  const [isAiStreaming, setIsAiStreaming] = useState(false);

  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const autoAnalysisTriggeredRef = useRef<Set<string>>(new Set());
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const activeRecordIdRef = useRef<string | null>(null);

  // 레코드 전환 시 진행 중인 스트리밍 중단
  useEffect(() => {
    const currentId = selectedRecord?.id ?? null;
    const previousId = activeRecordIdRef.current;

    activeRecordIdRef.current = currentId;

    if (previousId && previousId !== currentId) {
      aiAbortControllerRef.current?.abort();
    }
  }, [selectedRecord?.id]);

  const assistantMessages = selectedRecord
    ? (assistantMessagesByRecord[selectedRecord.id] ?? [])
    : [];

  // 메시지 자동 스크롤
  useEffect(() => {
    const container = messageListRef.current;

    if (!container) {
      return;
    }

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <
      80;

    if (isNearBottom || isAiStreaming) {
      container.scrollTop = container.scrollHeight;
    }
  }, [assistantMessages, isAiStreaming]);

  // 초기 메시지 생성
  useEffect(() => {
    if (!selectedRecord) {
      return;
    }
    setAssistantDraft("");
    setAssistantMessagesByRecord((current) => {
      const existingMessages = current[selectedRecord.id];
      const nextMessages = buildInitialAssistantMessages(
        selectedRecord,
        statusMeta,
      );

      if (!existingMessages) {
        return {
          ...current,
          [selectedRecord.id]: nextMessages,
        };
      }

      if (existingMessages.some((message) => message.role === "user")) {
        return current;
      }

      const existingSignature = existingMessages
        .map(
          (message) =>
            `${message.role}:${message.content}:${message.supportingNote ?? ""}`,
        )
        .join("|");
      const nextSignature = nextMessages
        .map(
          (message) =>
            `${message.role}:${message.content}:${message.supportingNote ?? ""}`,
        )
        .join("|");

      if (existingSignature === nextSignature) {
        return current;
      }

      return {
        ...current,
        [selectedRecord.id]: nextMessages,
      };
    });
  }, [selectedRecord, selectedRecordDetail, statusMeta]);

  // 자동 분석 트리거
  useEffect(() => {
    if (
      !selectedRecord ||
      selectedRecord.status !== "ready" ||
      !selectedRecordDetail?.transcriptSegments.length ||
      isAiStreaming
    ) {
      return;
    }

    if (autoAnalysisTriggeredRef.current.has(selectedRecord.id)) {
      return;
    }

    const existingMessages = assistantMessagesByRecord[selectedRecord.id];

    if (existingMessages?.some((m) => m.role === "user")) {
      return;
    }

    autoAnalysisTriggeredRef.current.add(selectedRecord.id);

    const capturedRecordId = selectedRecord.id;
    const analysisPrompt = "이 상담 내용을 분석해줘";
    const welcomeMessages = buildInitialAssistantMessages(
      selectedRecord,
      statusMeta,
    );
    const userMessage: Message = {
      id: `${capturedRecordId}-user-auto-${Date.now()}`,
      role: "user",
      content: analysisPrompt,
    };
    const allMessages = [...welcomeMessages, userMessage];

    setAssistantMessagesByRecord((current) => ({
      ...current,
      [capturedRecordId]: allMessages,
    }));

    streamAssistantResponse(capturedRecordId, allMessages);
  }, [
    selectedRecord,
    selectedRecordDetail,
    isAiStreaming,
    assistantMessagesByRecord,
    statusMeta,
  ]);

  async function streamAssistantResponse(
    recordId: string,
    allMessages: Message[],
  ) {
    const abortController = new AbortController();

    aiAbortControllerRef.current = abortController;
    setIsAiStreaming(true);

    const assistantId = `${recordId}-assistant-${Date.now()}`;
    const streamingMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setAssistantMessagesByRecord((current) => ({
      ...current,
      [recordId]: [...(current[recordId] ?? []), streamingMessage],
    }));

    try {
      const MAX_CONTEXT_MESSAGES = 20;
      const relevantMessages = allMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .filter((m) => m.content.trim());
      const apiMessages = relevantMessages
        .slice(-MAX_CONTEXT_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(
        `/api/v1/counseling-records/${recordId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "AI 도우미가 응답하지 못했습니다.";

        try {
          const parsed = JSON.parse(errorText) as { message?: string };

          if (parsed.message) {
            errorMessage = parsed.message;
          }
        } catch {
          // 파싱 실패 시 기본 메시지
        }

        setAssistantMessagesByRecord((current) => ({
          ...current,
          [recordId]: (current[recordId] ?? []).map((m) =>
            m.id === assistantId
              ? { ...m, content: `⚠️ ${errorMessage}`, isStreaming: false }
              : m,
          ),
        }));
        return;
      }

      const reader = response.body?.getReader();

      if (!reader) {
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed.startsWith("data: ")) {
            continue;
          }

          const payload = trimmed.slice(6);

          if (payload === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(payload) as { content?: string };

            if (parsed.content) {
              accumulated += parsed.content;
              const snapshot = accumulated;

              setAssistantMessagesByRecord((current) => ({
                ...current,
                [recordId]: (current[recordId] ?? []).map((m) =>
                  m.id === assistantId ? { ...m, content: snapshot } : m,
                ),
              }));
            }
          } catch {
            // 파싱 불가능한 줄 무시
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // 사용자가 중단함
      } else {
        setAssistantMessagesByRecord((current) => ({
          ...current,
          [recordId]: (current[recordId] ?? []).map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: m.content || "⚠️ 응답 중 오류가 발생했습니다.",
                  isStreaming: false,
                }
              : m,
          ),
        }));
      }
    } finally {
      setAssistantMessagesByRecord((current) => ({
        ...current,
        [recordId]: (current[recordId] ?? []).map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m,
        ),
      }));
      setIsAiStreaming(false);
      aiAbortControllerRef.current = null;
    }
  }

  function appendAssistantExchange(prompt: string) {
    if (!selectedRecord || isAiStreaming) {
      return;
    }

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const userMessage: Message = {
      id: `${selectedRecord.id}-user-${Date.now()}`,
      role: "user",
      content: trimmedPrompt,
    };

    const currentMessages = assistantMessagesByRecord[selectedRecord.id] ?? [];

    const updatedMessages = [...currentMessages, userMessage];

    setAssistantMessagesByRecord((current) => ({
      ...current,
      [selectedRecord.id]: updatedMessages,
    }));
    setAssistantDraft("");

    streamAssistantResponse(selectedRecord.id, updatedMessages);
  }

  function handleStopStreaming() {
    aiAbortControllerRef.current?.abort();
  }

  return {
    assistantDraft,
    setAssistantDraft,
    assistantMessages,
    assistantMessagesByRecord,
    isAiStreaming,
    appendAssistantExchange,
    handleStopStreaming,
    messageListRef,
  };
}
