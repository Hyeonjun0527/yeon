"use client";

import { useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { RecordItem, AttachedImage } from "../_lib/types";
import type { AiModelType } from "../_lib/constants";
import { AI_QUICK_CHIPS, AI_MODELS } from "../_lib/constants";
import { useClickOutside } from "../_hooks";
import {
  PlusCircleIcon,
  ListIcon,
  ChevronRightIcon,
  PaperclipIcon,
  GlobeIcon,
  ChevronDownIcon,
  SendIcon,
} from "./icons";

export interface AiPanelProps {
  /* 패널 상태 */
  width: number;
  collapsed: boolean;
  tab: "chat" | "history";
  model: AiModelType;
  panelRef: React.RefObject<HTMLDivElement | null>;
  onSetTab: (tab: "chat" | "history") => void;
  onToggleCollapsed: () => void;
  onExpand: () => void;
  onToggleModel: () => void;
  onStartResize: (e: React.MouseEvent) => void;
  /* 데이터 */
  phase: "processing" | "ready";
  selected: RecordItem | null;
  selectedId: string | null;
  onClearMessages: (id: string) => void;
  /* 채팅 */
  aiInput: string;
  onAiInputChange: (val: string) => void;
  onSend: () => void;
  onSendQuickChip: (text: string) => void;
  canSend: boolean;
  endRef: React.RefObject<HTMLDivElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /* 이미지 첨부 */
  images: AttachedImage[];
  onAddImages: (files: FileList | File[]) => void;
  onRemoveImage: (id: string) => void;
  imageInputRef: React.RefObject<HTMLInputElement | null>;
}

export function AiPanel({
  width,
  collapsed,
  tab,
  model,
  panelRef,
  onSetTab,
  onToggleCollapsed,
  onExpand,
  onToggleModel,
  onStartResize,
  phase,
  selected,
  selectedId,
  onClearMessages,
  aiInput,
  onAiInputChange,
  onSend,
  onSendQuickChip,
  canSend,
  endRef,
  textareaRef,
  images,
  onAddImages,
  onRemoveImage,
  imageInputRef,
}: AiPanelProps) {
  const isProcessing = phase === "processing";
  const [showModelMenu, setShowModelMenu] = useState(false);
  const modelMenuRef = useClickOutside<HTMLDivElement>(() => setShowModelMenu(false), showModelMenu);

  return (
    <>
      {collapsed && (
        <button
          className="relative left-auto top-auto m-3 mt-3 self-start w-6 h-6 rounded-[6px] border border-border bg-surface flex items-center justify-center cursor-pointer text-xs text-text-dim z-[11] transition-colors duration-150 hover:bg-surface-3"
          onClick={onExpand}
          title="AI 패널 열기"
        >
          ◀
        </button>
      )}
      <div
        ref={panelRef}
        data-tutorial="ai-panel"
        className={`border-l border-border flex flex-col bg-surface relative transition-[width] duration-150 ${
          collapsed ? "!w-0 min-w-0 overflow-hidden border-l-0" : ""
        }`}
        style={collapsed ? undefined : { width, minWidth: 280, maxWidth: 600 }}
      >
        {!collapsed && (
          <div
            className="absolute left-[-3px] top-0 bottom-0 w-[6px] cursor-col-resize z-10 bg-transparent hover:bg-accent hover:opacity-30 active:bg-accent active:opacity-30"
            onMouseDown={onStartResize}
          />
        )}

        {/* 헤더 */}
        <div className="px-3 h-[49px] min-h-[49px] border-b border-border text-[13px] font-semibold flex items-center gap-0">
          <div className="flex items-center gap-4 h-full">
            <button
              className={`flex items-center h-full text-[13px] font-semibold bg-none border-none border-b-2 cursor-pointer p-0 font-[inherit] transition-colors duration-150 ${
                tab === "chat"
                  ? "text-text border-b-text"
                  : "text-text-dim border-b-transparent hover:text-text-secondary"
              }`}
              onClick={() => onSetTab("chat")}
            >
              AI 어시스턴트
            </button>
            <button
              className={`flex items-center h-full text-[13px] font-semibold bg-none border-none border-b-2 cursor-pointer p-0 font-[inherit] transition-colors duration-150 ${
                tab === "history"
                  ? "text-text border-b-text"
                  : "text-text-dim border-b-transparent hover:text-text-secondary"
              }`}
              onClick={() => onSetTab("history")}
            >
              채팅 기록
            </button>
          </div>
          <div className="flex items-center gap-0.5 ml-auto">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-[6px] border-none bg-none cursor-pointer text-text-secondary text-sm transition-colors duration-150 hover:bg-surface-3"
              title="새 채팅"
              onClick={() => {
                if (selectedId) onClearMessages(selectedId);
                onSetTab("chat");
              }}
            >
              <PlusCircleIcon size={16} />
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-[6px] border-none bg-none cursor-pointer text-text-secondary text-sm transition-colors duration-150 hover:bg-surface-3"
              title="채팅 기록"
              onClick={() => onSetTab(tab === "history" ? "chat" : "history")}
            >
              <ListIcon size={16} />
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-[6px] border-none bg-none cursor-pointer text-text-secondary text-sm transition-colors duration-150 hover:bg-surface-3"
              title="패널 접기"
              onClick={onToggleCollapsed}
            >
              <ChevronRightIcon size={16} />
            </button>
          </div>
        </div>

        {/* 채팅 기록 탭 */}
        {tab === "history" && <ChatHistoryTab />}

        {/* 채팅 탭 */}
        {tab === "chat" && (
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* AI 요약 */}
            {selected?.status === "ready" && selected.aiSummary && !selected.aiSummary.startsWith("업로드 실패:") && (
              <AiSummaryCard selected={selected} />
            )}
            {selected?.status === "ready" && selected.aiSummary?.startsWith("업로드 실패:") && (
              <UploadErrorCard message={selected.aiSummary} />
            )}

            {isProcessing && (
              <div className="flex-1 px-4 py-3 overflow-y-auto">
                <div className="bg-none text-text-dim text-[11px] text-center max-w-full px-4 py-4 rounded mb-2">
                  전사가 완료되면 자동으로 상담 요약을 생성합니다
                </div>
              </div>
            )}

            {/* 메시지 목록 */}
            {selected && selected.aiMessages.length > 0 && (
              <div className="flex-1 px-4 py-3 overflow-y-auto min-h-0">
                {selected.aiMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`px-[14px] py-[10px] rounded mb-2 max-w-[92%] text-[12.5px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent-dim border border-accent-border ml-auto"
                        : "bg-surface-2 border border-border"
                    }`}
                    style={msg.role === "user" ? { whiteSpace: "pre-wrap" } : undefined}
                  >
                    {msg.images && msg.images.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-[6px]">
                        {msg.images.map((img) => (
                          <div key={img.id} className="flex items-center gap-[6px] max-w-full px-[10px] py-1 border border-border rounded-full bg-surface-3 text-xs text-text">
                            <PaperclipIcon size={12} />
                            <span className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">{img.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.role === "assistant" ? (
                      <Markdown remarkPlugins={[remarkGfm]}>{msg.text}</Markdown>
                    ) : (
                      msg.text
                    )}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}

            {/* 빈 공간 채우기 */}
            {selected?.status === "ready" && selected.aiMessages.length === 0 && (
              <div className="flex-1" />
            )}

            {/* 퀵칩 */}
            {selected?.status === "ready" && (
              <div className="flex flex-wrap gap-[5px] px-4 py-[6px] flex-shrink-0">
                {AI_QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    className="bg-surface-2 border border-border rounded-[6px] px-[10px] py-[5px] text-[11px] text-text-secondary cursor-pointer font-[inherit] hover:border-accent-border hover:text-text"
                    onClick={() => onSendQuickChip(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* 입력 */}
            <div className="p-[10px] border-t border-border flex-shrink-0">
              {/* 이미지 첨부 칩 */}
              {images.length > 0 && (
                <div className="flex flex-wrap gap-[6px] px-[10px] pt-2 pb-0">
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className={`flex items-center gap-[6px] max-w-full px-[10px] py-1 border border-border rounded-full bg-surface-2 text-xs text-text ${
                        img.loading ? "opacity-50 animate-pulse" : ""
                      }`}
                    >
                      <PaperclipIcon size={14} />
                      <span className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap">{img.name}</span>
                      {!img.loading && (
                        <button
                          className="bg-none border-none text-text-dim cursor-pointer px-[2px] text-sm leading-none hover:text-text"
                          onClick={() => onRemoveImage(img.id)}
                        >
                          x
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {/* 숨겨진 파일 입력 */}
              <input
                ref={imageInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) onAddImages(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className="flex flex-col border border-border rounded-[10px] bg-bg overflow-hidden transition-[border-color] duration-150 focus-within:border-accent-border">
                <textarea
                  ref={textareaRef}
                  className="w-full min-h-[44px] max-h-[120px] px-[14px] pt-3 pb-1 text-text text-[13px] leading-[1.5] outline-none font-[inherit] bg-transparent border-none resize-none overflow-y-auto placeholder:text-text-dim"
                  placeholder={isProcessing ? "전사 완료 후 질문 가능" : "무엇이든 질문하세요..."}
                  disabled={isProcessing}
                  value={aiInput}
                  onChange={(e) => onAiInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      onSend();
                    }
                  }}
                  rows={1}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
                  }}
                />
                <div className="flex items-center px-[10px] pt-[6px] pb-2 gap-0.5">
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-[6px] border-none bg-none cursor-pointer text-text-secondary text-sm transition-[background,color] duration-150 hover:bg-surface-3 hover:text-text disabled:opacity-40 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-text-secondary"
                    title="파일 첨부"
                    disabled={isProcessing}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <PaperclipIcon size={15} />
                  </button>
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-[6px] border-none bg-none cursor-pointer text-text-secondary text-sm transition-[background,color] duration-150 hover:bg-surface-3 hover:text-text disabled:opacity-40 disabled:cursor-default"
                    title="웹 검색 (미구현)"
                    disabled
                  >
                    <GlobeIcon size={15} />
                  </button>
                  <div ref={modelMenuRef} className="relative">
                    <button
                      className="ml-auto flex items-center gap-1 text-[13px] text-text-secondary bg-none border-none cursor-pointer font-[inherit] px-[6px] py-1 rounded-[6px] transition-colors duration-150 hover:bg-surface-3 disabled:opacity-40"
                      onClick={() => setShowModelMenu((p) => !p)}
                      disabled={isProcessing}
                    >
                      {model}
                      <ChevronDownIcon size={14} />
                    </button>
                    {showModelMenu && (
                      <div
                        className="absolute bg-surface-3 border border-border-light rounded-sm py-1 min-w-[140px] z-50 shadow-[0_8px_24px_rgba(0,0,0,0.4)]"
                        style={{ bottom: "calc(100% + 4px)", top: "auto", right: 0, left: "auto" }}
                      >
                        {AI_MODELS.map((m) => (
                          <button
                            key={m}
                            className="flex items-center gap-2 w-full px-3 py-2 bg-none border-none text-text text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4"
                            style={m === model ? { color: "var(--accent)" } : undefined}
                            onClick={() => {
                              onToggleModel();
                              setShowModelMenu(false);
                            }}
                          >
                            {m === model ? "✓ " : "  "}{m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className="w-7 h-7 flex items-center justify-center rounded-full border-none bg-accent text-white cursor-pointer text-[13px] transition-opacity duration-150 ml-[6px] flex-shrink-0 hover:not-disabled:opacity-85 disabled:bg-border disabled:cursor-default"
                    onClick={onSend}
                    disabled={!canSend}
                    title="전송"
                  >
                    <SendIcon size={14} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── 하위 프레젠테이션 컴포넌트 ── */

function ChatHistoryTab() {
  return (
    <div className="flex-1 flex items-center justify-center px-4 py-3 overflow-y-auto">
      <div className="text-xs text-text-dim text-center py-6 px-4">
        아직 저장된 채팅 기록이 없습니다
      </div>
    </div>
  );
}

function AiSummaryCard({ selected }: { selected: RecordItem }) {
  return (
    <div className="m-3 px-4 py-[14px] bg-gradient-to-br from-[rgba(129,140,248,0.06)] to-[rgba(34,211,238,0.04)] border border-accent-border rounded text-xs">
      <div className="text-[11px] font-semibold text-accent tracking-[0.3px] mb-2 flex items-center gap-[5px]">
        ✦ AI 상담 분석
      </div>
      <div className="text-[13px] leading-relaxed">
        {(selected.studentName || selected.type) && (
          <div className="flex gap-4 mb-[6px]">
            {selected.studentName && <div><strong>수강생:</strong> {selected.studentName}</div>}
            {selected.type && <div><strong>유형:</strong> {selected.type}</div>}
          </div>
        )}
        <div className="whitespace-pre-wrap text-text-secondary">
          {selected.aiSummary}
        </div>
      </div>
    </div>
  );
}

function UploadErrorCard({ message }: { message: string }) {
  const detail = message.replace(/^업로드 실패:\s*/, "");
  return (
    <div
      className="m-3 px-4 py-[14px] rounded text-xs"
      style={{ borderColor: "var(--error, #e53e3e)", border: "1px solid", background: "color-mix(in srgb, var(--error, #e53e3e) 8%, transparent)" }}
    >
      <div className="text-[11px] font-semibold mb-[6px]" style={{ color: "var(--error, #e53e3e)" }}>
        업로드 실패
      </div>
      <div className="text-xs text-text-secondary leading-[1.5]">
        {detail}
      </div>
      <div className="text-[11px] text-text-dim mt-[6px]">
        녹음 파일을 다시 업로드하거나 새 녹음을 시도해 주세요.
      </div>
    </div>
  );
}
