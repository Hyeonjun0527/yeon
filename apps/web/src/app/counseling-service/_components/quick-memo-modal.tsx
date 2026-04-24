"use client";

import { useState, useRef, useEffect } from "react";
import { X } from "lucide-react";
import type { CounselingRecordDetail } from "@yeon/api-contract/counseling-records";
import type { RecordItem } from "../_lib/types";
import { resolveApiHrefForCurrentPath } from "@/lib/app-route-paths";

interface QuickMemoModalProps {
  onClose: () => void;
  onCreated: (record: RecordItem) => void;
  defaultMemberId?: string | null;
  defaultStudentName?: string;
}

export function QuickMemoModal({
  onClose,
  onCreated,
  defaultMemberId = null,
  defaultStudentName = "",
}: QuickMemoModalProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    const trimmedTitle =
      title.trim() || `메모 ${new Date().toLocaleDateString("ko-KR")}`;
    const trimmedContent = content.trim();
    if (!trimmedContent) {
      setError("메모 내용을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const form = new FormData();
      form.append("recordType", "text_memo");
      form.append("sessionTitle", trimmedTitle);
      form.append("content", trimmedContent);
      form.append("studentName", defaultStudentName);
      if (defaultMemberId) {
        form.append("memberId", defaultMemberId);
      }

      const res = await fetch(
        resolveApiHrefForCurrentPath("/api/v1/counseling-records"),
        {
          method: "POST",
          body: form,
        },
      );

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "저장에 실패했습니다.");
      }

      const data = (await res.json()) as { record: CounselingRecordDetail };
      const item = data.record;

      const record: RecordItem = {
        id: item.id,
        spaceId: item.spaceId,
        memberId: item.memberId,
        createdAt: item.createdAt,
        title: item.sessionTitle || trimmedTitle,
        status: "ready",
        errorMessage: null,
        meta: "",
        duration: "",
        durationMs: 0,
        studentName: item.studentName || defaultStudentName,
        type: item.counselingType || "텍스트 메모",
        recordSource: item.recordSource,
        audioUrl: null,
        transcript: item.transcriptSegments.map((segment) => ({
          id: segment.id,
          segmentIndex: segment.segmentIndex,
          startMs: segment.startMs,
          endMs: segment.endMs,
          speakerLabel: segment.speakerLabel,
          speakerTone: segment.speakerTone,
          text: segment.text,
        })),
        aiSummary: trimmedContent.slice(0, 200),
        aiMessages: item.assistantMessages.map((message) => ({
          role: message.role,
          text: message.content,
          createdAt: message.createdAt,
        })),
        aiMessagesLoaded: true,
        analysisResult: item.analysisResult,
        processingStage: item.processingStage,
        processingProgress: item.processingProgress,
        processingMessage: item.processingMessage,
        analysisStatus: item.analysisStatus,
        analysisProgress: item.analysisProgress,
      };

      onCreated(record);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      void handleSubmit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-surface border border-border rounded-xl shadow-2xl flex flex-col"
        style={{ width: 520 }}
        onKeyDown={handleKeyDown}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-base">✏️</span>
            <span className="text-[14px] font-semibold text-text">
              텍스트 메모
            </span>
          </div>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-text-dim hover:text-text hover:bg-surface-3 cursor-pointer transition-colors"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* 본문 */}
        <div className="p-4 space-y-3">
          <input
            className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors font-[inherit]"
            placeholder={`메모 제목 (기본: 메모 ${new Date().toLocaleDateString("ko-KR")})`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            ref={textareaRef}
            className="w-full bg-surface-3 border border-border rounded-md px-3 py-2 text-sm text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors font-[inherit] resize-none"
            placeholder="상담 내용, 특이사항, 메모를 자유롭게 입력하세요..."
            rows={8}
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {error && <p className="text-xs text-red">{error}</p>}

          <div className="flex items-center justify-between pt-1">
            <span className="text-[11px] text-text-dim">⌘ + Enter로 저장</span>
            <div className="flex gap-2">
              <button
                className="px-3 py-1.5 text-[12px] text-text-secondary bg-surface-3 border border-border rounded-md hover:border-border-light transition-colors cursor-pointer font-[inherit]"
                onClick={onClose}
              >
                취소
              </button>
              <button
                className="px-4 py-1.5 text-[12px] font-semibold text-white bg-accent rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer border-none font-[inherit]"
                disabled={saving || !content.trim()}
                onClick={() => void handleSubmit()}
              >
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
