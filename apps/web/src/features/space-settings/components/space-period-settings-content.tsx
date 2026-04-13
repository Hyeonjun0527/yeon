"use client";

import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import {
  formatSpacePeriodLabel,
  getSpacePeriodInputError,
} from "@/lib/space-period";
import { patchSpace } from "../space-settings-api";

interface SpacePeriodSettingsContentProps {
  spaceId: string;
  spaceName?: string;
  spaceStartDate?: string | null;
  spaceEndDate?: string | null;
  onBack: () => void;
  onClose: () => void;
  onSpaceUpdated?: () => void;
}

export function SpacePeriodSettingsContent({
  spaceId,
  spaceName,
  spaceStartDate = null,
  spaceEndDate = null,
  onBack,
  onClose,
  onSpaceUpdated,
}: SpacePeriodSettingsContentProps) {
  const [periodStartDate, setPeriodStartDate] = useState(spaceStartDate ?? "");
  const [periodEndDate, setPeriodEndDate] = useState(spaceEndDate ?? "");
  const [savedPeriodStartDate, setSavedPeriodStartDate] = useState(
    spaceStartDate ?? "",
  );
  const [savedPeriodEndDate, setSavedPeriodEndDate] = useState(
    spaceEndDate ?? "",
  );
  const [savingPeriod, setSavingPeriod] = useState(false);
  const [periodError, setPeriodError] = useState<string | null>(null);

  useEffect(() => {
    setPeriodStartDate(spaceStartDate ?? "");
    setPeriodEndDate(spaceEndDate ?? "");
    setSavedPeriodStartDate(spaceStartDate ?? "");
    setSavedPeriodEndDate(spaceEndDate ?? "");
    setPeriodError(null);
  }, [spaceEndDate, spaceStartDate]);

  const periodInputError = getSpacePeriodInputError(
    periodStartDate || null,
    periodEndDate || null,
  );
  const nextPeriodError =
    savedPeriodStartDate && !periodEndDate
      ? "진행 종료일은 비울 수 없습니다."
      : savedPeriodStartDate &&
          savedPeriodEndDate &&
          periodEndDate &&
          periodEndDate < savedPeriodEndDate
        ? "진행 종료일은 앞당길 수 없습니다."
        : periodInputError;
  const periodDirty =
    periodStartDate !== savedPeriodStartDate ||
    periodEndDate !== savedPeriodEndDate;
  const spacePeriodLabel = formatSpacePeriodLabel(
    savedPeriodStartDate || null,
    savedPeriodEndDate || null,
  );

  async function handleSavePeriod() {
    if (nextPeriodError) {
      setPeriodError(nextPeriodError);
      return;
    }

    setSavingPeriod(true);
    setPeriodError(null);

    try {
      await patchSpace(spaceId, {
        startDate: periodStartDate || null,
        endDate: periodEndDate || null,
      });
      setSavedPeriodStartDate(periodStartDate);
      setSavedPeriodEndDate(periodEndDate);
      onSpaceUpdated?.();
    } catch (saveError) {
      setPeriodError(
        saveError instanceof Error
          ? saveError.message
          : "진행기간을 저장하지 못했습니다.",
      );
    } finally {
      setSavingPeriod(false);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface-2 text-text-dim transition-colors hover:bg-surface-3 hover:text-text"
            onClick={onBack}
            aria-label="뒤로 가기"
          >
            <ArrowLeft size={15} />
          </button>
          <div>
            <h2 className="text-base font-semibold text-text">진행기간</h2>
            <p className="mt-0.5 text-xs text-text-dim">
              {spaceName ? `${spaceName} · ` : ""}
              출석·과제 잔디와 운영 기간의 기준입니다
            </p>
          </div>
        </div>

        <button
          className="flex h-7 w-7 items-center justify-center rounded-md border-none bg-transparent text-text-dim transition-colors hover:bg-surface-3 hover:text-text"
          onClick={onClose}
          aria-label="닫기"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-4 px-6 py-5">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-dim">
              현재 상태
            </p>
            <p className="mt-1 text-sm font-semibold text-text">
              {spacePeriodLabel ?? "미설정"}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim">
              시작일
            </span>
            <input
              type="date"
              className="rounded-md border border-border bg-surface-3 px-2 py-[9px] text-sm text-text outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              value={periodStartDate}
              onChange={(event) => setPeriodStartDate(event.target.value)}
              disabled={savingPeriod || Boolean(savedPeriodStartDate)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-text-dim">
              종료일
            </span>
            <input
              type="date"
              className="rounded-md border border-border bg-surface-3 px-2 py-[9px] text-sm text-text outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
              value={periodEndDate}
              onChange={(event) => setPeriodEndDate(event.target.value)}
              disabled={savingPeriod}
            />
          </label>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 px-4 py-3">
          <p className="m-0 text-[11px] leading-relaxed text-text-dim">
            {savedPeriodStartDate
              ? "진행 시작일은 고정되고, 진행 종료일만 뒤로 늘릴 수 있습니다."
              : "처음 저장할 때 시작일과 종료일을 함께 입력해야 합니다."}
          </p>
          {periodError ? (
            <p className="m-0 mt-1 text-[11px] leading-relaxed text-red">
              {periodError}
            </p>
          ) : nextPeriodError ? (
            <p className="m-0 mt-1 text-[11px] leading-relaxed text-red">
              {nextPeriodError}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-[9px] text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => void handleSavePeriod()}
            disabled={!periodDirty || savingPeriod}
          >
            {savingPeriod ? "저장 중…" : "진행기간 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
