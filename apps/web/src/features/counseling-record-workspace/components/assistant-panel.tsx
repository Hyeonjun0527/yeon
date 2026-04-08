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
      {/* 23차: 슬림 헤더 */}
      <div className={styles.assistantHeader}>
        <div className={styles.assistantTitleRow}>
          <div className={styles.assistantIcon}>
            <Bot size={16} strokeWidth={2} />
          </div>
          <h2 className={styles.assistantTitle}>AI 도우미</h2>
        </div>
        {/* 77차: 내보내기 드롭다운 */}
        <div ref={exportDropdownRef} className={styles.exportDropdownWrapper}>
          <button
            type="button"
            className={styles.exportTrigger}
            onClick={() => setIsAiExportOpen((prev) => !prev)}
            title="AI 분석 내보내기"
          >
            <Download size={14} strokeWidth={2} />
          </button>
          {isAiExportOpen ? (
            <div className={styles.exportDropdown}>
              <p className={styles.exportGroupLabel}>AI 분석</p>
              <button
                type="button"
                className={styles.exportOption}
                onClick={handleAiExportClipboard}
              >
                <ClipboardCopy size={13} strokeWidth={2} />
                클립보드 복사
              </button>
              <button
                type="button"
                className={styles.exportOption}
                onClick={handleAiExportTextFile}
              >
                <FileText size={13} strokeWidth={2} />
                텍스트 파일 다운로드
              </button>
              <div className={styles.exportDivider} />
              <p className={styles.exportGroupLabel}>종합 보고서</p>
              <button
                type="button"
                className={styles.exportOption}
                onClick={handleComprehensiveReportClipboard}
              >
                <ClipboardCopy size={13} strokeWidth={2} />
                마크다운 복사
              </button>
              <button
                type="button"
                className={styles.exportOption}
                onClick={handleComprehensiveReportTextFile}
              >
                <Download size={13} strokeWidth={2} />
                마크다운 파일 다운로드
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* 23차: 문맥 1줄 요약 */}
      <div className={styles.assistantContext}>
        <p className={styles.contextLabel}>문맥</p>
        <div className={styles.contextMeta}>
          <span>{selectedRecord.studentName}</span>
          <span>{selectedRecord.sessionTitle}</span>
          <span>{statusMeta[selectedRecord.status].label}</span>
        </div>
      </div>

      {/* 25차: 메시지 리스트 — 좌/우 정렬 */}
      <div ref={messageListRef} className={styles.messageList}>
        {assistantMessages.map((message) => (
          <article
            key={message.id}
            className={`${styles.messageItem} ${
              message.role === "assistant"
                ? styles.messageAssistant
                : styles.messageUser
            }`}
          >
            <p className={styles.messageBadge}>
              {message.role === "assistant" ? "AI" : "나"}
            </p>
            <div className={styles.messageContent}>
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
              <p className={styles.messageNote}>
                {message.supportingNote}
              </p>
            ) : null}
          </article>
        ))}
      </div>

      {/* 24차: 프롬프트 칩 — 컴포저 위 */}
      {!isAiStreaming ? (
        <div className={styles.promptList}>
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              className={styles.promptChip}
              onClick={() => appendAssistantExchange(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      {/* 26차: 컴포저 — 인라인 전송 */}
      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();

          if (isAiStreaming) {
            handleStopStreaming();
          } else {
            appendAssistantExchange(assistantDraft);
          }
        }}
      >
        <label className={styles.composerField}>
          <textarea
            value={assistantDraft}
            onChange={(event) =>
              setAssistantDraft(event.target.value)
            }
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
            className={styles.composerTextarea}
            rows={2}
            placeholder={isAiStreaming ? "응답 중..." : "질문을 입력하세요"}
            disabled={isAiStreaming}
          />
          {isAiStreaming ? (
            <button
              type="button"
              className={styles.composerStopButton}
              onClick={handleStopStreaming}
              aria-label="응답 중지"
            >
              <Square size={14} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="submit"
              className={styles.composerSendButton}
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
