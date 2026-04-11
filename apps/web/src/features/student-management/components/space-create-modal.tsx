"use client";

import { useState } from "react";
import { ArrowLeft, FileUp, FolderPlus, Sparkles, X } from "lucide-react";

import { CloudImportInline } from "@/features/cloud-import/components/cloud-import-inline";

import type { Space } from "../types";

export type StudentSpaceCreateStep = "choose" | "blank" | "import";

interface StudentSpaceCreateModalProps {
  onClose: () => void;
  onCreated: (space: Space) => void;
  onImported: () => void;
  onDraftDiscarded?: () => void;
  initialStep?: StudentSpaceCreateStep;
  initialLocalDraftId?: string | null;
}

export function StudentSpaceCreateModal({
  onClose,
  onCreated,
  onImported,
  onDraftDiscarded,
  initialStep = "choose",
  initialLocalDraftId = null,
}: StudentSpaceCreateModalProps) {
  const [step, setStep] = useState<StudentSpaceCreateStep>(initialStep);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreateBlankSpace() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("스페이스 이름을 입력해 주세요.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName }),
      });

      if (!response.ok) {
        const message = await response.text().catch(() => "");
        throw new Error(message || "스페이스를 만들지 못했습니다.");
      }

      const data = (await response.json()) as { space: Space };
      onCreated(data.space);
      onClose();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "스페이스를 만들지 못했습니다.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (step === "import") {
    return (
      <div
        className="fixed inset-0 z-[300] bg-[rgba(0,0,0,0.62)] p-3"
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            onClose();
          }
        }}
      >
        <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
          <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
                AI 가져오기
              </p>
              <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
                파일을 분석해서 스페이스를 만듭니다
              </h2>
              <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                Google Drive, OneDrive, 내 컴퓨터에서 파일을 가져와 AI가 초안을
                만들고, 검토 후 스페이스를 생성합니다.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-3 px-3 py-2 text-[13px] text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text"
                onClick={() => setStep("choose")}
              >
                <ArrowLeft size={14} />
                뒤로
              </button>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-transparent text-text-dim transition-colors hover:border-border hover:bg-surface-3 hover:text-text"
                onClick={onClose}
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="border-b border-border bg-surface-2/70 px-5 py-3 text-[12px] leading-relaxed text-text-dim">
            추천 형식은 엑셀/CSV입니다. 가져온 내용은 바로 생성하지 않고, 초안을
            먼저 검토한 뒤 확정합니다.
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <CloudImportInline
              expanded
              initialLocalDraftId={initialLocalDraftId}
              onDraftDiscarded={onDraftDiscarded}
              onClose={onClose}
              onImportComplete={onImported}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-[rgba(0,0,0,0.62)] p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex w-full max-w-[560px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
              스페이스 만들기
            </p>
            <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
              {step === "choose" ? "어떻게 시작할까요?" : "빈 스페이스 만들기"}
            </h2>
          </div>
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent bg-transparent text-text-dim transition-colors hover:border-border hover:bg-surface-3 hover:text-text"
            onClick={onClose}
            aria-label="닫기"
          >
            <X size={16} />
          </button>
        </div>

        {step === "choose" ? (
          <div className="space-y-4 px-5 py-5">
            <div className="rounded-xl border border-border bg-surface-2/70 px-4 py-3">
              <p className="text-[13px] leading-relaxed text-text-secondary">
                부트캠프 운영에서는 수강생을 하나씩 추가하기보다, 먼저 외부
                파일을 가져와 스페이스를 만드는 흐름이 더 자연스럽습니다.
              </p>
            </div>

            <div className="grid gap-3">
              <button
                type="button"
                className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface-2/80 px-4 py-4 text-left transition-colors hover:border-border-light hover:bg-surface-3"
                onClick={() => setStep("blank")}
              >
                <FolderPlus size={18} className="mt-0.5 shrink-0 text-text" />
                <div>
                  <div className="text-sm font-semibold text-text">
                    빈 스페이스 만들기
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                    수강생 없이 먼저 공간만 만들고, 이후 상단의 수강생 추가나
                    설정에서 직접 채웁니다.
                  </p>
                </div>
              </button>

              <button
                type="button"
                className="flex w-full items-start gap-3 rounded-xl border border-accent-border bg-accent-dim/60 px-4 py-4 text-left transition-colors hover:border-accent hover:bg-accent-dim"
                onClick={() => setStep("import")}
              >
                <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-text">
                      AI로 파일 가져와 스페이스 만들기
                    </span>
                    <span className="rounded-full border border-accent-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-accent">
                      권장
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                    Google Drive, OneDrive, 내 컴퓨터의 엑셀/CSV를 분석해
                    스페이스와 수강생 초안을 함께 만듭니다.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-text-dim">
                    <span className="rounded-full border border-border px-2 py-0.5">
                      Google Drive
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5">
                      OneDrive
                    </span>
                    <span className="rounded-full border border-border px-2 py-0.5">
                      내 컴퓨터
                    </span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 px-5 py-5">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 text-[13px] text-text-dim transition-colors hover:text-text"
              onClick={() => setStep("choose")}
            >
              <ArrowLeft size={14} />
              방식 다시 선택
            </button>

            <div className="rounded-xl border border-border bg-surface-2/70 px-4 py-3">
              <p className="text-[13px] leading-relaxed text-text-secondary">
                빈 스페이스는 나중에 직접 구성할 때 적합합니다. 빠르게 이름만
                만들고, 상세 구성은 스페이스 설정에서 이어갈 수 있습니다.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-[12px] font-medium text-text-secondary">
                스페이스 이름
              </label>
              <input
                className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
                placeholder="예: 백엔드 부트캠프 7기"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoFocus
              />
              <p className="text-[12px] leading-relaxed text-text-dim">
                이름만 먼저 만들고, 필요한 탭/필드는 스페이스 설정에서 바로
                조정할 수 있습니다.
              </p>
            </div>

            {error ? (
              <div className="rounded-xl border border-red/20 bg-red/10 px-4 py-3 text-[13px] text-red">
                {error}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <button
                type="button"
                className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text"
                onClick={onClose}
              >
                취소
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleCreateBlankSpace()}
                disabled={saving || !name.trim()}
              >
                <FileUp size={14} />
                {saving ? "만드는 중..." : "빈 스페이스 만들기"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
