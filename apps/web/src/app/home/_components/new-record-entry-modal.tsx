"use client";

import { useState, type ReactNode } from "react";
import { FileText, Link2, Mic, Upload, X } from "lucide-react";

import { COUNSELING_AUDIO_TEST_DATA } from "@/lib/counseling-audio-test-data";

interface NewRecordEntryModalProps {
  onClose: () => void;
  onChooseRecording: () => void;
  onChooseUpload: () => void;
  onChoosePreparedUpload: (file: File) => void | Promise<void>;
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
  onChoosePreparedUpload,
  onChooseText,
  linkedStudentName,
}: NewRecordEntryModalProps) {
  const [pendingSampleId, setPendingSampleId] = useState<string | null>(null);
  const [sampleError, setSampleError] = useState<string | null>(null);

  async function handleChooseTestSample(sample: (typeof COUNSELING_AUDIO_TEST_DATA)[number]) {
    setPendingSampleId(sample.id);
    setSampleError(null);

    try {
      const response = await fetch(sample.href, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(
          payload?.message ?? "테스트 음성 파일을 불러오지 못했습니다.",
        );
      }

      const blob = await response.blob();
      const file = new File([blob], sample.fileName, {
        type: blob.type || "audio/mpeg",
      });

      await onChoosePreparedUpload(file);
    } catch (error) {
      setSampleError(
        error instanceof Error
          ? error.message
          : "테스트 음성 파일을 불러오지 못했습니다.",
      );
      setPendingSampleId(null);
    }
  }

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
          <div className="grid gap-1.5">
            <div className="text-[11px] font-medium text-text-dim">
              테스트 음성
            </div>
            <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-0.5">
              {COUNSELING_AUDIO_TEST_DATA.map((sample) => {
                const isPending = pendingSampleId === sample.id;

                return (
                  <button
                    key={sample.id}
                    type="button"
                    className="inline-flex h-7 shrink-0 items-center rounded-full border border-border bg-surface-2 px-2.5 text-[11px] font-medium text-text-secondary transition-[border-color,background-color,color] duration-150 hover:border-accent-border hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void handleChooseTestSample(sample)}
                    disabled={pendingSampleId !== null}
                    title={`${sample.label} · ${sample.description}`}
                  >
                    {isPending ? `${sample.shortLabel}...` : sample.shortLabel}
                  </button>
                );
              })}
            </div>
          </div>
          {sampleError ? (
            <p className="-mt-1 text-[11px] leading-relaxed text-red">
              {sampleError}
            </p>
          ) : null}
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
