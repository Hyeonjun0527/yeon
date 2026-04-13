"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Download,
  FileClock,
  FileUp,
  FolderPlus,
  Sparkles,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";

import {
  CloudImportInline,
  type CloudImportEntryControls,
} from "@/features/cloud-import/components/cloud-import-inline";
import {
  SPACE_FULL_TEST_DATA,
  SPACE_LITE_TEST_DATA,
} from "@/lib/test-data-downloads";
import { getSpacePeriodInputError } from "@/lib/space-period";

import {
  SPACE_CREATE_CHOICES,
  type SpaceCreateChoiceStep,
} from "./space-create-choice-options";

import type { Space } from "../types";
import type { ImportCommitResult } from "@/features/cloud-import/types";

export type StudentSpaceCreateStep = "choose" | SpaceCreateChoiceStep;

const SPACE_CREATE_CHOICE_ICON_BY_STEP: Record<
  SpaceCreateChoiceStep,
  LucideIcon
> = {
  blank: FolderPlus,
  import: Sparkles,
};

interface StudentSpaceCreateModalProps {
  onClose: () => void;
  onCreated: (space: Space) => void;
  onImported: (result: ImportCommitResult) => void;
  onDraftDiscarded?: () => void;
  initialStep?: StudentSpaceCreateStep;
  initialLocalDraftId?: string | null;
  onRouteStateChange?: (state: {
    step: StudentSpaceCreateStep;
    draftId: string | null;
  }) => void;
}

export function StudentSpaceCreateModal({
  onClose,
  onCreated,
  onImported,
  onDraftDiscarded,
  initialStep = "choose",
  initialLocalDraftId = null,
  onRouteStateChange,
}: StudentSpaceCreateModalProps) {
  const [step, setStep] = useState<StudentSpaceCreateStep>(initialStep);
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importControls, setImportControls] =
    useState<CloudImportEntryControls | null>(null);
  const [isImportWorkspaceMode, setIsImportWorkspaceMode] = useState(false);

  useEffect(() => {
    setStep(initialStep);
  }, [initialStep]);

  useEffect(() => {
    onRouteStateChange?.({ step, draftId: initialLocalDraftId ?? null });
  }, [initialLocalDraftId, onRouteStateChange, step]);

  async function handleCreateBlankSpace() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("스페이스 이름을 입력해 주세요.");
      return;
    }

    const periodError = getSpacePeriodInputError(
      startDate || null,
      endDate || null,
    );
    if (periodError) {
      setError(periodError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/v1/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
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
          <div
            className={`border-b border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0))] px-5 ${isImportWorkspaceMode ? "py-4" : "py-5"}`}
          >
            <div
              className={`flex gap-4 ${isImportWorkspaceMode ? "items-center justify-between" : "items-start justify-between"}`}
            >
              <div className="min-w-0">
                <span className="inline-flex items-center rounded-full border border-accent-border bg-accent-dim/65 px-2.5 py-1 text-[11px] font-semibold tracking-[0.06em] text-accent">
                  AI 가져오기
                </span>

                {!isImportWorkspaceMode ? (
                  <>
                    <h2 className="mt-3 text-[21px] font-semibold tracking-[-0.03em] text-text">
                      AI로 스페이스 초안 만들기
                    </h2>
                    <p className="mt-1.5 max-w-[560px] text-[13px] leading-relaxed text-text-secondary">
                      저장된 초안을 이어보거나 새 파일을 불러와 스페이스 구조를
                      바로 검토할 수 있습니다.
                    </p>
                  </>
                ) : null}
              </div>

              <button
                type="button"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-surface-2/80 text-text-dim transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text"
                onClick={onClose}
                aria-label="닫기"
              >
                <X size={16} />
              </button>
            </div>

            {!isImportWorkspaceMode ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-2 text-[11px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text disabled:cursor-default disabled:opacity-50"
                  onClick={() => importControls?.openSavedDrafts()}
                  disabled={!importControls}
                >
                  <FileClock size={12} />
                  저장 작업
                  {importControls && importControls.localDraftCount > 0 ? (
                    <span className="rounded-full border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-secondary">
                      {importControls.localDraftCount}
                    </span>
                  ) : null}
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-accent-border bg-accent px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-default disabled:opacity-50"
                  onClick={() => importControls?.openFilePicker()}
                  disabled={!importControls}
                >
                  <Upload size={13} />내 컴퓨터에서 파일 선택
                </button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <a
                    href={SPACE_LITE_TEST_DATA.href}
                    download={SPACE_LITE_TEST_DATA.downloadName}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3.5 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text"
                  >
                    <Download size={13} />
                    {SPACE_LITE_TEST_DATA.label}
                  </a>
                  <a
                    href={SPACE_FULL_TEST_DATA.href}
                    download={SPACE_FULL_TEST_DATA.downloadName}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3.5 py-2 text-[12px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-3 hover:text-text"
                  >
                    <Download size={13} />
                    {SPACE_FULL_TEST_DATA.label}
                  </a>
                </div>
              </div>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <CloudImportInline
              expanded
              hideEntryHeader
              initialLocalDraftId={initialLocalDraftId}
              onDraftIdChange={(draftId) => {
                onRouteStateChange?.({ step: "import", draftId });
              }}
              onEntryControlsChange={setImportControls}
              onWorkspaceModeChange={setIsImportWorkspaceMode}
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
              {SPACE_CREATE_CHOICES.map((choice) => {
                const Icon = SPACE_CREATE_CHOICE_ICON_BY_STEP[choice.step];
                const isRecommended = choice.tone === "recommended";

                return (
                  <button
                    key={choice.step}
                    type="button"
                    className={
                      isRecommended
                        ? "flex w-full items-start gap-3 rounded-xl border border-accent-border bg-accent-dim/60 px-4 py-4 text-left transition-colors hover:border-accent hover:bg-accent-dim"
                        : "flex w-full items-start gap-3 rounded-xl border border-border bg-surface-2/80 px-4 py-4 text-left transition-colors hover:border-border-light hover:bg-surface-3"
                    }
                    onClick={() => setStep(choice.step)}
                  >
                    <Icon
                      size={18}
                      className={
                        isRecommended
                          ? "mt-0.5 shrink-0 text-accent"
                          : "mt-0.5 shrink-0 text-text"
                      }
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-text">
                          {choice.title}
                        </span>
                        {choice.badgeLabel ? (
                          <span className="rounded-full border border-accent-border bg-surface px-2 py-0.5 text-[10px] font-semibold text-accent">
                            {choice.badgeLabel}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
                        {choice.description}
                      </p>
                      {choice.chips?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-text-dim">
                          {choice.chips.map((chip) => (
                            <span
                              key={chip}
                              className="rounded-full border border-border px-2 py-0.5"
                            >
                              {chip}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
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

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-[12px] font-medium text-text-secondary">
                  진행기간
                </label>
                <span className="text-[11px] text-text-dim">
                  나중엔 시작일 고정, 종료일 연장만 허용
                </span>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  type="date"
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent-border"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  aria-label="스페이스 시작일"
                />
                <input
                  type="date"
                  className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors focus:border-accent-border"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                  aria-label="스페이스 종료일"
                />
              </div>
              <p className="text-[12px] leading-relaxed text-text-dim">
                학생별 출석·과제 잔디와 운영 기간은 이 진행기간을 기준으로
                맞춰집니다.
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
