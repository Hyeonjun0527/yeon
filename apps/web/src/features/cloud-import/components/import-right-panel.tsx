"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Trash2 } from "lucide-react";
import type { ChatMessage, ImportHook, ImportPreview } from "../types";

interface ImportRightPanelProps {
  hook: ImportHook;
  onClose: () => void;
}

export function ImportRightPanel({ hook, onClose }: ImportRightPanelProps) {
  const {
    selectedFile,
    analyzing,
    streamingText,
    editablePreview,
    importing,
    importResult,
    error,
    chatMessages,
    analyzeSelectedFile,
    updatePreview,
    confirmImport,
  } = hook;

  /* 파일 미선택 */
  if (!selectedFile) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-center h-full min-h-[200px] text-text-dim text-sm text-center">
          파일을 선택하면 여기에 미리보기가 나타납니다
        </div>
      </div>
    );
  }

  /* 완료 */
  if (importResult) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2.5 p-5 rounded-lg bg-[rgba(34,197,94,0.1)] text-green text-sm font-medium">
          <Check size={20} />
          <span>
            {importResult.spaces}개 스페이스, {importResult.members}명 수강생이
            생성되었습니다.
          </span>
        </div>
        <div className="mt-4 text-center">
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-[13px] font-medium border-0 bg-accent text-white cursor-pointer transition-opacity duration-150 hover:opacity-90"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>
      </div>
    );
  }

  /* 가져오는 중 */
  if (importing) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-center gap-2.5 p-6 mb-3 bg-accent-dim rounded-lg text-accent text-[13px] font-medium">
          <Loader2 size={24} className="animate-spin" />
          <span>가져오는 중...</span>
        </div>
      </div>
    );
  }

  /* 분석 결과 미리보기 */
  if (editablePreview) {
    return (
      <div className="h-full flex flex-col">
        {error && (
          <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
            {error}
          </div>
        )}
        <PreviewEditor
          preview={editablePreview}
          onUpdate={updatePreview}
          onConfirm={confirmImport}
          onCancel={() => hook.selectFileForPreview(selectedFile)}
          onRefine={hook.refineWithInstruction}
          analyzing={analyzing}
          streamingText={streamingText}
          importing={importing}
          chatMessages={chatMessages}
        />
      </div>
    );
  }

  /* 초기 분석 중 */
  if (analyzing) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-center gap-2.5 p-6 mb-3 bg-accent-dim rounded-lg text-accent text-[13px] font-medium">
          <Loader2 size={24} className="animate-spin" />
          <span>{streamingText ?? "파일을 분석하고 있습니다..."}</span>
        </div>
      </div>
    );
  }

  /* 파일 선택됨, 분석 전 */
  return (
    <div className="h-full flex flex-col">
      {error && (
        <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
          {error}
        </div>
      )}
      <div className="text-center px-5 py-10">
        <p className="text-sm font-semibold text-text mb-1">{selectedFile.name}</p>
        <p className="text-xs text-text-dim mb-5">AI가 파일에서 수강생 정보를 분석합니다.</p>
        <button
          className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold border-0 bg-accent text-white cursor-pointer transition-opacity duration-150 hover:opacity-90"
          onClick={analyzeSelectedFile}
          type="button"
        >
          분석 시작
        </button>
      </div>
    </div>
  );
}

/* ── Preview Editor ── */

interface PreviewEditorProps {
  preview: ImportPreview;
  onUpdate: (p: ImportPreview) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onRefine: (instruction: string) => Promise<void>;
  analyzing: boolean;
  streamingText: string | null;
  importing: boolean;
  chatMessages: ChatMessage[];
}

