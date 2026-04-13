"use client";

import type { ReactNode } from "react";
import { FileText, Link2, Mic, Upload, X } from "lucide-react";

interface NewRecordEntryModalProps {
  onClose: () => void;
  onChooseRecording: () => void;
  onChooseUpload: () => void;
  onChooseText: () => void;
  linkedStudentName?: string;
}

function EntryButton({
  icon,
  title,
  description,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-surface-2/80 px-4 py-3 text-left transition-[border-color,background-color] duration-150 hover:border-accent-border hover:bg-surface-2"
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-3 text-accent">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-semibold tracking-[-0.02em] text-text">
            {title}
          </div>
          <div className="mt-1 text-[12px] leading-relaxed text-text-dim">
            {description}
          </div>
        </div>
      </div>
    </button>
  );
}

export function NewRecordEntryModal({
  onClose,
  onChooseRecording,
  onChooseUpload,
  onChooseText,
  linkedStudentName,
}: NewRecordEntryModalProps) {
  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-[rgba(5,5,8,0.72)] p-4 backdrop-blur-[10px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-[min(420px,100%)] rounded-2xl border border-border bg-surface shadow-[0_24px_60px_rgba(0,0,0,0.4)]">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <h2 className="text-[16px] font-semibold tracking-[-0.03em] text-text">
              새 상담 기록
            </h2>
            <p className="mt-1 text-[12px] text-text-dim">
              시작 방식을 선택해 주세요.
            </p>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-transparent bg-transparent text-text-dim transition-[border-color,background-color,color] duration-150 hover:border-border hover:bg-surface-3 hover:text-text"
            onClick={onClose}
            aria-label="모달 닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-2.5 p-4">
          {linkedStudentName ? (
            <div className="flex items-start gap-3 rounded-xl border border-accent-border bg-accent-dim px-4 py-3 text-[12px] text-accent">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-accent-border bg-surface/70">
                <Link2 size={15} />
              </div>
              <div className="min-w-0 leading-relaxed">
                이번 상담 기록은{" "}
                <span className="font-semibold">{linkedStudentName}</span>{" "}
                수강생에게 자동 연결됩니다.
              </div>
            </div>
          ) : null}
          <EntryButton
            icon={<Mic size={18} />}
            title="바로 녹음하기"
            description="지금 바로 녹음을 시작합니다."
            onClick={onChooseRecording}
          />
          <EntryButton
            icon={<Upload size={18} />}
            title="파일 업로드"
            description="기존 음성 파일을 올립니다."
            onClick={onChooseUpload}
          />
          <EntryButton
            icon={<FileText size={18} />}
            title="텍스트로 기록하기"
            description="짧은 상담 메모를 남깁니다."
            onClick={onChooseText}
          />
        </div>

        <div className="flex justify-end border-t border-border px-4 py-3">
          <button
            type="button"
            className="rounded-xl border border-border bg-transparent px-3 py-2 text-[12px] font-medium text-text-secondary transition-[background-color,color,border-color] duration-150 hover:border-border-light hover:bg-surface-3 hover:text-text"
            onClick={onClose}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
