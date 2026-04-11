import {
  Bot,
  ClipboardCopy,
  Download,
  FileText,
  SendHorizonal,
  Square,
} from "lucide-react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";
import type { Message } from "../types";
import styles from "../counseling-record-workspace.module.css";

interface StatusMetaEntry {
  label: string;
  className: string;
  detail: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
}

export interface AssistantPanelProps {
  selectedRecord: CounselingRecordListItem;
  statusMeta: Record<CounselingRecordListItem["status"], StatusMetaEntry>;
  assistantMessages: Message[];
  assistantDraft: string;
  setAssistantDraft: (value: string) => void;
  isAiStreaming: boolean;
  quickPrompts: string[];
  appendAssistantExchange: (prompt: string) => void;
  handleStopStreaming: () => void;
  messageListRef: React.RefObject<HTMLDivElement | null>;
  isAiExportOpen: boolean;
  setIsAiExportOpen: React.Dispatch<React.SetStateAction<boolean>>;
  exportDropdownRef: React.RefObject<HTMLDivElement | null>;
  handleAiExportClipboard: () => void;
  handleAiExportTextFile: () => void;
  handleComprehensiveReportClipboard: () => void;
  handleComprehensiveReportTextFile: () => void;
}

export function AssistantPanel({
  selectedRecord,
  statusMeta,
  assistantMessages,
  assistantDraft,
  setAssistantDraft,
  isAiStreaming,
  quickPrompts,
  appendAssistantExchange,
  handleStopStreaming,
  messageListRef,
  isAiExportOpen,
  setIsAiExportOpen,
  exportDropdownRef,
  handleAiExportClipboard,
  handleAiExportTextFile,
  handleComprehensiveReportClipboard,
  handleComprehensiveReportTextFile,
}: AssistantPanelProps) {
  return (
    <aside className={styles.assistantPanel}>
      {/* 슬림 헤더 */}
      <div className="flex items-center gap-[10px]">
        <div className="flex items-center gap-[10px] flex-1 min-w-0">
          <div
            className="inline-flex items-center justify-center w-8 h-8 rounded-[10px] flex-shrink-0"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            <Bot size={16} strokeWidth={2} />
          </div>
          <h2 className="m-0 text-[15px] font-bold tracking-[-0.02em] leading-[1.2]">
            AI 도우미
          </h2>
        </div>
        {/* 내보내기 드롭다운 */}
        <div ref={exportDropdownRef} className="relative flex-shrink-0">
          <button
            type="button"
            className="inline-flex items-center justify-center w-[30px] h-[30px] border rounded-lg bg-transparent cursor-pointer transition-[background,color] duration-150"
            style={{
              borderColor: "var(--border-primary)",
              color: "var(--text-secondary)",
            }}
            onClick={() => setIsAiExportOpen((prev) => !prev)}
            title="AI 분석 내보내기"
          >
            <Download size={14} strokeWidth={2} />
          </button>
          {isAiExportOpen ? (
            <div
              className="absolute top-[calc(100%+6px)] right-0 z-20 min-w-[200px] p-[6px] border rounded-xl"
              style={{
                borderColor: "var(--border-primary)",
                background: "var(--surface-primary)",
                boxShadow: "var(--shadow-lg)",
              }}
            >
              <p
                className="m-0 py-[6px] px-2 pb-[2px] text-[11px] font-bold tracking-[0.02em]"
                style={{ color: "var(--text-muted)" }}
              >
                AI 분석
              </p>
              <button
                type="button"
                className="flex items-center gap-2 w-full py-[7px] px-2 border-none rounded-lg bg-transparent text-[13px] cursor-pointer text-left transition-[background] duration-[120ms] hover:bg-[var(--surface-soft)]"
                style={{ color: "var(--text-primary)" }}
                onClick={handleAiExportClipboard}
              >
                <ClipboardCopy size={13} strokeWidth={2} />
                클립보드 복사
              </button>
              <button
                type="button"
                className="flex items-center gap-2 w-full py-[7px] px-2 border-none rounded-lg bg-transparent text-[13px] cursor-pointer text-left transition-[background] duration-[120ms] hover:bg-[var(--surface-soft)]"
                style={{ color: "var(--text-primary)" }}
                onClick={handleAiExportTextFile}
              >
                <FileText size={13} strokeWidth={2} />
                텍스트 파일 다운로드
              </button>
              <div
                className="h-px my-1 mx-2"
                style={{ background: "var(--border-primary)" }}
              />
              <p
                className="m-0 py-[6px] px-2 pb-[2px] text-[11px] font-bold tracking-[0.02em]"
                style={{ color: "var(--text-muted)" }}
              >
                종합 보고서
              </p>
              <button
                type="button"
                className="flex items-center gap-2 w-full py-[7px] px-2 border-none rounded-lg bg-transparent text-[13px] cursor-pointer text-left transition-[background] duration-[120ms] hover:bg-[var(--surface-soft)]"
                style={{ color: "var(--text-primary)" }}
                onClick={handleComprehensiveReportClipboard}
              >
                <ClipboardCopy size={13} strokeWidth={2} />
                마크다운 복사
              </button>
              <button
                type="button"
                className="flex items-center gap-2 w-full py-[7px] px-2 border-none rounded-lg bg-transparent text-[13px] cursor-pointer text-left transition-[background] duration-[120ms] hover:bg-[var(--surface-soft)]"
                style={{ color: "var(--text-primary)" }}
                onClick={handleComprehensiveReportTextFile}
              >
                <Download size={13} strokeWidth={2} />
                마크다운 파일 다운로드
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* 문맥 1줄 요약 */}
      <div
        className={`flex items-center gap-[6px] py-2 px-3 rounded-xl border text-xs overflow-hidden ${styles.assistantContext}`}
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          background: "var(--surface-soft)",
          color: "var(--text-secondary)",
        }}
      >
        <p
          className="m-0 text-[11px] font-bold whitespace-nowrap flex-shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          문맥
        </p>
        <div className="flex gap-[6px] overflow-hidden">
          <span>{selectedRecord.studentName}</span>
          <span>{selectedRecord.sessionTitle}</span>
          <span>{statusMeta[selectedRecord.status].label}</span>
        </div>
      </div>

      {/* 메시지 리스트 */}
      <div
        ref={messageListRef}
        className="min-h-0 overflow-y-auto overscroll-contain flex flex-col gap-[10px] pr-1"
      >
        {assistantMessages.map((message) => (
          <article
            key={message.id}
            className={`grid gap-[6px] max-w-[88%] py-3 px-[14px] rounded-[10px] border ${
              message.role === "assistant"
                ? "self-start rounded-bl-[6px]"
                : "self-end rounded-br-[6px]"
            }`}
            style={{
              borderColor: "rgba(255,255,255,0.06)",
              background:
                message.role === "assistant"
                  ? "var(--surface-secondary)"
                  : "rgba(99,102,241,0.12)",
            }}
          >
            <p
              className="m-0 text-[11px] font-semibold"
              style={{ color: "var(--text-muted)" }}
            >
              {message.role === "assistant" ? "AI" : "나"}
            </p>
            <div
              className={`m-0 text-sm leading-[1.7] ${styles.messageContent}`}
            >
              {message.role === "assistant" ? (
                <Markdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </Markdown>
              ) : (
                <p>{message.content}</p>
              )}
              {message.isStreaming ? (
                <span className={styles.streamingCursor} />
              ) : null}
            </div>
            {message.supportingNote ? (
              <p
                className="m-0 text-[11px] leading-relaxed"
                style={{ color: "var(--text-muted)" }}
              >
                {message.supportingNote}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {/* 프롬프트 칩 */}
      {!isAiStreaming ? (
        <div className="flex flex-wrap gap-[6px]">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className="min-h-[30px] py-[6px] px-[10px] rounded-full border text-xs text-left cursor-pointer transition-[border-color,color] duration-[120ms]"
              style={{
                borderColor: "rgba(99,102,241,0.2)",
                background: "var(--surface-secondary)",
                color: "var(--text-secondary)",
              }}
              onClick={() => appendAssistantExchange(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      {/* 컴포저 */}
      <form
        className="grid gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          if (isAiStreaming) {
            handleStopStreaming();
          } else {
            appendAssistantExchange(assistantDraft);
          }
        }}
      >
        <label className="relative block">
          <textarea
            value={assistantDraft}
            onChange={(event) => setAssistantDraft(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !isAiStreaming &&
                assistantDraft.trim()
              ) {
                event.preventDefault();
                appendAssistantExchange(assistantDraft);
              }
            }}
            className="w-full resize-none py-[10px] pl-[14px] pr-12 border rounded-[14px] text-sm leading-relaxed outline-none transition-[border-color,background-color] duration-200"
            style={{
              borderColor: "var(--border-soft)",
              background: "var(--surface-secondary)",
              color: "var(--text-primary)",
            }}
            rows={2}
            placeholder={isAiStreaming ? "응답 중..." : "질문을 입력하세요"}
            disabled={isAiStreaming}
          />
          {isAiStreaming ? (
            <button
              type="button"
              className="absolute right-[6px] bottom-[6px] inline-flex items-center justify-center w-[34px] h-[34px] border rounded-[10px] cursor-pointer transition-[background-color,opacity] duration-[120ms]"
              style={{
                borderColor: "var(--danger-text)",
                background: "var(--danger-soft)",
                color: "var(--danger-text)",
              }}
              onClick={handleStopStreaming}
              aria-label="응답 중지"
            >
              <Square size={14} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="submit"
              className="absolute right-[6px] bottom-[6px] inline-flex items-center justify-center w-[34px] h-[34px] border-none rounded-[10px] cursor-pointer transition-[background-color,opacity] duration-[120ms] disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "var(--accent)", color: "#ffffff" }}
              disabled={!assistantDraft.trim()}
              aria-label="질문 보내기"
            >
              <SendHorizonal size={16} strokeWidth={2.1} />
            </button>
          )}
        </label>
      </form>
    </aside>
  );
}