function PreviewEditor({
  preview,
  onUpdate,
  onConfirm,
  onCancel,
  onRefine,
  analyzing,
  streamingText,
  importing,
  chatMessages,
}: PreviewEditorProps) {
  const updateCohortName = (ci: number, name: string) => {
    const cohorts = preview.cohorts.map((c, i) =>
      i === ci ? { ...c, name } : c,
    );
    onUpdate({ cohorts });
  };

  const updateStudent = (
    ci: number,
    si: number,
    field: "name" | "email" | "phone",
    value: string,
  ) => {
    const cohorts = preview.cohorts.map((c, i) => {
      if (i !== ci) return c;
      const students = c.students.map((s, j) =>
        j === si ? { ...s, [field]: field === "name" ? value : (value || null) } : s,
      );
      return { ...c, students };
    });
    onUpdate({ cohorts });
  };

  const removeStudent = (ci: number, si: number) => {
    const cohorts = preview.cohorts.map((c, i) => {
      if (i !== ci) return c;
      return { ...c, students: c.students.filter((_, j) => j !== si) };
    });
    onUpdate({ cohorts });
  };

  const totalStudents = preview.cohorts.reduce((sum, c) => sum + c.students.length, 0);

  return (
    <div className="flex flex-col h-full">
      {/* 스크롤 가능한 미리보기 테이블 */}
      <div className="flex-1 overflow-y-auto py-3 min-h-0">
        <div className="text-[13px] text-text-dim mb-4">
          {preview.cohorts.length}개 스페이스, {totalStudents}명 수강생
        </div>

        {preview.cohorts.map((cohort, ci) => (
          <div key={ci} className="mb-5">
            <input
              className="text-sm font-semibold text-text bg-[var(--surface2,var(--surface))] border border-border rounded-[6px] px-3 py-2 w-full mb-2.5 focus:outline-none focus:border-accent"
              value={cohort.name}
              onChange={(e) => updateCohortName(ci, e.target.value)}
              placeholder="스페이스명"
            />
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className="text-left px-2 py-1.5 font-semibold text-text-dim text-[11px] uppercase tracking-[0.04em] border-b border-border">이름</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-text-dim text-[11px] uppercase tracking-[0.04em] border-b border-border">이메일</th>
                  <th className="text-left px-2 py-1.5 font-semibold text-text-dim text-[11px] uppercase tracking-[0.04em] border-b border-border">전화번호</th>
                  <th className="text-left px-2 py-1.5 border-b border-border" style={{ width: 40 }} />
                </tr>
              </thead>
              <tbody>
                {cohort.students.map((student, si) => (
                  <tr key={si}>
                    <td className="px-2 py-1 border-b border-border">
                      <input
                        className="w-full px-1.5 py-1 border border-transparent rounded bg-transparent text-text text-[13px] focus:outline-none focus:border-accent focus:bg-[var(--surface2,var(--surface))]"
                        value={student.name}
                        onChange={(e) => updateStudent(ci, si, "name", e.target.value)}
                      />
                    </td>
                    <td className="px-2 py-1 border-b border-border">
                      <input
                        className="w-full px-1.5 py-1 border border-transparent rounded bg-transparent text-text text-[13px] focus:outline-none focus:border-accent focus:bg-[var(--surface2,var(--surface))]"
                        value={student.email ?? ""}
                        onChange={(e) => updateStudent(ci, si, "email", e.target.value)}
                        placeholder="-"
                      />
                    </td>
                    <td className="px-2 py-1 border-b border-border">
                      <input
                        className="w-full px-1.5 py-1 border border-transparent rounded bg-transparent text-text text-[13px] focus:outline-none focus:border-accent focus:bg-[var(--surface2,var(--surface))]"
                        value={student.phone ?? ""}
                        onChange={(e) => updateStudent(ci, si, "phone", e.target.value)}
                        placeholder="-"
                      />
                    </td>
                    <td className="px-2 py-1 border-b border-border">
                      <button
                        className="flex items-center justify-center w-6 h-6 rounded bg-transparent text-text-dim cursor-pointer border-0 transition-[background,color] duration-[120ms] hover:bg-[rgba(239,68,68,0.1)] hover:text-red"
                        onClick={() => removeStudent(ci, si)}
                        type="button"
                        title="삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      {/* 채팅 영역 — 고정 */}
      <div className="flex-shrink-0 border-t border-border">
        <ChatSection
          messages={chatMessages}
          analyzing={analyzing}
          streamingText={streamingText}
          onSend={onRefine}
        />
      </div>

      {/* 확인/취소 버튼 */}
      <div className="flex justify-end gap-2 pt-3 pb-1 border-t border-border flex-shrink-0">
        <button
          className="px-4 py-2 rounded-[6px] text-[13px] font-medium border border-border bg-transparent text-text-secondary cursor-pointer hover:bg-[var(--surface3)]"
          onClick={onCancel}
          type="button"
          disabled={importing}
        >
          취소
        </button>
        <button
          className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-[13px] font-medium border-0 bg-accent text-white cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onConfirm}
          type="button"
          disabled={importing || analyzing || totalStudents === 0}
        >
          {importing ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              가져오는 중...
            </>
          ) : (
            `${totalStudents}명 가져오기`
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Chat Section ── */

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 L13.5 8.5 L19 10 L13.5 11.5 L12 17 L10.5 11.5 L5 10 L10.5 8.5 Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ChatSection({
  messages,
  analyzing,
  streamingText,
  onSend,
}: {
  messages: ChatMessage[];
  analyzing: boolean;
  streamingText: string | null;
  onSend: (text: string) => Promise<void>;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, analyzing]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || analyzing) return;
    setInput("");
    await onSend(trimmed);
  };

  const isEmpty = messages.length === 0 && !analyzing;

  return (
    <div className="flex flex-col" style={{ height: 220 }}>
      {/* 메시지 목록 */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-2"
      >
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-full gap-1.5 text-center">
            <SparkleIcon />
            <p className="text-[12px] text-text-dim m-0 leading-relaxed">
              AI에게 수정을 요청해 보세요<br />
              <span className="text-text-dim opacity-70">예: 김민지 이름 김민제로 바꿔</span>
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
          >
            {msg.role === "ai" && (
              <div className="w-6 h-6 rounded-full bg-accent-dim flex items-center justify-center flex-shrink-0 mt-0.5 text-accent">
                <SparkleIcon />
              </div>
            )}
            <div
              className={`max-w-[80%] px-3 py-2 rounded-xl text-[12px] leading-relaxed ${
                msg.role === "user"
                  ? "bg-accent text-white rounded-tr-sm"
                  : "bg-surface-3 text-text-secondary rounded-tl-sm"
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}

        {analyzing && (
          <div className="flex gap-2 flex-row">
            <div className="w-6 h-6 rounded-full bg-accent-dim flex items-center justify-center flex-shrink-0 mt-0.5 text-accent">
              <SparkleIcon />
            </div>
            <div className="px-3 py-2 rounded-xl rounded-tl-sm bg-surface-3 text-[12px] text-text-dim flex items-center gap-1.5">
              <Loader2 size={12} className="animate-spin" />
              <span>{streamingText ?? "처리 중..."}</span>
            </div>
          </div>
        )}
      </div>

      {/* 입력창 */}
      <div className="flex items-end gap-2 px-3 py-2 border-t border-border">
        <textarea
          ref={textareaRef}
          className="flex-1 resize-none text-[12px] bg-surface-2 border border-border rounded-lg px-2.5 py-2 text-text outline-none leading-relaxed transition-[border-color] duration-150 focus:border-accent-border disabled:opacity-50 disabled:cursor-not-allowed font-[inherit]"
          rows={1}
          placeholder="수정 요청... (Enter로 전송)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          disabled={analyzing}
          style={{ minHeight: 32, maxHeight: 80 }}
        />
        <button
          className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white border-0 cursor-pointer flex-shrink-0 transition-opacity duration-150 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
          onClick={handleSend}
          disabled={!input.trim() || analyzing}
          type="button"
          title="전송"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}
