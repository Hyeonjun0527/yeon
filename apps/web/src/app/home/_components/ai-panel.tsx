import { useState, useRef, useEffect } from "react";
import styles from "../../mockdata/mockdata.module.css";
import type { RecordItem, RecordPhase, AttachedImage } from "../_lib/types";
import type { AiModelType } from "../_lib/constants";
import { AI_QUICK_CHIPS, AI_MODELS } from "../_lib/constants";
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
  phase: RecordPhase;
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
  const [webSearchOn, setWebSearchOn] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showModelMenu) return;
    function handleClick(e: MouseEvent) {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showModelMenu]);

  return (
    <>
      {collapsed && (
        <button
          className={styles.aiToggleBtn}
          style={{ position: "relative", left: "auto", top: "auto", margin: "12px 4px", alignSelf: "flex-start" }}
          onClick={onExpand}
          title="AI 패널 열기"
        >
          ◀
        </button>
      )}
      <div
        ref={panelRef}
        className={`${styles.aiPanel} ${collapsed ? styles.aiPanelCollapsed : ""}`}
        style={collapsed ? undefined : { width }}
      >
        {!collapsed && (
          <div className={styles.aiResizeHandle} onMouseDown={onStartResize} />
        )}

        {/* 헤더 */}
        <div className={styles.aiHeader}>
          <div className={styles.aiHeaderTabs}>
            <button
              className={`${styles.aiHeaderTab} ${tab === "chat" ? styles.aiHeaderTabActive : ""}`}
              onClick={() => onSetTab("chat")}
            >
              AI 어시스턴트
            </button>
            <button
              className={`${styles.aiHeaderTab} ${tab === "history" ? styles.aiHeaderTabActive : ""}`}
              onClick={() => onSetTab("history")}
            >
              채팅 기록
            </button>
          </div>
          <div className={styles.aiHeaderActions}>
            <button
              className={styles.aiHeaderBtn}
              title="새 채팅"
              onClick={() => {
                if (selectedId) onClearMessages(selectedId);
                onSetTab("chat");
              }}
            >
              <PlusCircleIcon size={16} />
            </button>
            <button
              className={styles.aiHeaderBtn}
              title="채팅 기록"
              onClick={() => onSetTab(tab === "history" ? "chat" : "history")}
            >
              <ListIcon size={16} />
            </button>
            <button
              className={styles.aiHeaderBtn}
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
          <>
            {/* AI 요약 */}
            {selected?.status === "ready" && selected.aiSummary && !selected.aiSummary.startsWith("업로드 실패:") && (
              <AiSummaryCard selected={selected} />
            )}
            {selected?.status === "ready" && selected.aiSummary?.startsWith("업로드 실패:") && (
              <UploadErrorCard message={selected.aiSummary} />
            )}

            {isProcessing && (
              <div className={styles.aiMessages}>
                <div className={`${styles.aiMsg} ${styles.aiMsgSystem}`}>
                  전사가 완료되면 자동으로 상담 요약을 생성합니다
                </div>
              </div>
            )}

            {/* 메시지 목록 */}
            {selected && selected.aiMessages.length > 0 && (
              <div className={styles.aiMessages} style={{ flex: 1, overflowY: "auto" }}>
                {selected.aiMessages.map((msg, i) => (
                  <div
                    key={i}
                    className={`${styles.aiMsg} ${msg.role === "user" ? styles.aiMsgUser : styles.aiMsgAssistant}`}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {msg.images && msg.images.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                        {msg.images.map((img) => (
                          <div key={img.id} className={styles.aiImageChip} style={{ background: "var(--surface3)" }}>
                            <PaperclipIcon size={12} />
                            <span className={styles.aiImageChipName}>{img.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.text}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}

            {/* 빈 공간 채우기 */}
            {selected?.status === "ready" && selected.aiMessages.length === 0 && (
              <div style={{ flex: 1 }} />
            )}

            {/* 퀵칩 */}
            {selected?.status === "ready" && (
              <div className={styles.aiQuick}>
                {AI_QUICK_CHIPS.map((chip) => (
                  <button
                    key={chip}
                    className={styles.aiChip}
                    onClick={() => onSendQuickChip(chip)}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {/* 입력 */}
            <div className={styles.aiInputWrap}>
              {/* 이미지 첨부 칩 */}
              {images.length > 0 && (
                <div className={styles.aiImageChips}>
                  {images.map((img) => (
                    <div
                      key={img.id}
                      className={`${styles.aiImageChip} ${img.loading ? styles.aiImageChipLoading : ""}`}
                    >
                      <PaperclipIcon size={14} />
                      <span className={styles.aiImageChipName}>{img.name}</span>
                      {!img.loading && (
                        <button
                          className={styles.aiImageChipRemove}
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
                style={{ display: "none" }}
                onChange={(e) => {
                  if (e.target.files) onAddImages(e.target.files);
                  e.target.value = "";
                }}
              />
              <div className={styles.aiInputBox}>
                <textarea
                  ref={textareaRef}
                  className={styles.aiTextarea}
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
                <div className={styles.aiInputToolbar}>
                  <button
                    className={styles.aiToolBtn}
                    title="파일 첨부"
                    disabled={isProcessing}
                    onClick={() => imageInputRef.current?.click()}
                  >
                    <PaperclipIcon size={15} />
                  </button>
                  <button
                    className={`${styles.aiToolBtn} ${webSearchOn ? styles.aiWebSearchActive : ""}`}
                    title={webSearchOn ? "웹 검색 켜짐" : "웹 검색"}
                    disabled={isProcessing}
                    onClick={() => setWebSearchOn((p) => !p)}
                  >
                    <GlobeIcon size={15} />
                  </button>
                  <div ref={modelMenuRef} style={{ position: "relative" }}>
                    <button
                      className={styles.aiModelSelect}
                      onClick={() => setShowModelMenu((p) => !p)}
                      disabled={isProcessing}
                    >
                      {model}
                      <ChevronDownIcon size={14} />
                    </button>
                    {showModelMenu && (
                      <div className={styles.btnNewDropdown} style={{ bottom: "calc(100% + 4px)", top: "auto", right: 0, left: "auto" }}>
                        {AI_MODELS.map((m) => (
                          <button
                            key={m}
                            className={styles.btnNewDropdownItem}
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
                    className={styles.aiSendBtn}
                    onClick={onSend}
                    disabled={!canSend}
                    title="전송"
                  >
                    <SendIcon size={14} />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ── 하위 프레젠테이션 컴포넌트 ── */

function ChatHistoryTab() {
  return (
    <div className={styles.aiMessages} style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ fontSize: 12, color: "var(--mock-text-dim)", textAlign: "center", padding: "24px 16px" }}>
        아직 저장된 채팅 기록이 없습니다
      </div>
    </div>
  );
}

function AiSummaryCard({ selected }: { selected: RecordItem }) {
  return (
    <div className={styles.aiSummary}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--mock-accent)", marginBottom: 8 }}>
        ✦ AI 상담 분석
      </div>
      <div style={{ fontSize: 13, lineHeight: 1.6 }}>
        {(selected.studentName || selected.type) && (
          <div style={{ display: "flex", gap: 16, marginBottom: 6 }}>
            {selected.studentName && <div><strong>수강생:</strong> {selected.studentName}</div>}
            {selected.type && <div><strong>유형:</strong> {selected.type}</div>}
          </div>
        )}
        <div style={{ whiteSpace: "pre-wrap", color: "var(--mock-text-secondary)" }}>
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
      className={styles.aiSummary}
      style={{ borderColor: "var(--error, #e53e3e)", background: "color-mix(in srgb, var(--error, #e53e3e) 8%, transparent)" }}
    >
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--error, #e53e3e)", marginBottom: 6 }}>
        업로드 실패
      </div>
      <div style={{ fontSize: 12, color: "var(--mock-text-secondary)", lineHeight: 1.5 }}>
        {detail}
      </div>
      <div style={{ fontSize: 11, color: "var(--mock-text-dim)", marginTop: 6 }}>
        녹음 파일을 다시 업로드하거나 새 녹음을 시도해 주세요.
      </div>
    </div>
  );
}
