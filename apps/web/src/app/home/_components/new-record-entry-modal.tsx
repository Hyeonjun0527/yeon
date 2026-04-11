"use client";

import type { ReactNode } from "react";
import { FileText, Mic, Upload, X } from "lucide-react";

interface NewRecordEntryModalProps {
  onClose: () => void;
  onChooseRecording: () => void;
  onChooseUpload: () => void;
  onChooseText: () => void;
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
      className="w-full flex items-start gap-3 rounded-xl border border-border bg-surface-3 px-4 py-4 text-left cursor-pointer transition-[border-color,background-color,transform] duration-150 hover:border-accent-border hover:bg-accent-dim hover:-translate-y-px"
    >
      <div className="mt-0.5 text-accent">{icon}</div>
      <div className="grid gap-1">
        <div className="text-[14px] font-semibold text-text">{title}</div>
        <div className="text-[12px] leading-relaxed text-text-dim">
          {description}
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
}: NewRecordEntryModalProps) {
  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-[min(520px,100%)] rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <div className="text-[15px] font-semibold text-text">
              새 상담 시작
            </div>
            <div className="mt-1 text-[12px] text-text-dim">
              어떤 방식으로 상담 기록을 만들지 먼저 선택해 주세요.
            </div>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border-none bg-transparent text-text-dim cursor-pointer transition-colors hover:bg-surface-3 hover:text-text"
            onClick={onClose}
            aria-label="모달 닫기"
          >
            <X size={16} />
          </button>
        </div>

        <div className="grid gap-3 p-4">
          <EntryButton
            icon={<Mic size={18} />}
            title="바로 녹음하기"
            description="지금 바로 마이크로 상담을 녹음하고, 종료 후 저장 단계로 넘어갑니다."
            onClick={onChooseRecording}
          />
          <EntryButton
            icon={<Upload size={18} />}
            title="파일 업로드"
            description="기존 음성 파일을 올려 전사와 분석을 시작합니다."
            onClick={onChooseUpload}
          />
          <EntryButton
            icon={<FileText size={18} />}
            title="텍스트로 기록하기"
            description="짧은 상담 메모나 텍스트 기록을 바로 남길 수 있습니다."
            onClick={onChooseText}
          />
        </div>
      </div>
    </div>
  );
}
