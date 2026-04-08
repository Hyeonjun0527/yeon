import { useState, useRef, useEffect, useCallback } from "react";
import { getAiResponse } from "../../mockdata/app/_data/mock-data";
import type { AiMessage, AttachedImage } from "../_lib/types";

interface UseAiChatParams {
  selectedId: string | null;
  selectedMessages: AiMessage[];
  isProcessing: boolean;
  onUpdateMessages: (id: string, updater: (prev: AiMessage[]) => AiMessage[]) => void;
}

export function useAiChat({
  selectedId,
  selectedMessages,
  isProcessing,
  onUpdateMessages,
}: UseAiChatParams) {
  const [input, setInput] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

    // 로딩 시뮬레이션
    newImages.forEach((img) => {
      setTimeout(() => {
        setImages((prev) =>
          prev.map((i) => (i.id === img.id ? { ...i, loading: false } : i)),
        );
      }, 600 + Math.random() * 400);
    });
  }, []);

  const removeImage = useCallback((id: string) => {
    setImages((prev) => {
      const removed = prev.find((i) => i.id === id);
      if (removed) URL.revokeObjectURL(removed.url);
      return prev.filter((i) => i.id !== id);
    });
  }, []);

  const send = useCallback(() => {
    if ((!input.trim() && images.length === 0) || !selectedId) return;
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

    setTimeout(() => {
      const responseText = attachedImages
        ? `이미지 ${attachedImages.length}장을 분석했습니다.\n\n${getAiResponse(userMsg || "이미지")}`
        : getAiResponse(userMsg);
      onUpdateMessages(selectedId, (prev) => [
        ...prev,
        { role: "assistant" as const, text: responseText },
      ]);
    }, 800);
  }, [input, images, selectedId, onUpdateMessages]);

  const sendQuickChip = useCallback(
    (text: string) => {
      if (!selectedId) return;

      onUpdateMessages(selectedId, (prev) => [
        ...prev,
        { role: "user" as const, text },
      ]);

      setTimeout(() => {
        const response = getAiResponse(text);
        onUpdateMessages(selectedId, (prev) => [
          ...prev,
          { role: "assistant" as const, text: response },
        ]);
      }, 800);
    },
    [selectedId, onUpdateMessages],
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
    canSend: !isProcessing && (!!input.trim() || images.length > 0),
  };
}
