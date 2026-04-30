"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type TouchEvent,
} from "react";
import type { CardDeckItemDto } from "@yeon/api-contract/card-decks";

import { useDeleteCard, useUpdateCard } from "../hooks";

const PREVIEW_MAX_LENGTH = 96;

interface CardRowProps {
  deckId: string;
  item: CardDeckItemDto;
  index?: number;
  isSelected?: boolean;
  onRequestEdit?: () => void;
  onDeleted?: () => void;
}

function toPreviewText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= PREVIEW_MAX_LENGTH) {
    return normalized;
  }
  return `${normalized.slice(0, PREVIEW_MAX_LENGTH).trimEnd()}...`;
}

export function CardRow({
  deckId,
  item,
  index,
  isSelected = false,
  onRequestEdit,
  onDeleted,
}: CardRowProps) {
  const [isEditing, setEditing] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [isActionMenuOpen, setActionMenuOpen] = useState(false);
  const [isDeleteRevealed, setDeleteRevealed] = useState(false);
  const [frontText, setFrontText] = useState(item.frontText);
  const [backText, setBackText] = useState(item.backText);
  const [isDeleteConfirming, setDeleteConfirming] = useState(false);
  const touchStartXRef = useRef<number | null>(null);
  const shouldIgnoreNextClickRef = useRef(false);
  const updateMutation = useUpdateCard(deckId);
  const deleteMutation = useDeleteCard(deckId);
  const isSaving = updateMutation.isPending;
  const isDeleting = deleteMutation.isPending;
  const shouldUseExternalEditor = Boolean(onRequestEdit);

  const canSave =
    frontText.trim().length > 0 && backText.trim().length > 0 && !isSaving;

  useEffect(() => {
    if (isEditing) {
      return;
    }
    setFrontText(item.frontText);
    setBackText(item.backText);
  }, [isEditing, item.backText, item.frontText]);

  const openEditor = () => {
    setFrontText(item.frontText);
    setBackText(item.backText);
    setActionMenuOpen(false);
    setDeleteRevealed(false);
    setDeleteConfirming(false);
    if (shouldUseExternalEditor) {
      onRequestEdit?.();
      return;
    }
    setEditing(true);
  };

  const handleCardClick = () => {
    if (shouldIgnoreNextClickRef.current) {
      shouldIgnoreNextClickRef.current = false;
      return;
    }

    if (isDeleteRevealed) {
      setActionMenuOpen(false);
      setDeleteRevealed(false);
      setDeleteConfirming(false);
      return;
    }
    openEditor();
  };

  const handleViewKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    handleCardClick();
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    touchStartXRef.current = null;

    if (startX === null) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? startX;
    const deltaX = endX - startX;

    if (deltaX < -48) {
      shouldIgnoreNextClickRef.current = true;
      setActionMenuOpen(false);
      setDeleteRevealed(true);
      setDeleteConfirming(false);
      return;
    }

    if (deltaX > 32) {
      shouldIgnoreNextClickRef.current = true;
      setDeleteRevealed(false);
      setDeleteConfirming(false);
    }
  };

  const handleSave = () => {
    if (!canSave) return;
    updateMutation.mutate(
      {
        itemId: item.id,
        body: {
          frontText: frontText.trim(),
          backText: backText.trim(),
        },
      },
      {
        onSuccess: () => {
          setEditing(false);
        },
      },
    );
  };

  const handleCancel = () => {
    setFrontText(item.frontText);
    setBackText(item.backText);
    setActionMenuOpen(false);
    setDeleteRevealed(false);
    setDeleteConfirming(false);
    setEditing(false);
  };

  const handleDelete = () => {
    if (!isDeleteConfirming) {
      setActionMenuOpen(true);
      setDeleteConfirming(true);
      return;
    }

    deleteMutation.mutate(item.id, {
      onSuccess: () => {
        setActionMenuOpen(false);
        setDeleteConfirming(false);
        setDeleteRevealed(false);
        onDeleted?.();
      },
    });
  };

  if (isEditing && !shouldUseExternalEditor) {
    return (
      <div className="rounded-xl border border-[#111] p-4">
        <div className="flex flex-col gap-3 md:flex-row">
          <textarea
            value={frontText}
            onChange={(e) => setFrontText(e.target.value)}
            maxLength={2000}
            rows={3}
            className="flex-1 resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#111]"
          />
          <textarea
            value={backText}
            onChange={(e) => setBackText(e.target.value)}
            maxLength={2000}
            rows={3}
            className="flex-1 resize-none rounded-lg border border-[#e5e5e5] px-3 py-2 text-[14px] text-[#111] outline-none focus:border-[#111]"
          />
        </div>
        {updateMutation.error ? (
          <p className="mt-2 text-[13px] text-red-600">
            {updateMutation.error.message}
          </p>
        ) : null}
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleCancel}
            className="rounded-xl border border-[#e5e5e5] px-3 py-1.5 text-[13px] text-[#111] hover:bg-[#fafafa]"
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-xl bg-[#111] px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`group relative overflow-hidden rounded-xl border bg-white transition-colors hover:border-[#111] ${
        isSelected ? "border-[#111]" : "border-[#e5e5e5]"
      }`}
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="카드를 클릭해 편집"
        onClick={handleCardClick}
        onKeyDown={handleViewKeyDown}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`grid cursor-pointer grid-cols-[48px_minmax(0,1fr)_64px] items-stretch outline-none transition-transform duration-200 focus-visible:ring-2 focus-visible:ring-[#111] md:grid-cols-[56px_minmax(0,1fr)_64px] ${
          isDeleteRevealed ? "-translate-x-24" : "translate-x-0"
        }`}
      >
        <div className="flex items-center justify-center border-r border-[#e5e5e5] text-[15px] font-semibold text-[#555]">
          {index ?? "-"}
        </div>

        <div className="min-w-0 px-4 py-3">
          <div className="grid min-w-0 gap-2 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] md:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 rounded-md border border-[#e5e5e5] bg-[#fafafa] px-2 py-1 text-[12px] font-medium text-[#666]">
                질문
              </span>
              <p className="truncate text-[16px] font-medium leading-7 text-[#111] md:text-[14px] md:leading-6">
                {toPreviewText(item.frontText)}
              </p>
            </div>
            <div className="flex min-w-0 items-center gap-3">
              <span className="shrink-0 rounded-md border border-[#e5e5e5] bg-[#fafafa] px-2 py-1 text-[12px] font-medium text-[#666]">
                답변
              </span>
              <p className="truncate text-[15px] leading-7 text-[#555] md:text-[14px] md:leading-6 md:text-[#333]">
                {toPreviewText(item.backText)}
              </p>
            </div>
          </div>

          {isExpanded ? (
            <div className="mt-3 rounded-lg bg-[#fafafa] p-3 text-[13px] leading-6 text-[#111]">
              <p className="whitespace-pre-wrap break-keep font-medium">
                {item.frontText}
              </p>
              <div className="my-3 border-t border-[#e5e5e5]" />
              <p className="whitespace-pre-wrap break-keep text-[#333]">
                {item.backText}
              </p>
            </div>
          ) : null}

          {deleteMutation.error ? (
            <p className="mt-2 text-[13px] text-red-600">
              {deleteMutation.error.message}
            </p>
          ) : null}
          {isDeleteRevealed ? (
            <p className="mt-2 text-right text-[12px] text-[#999] md:hidden">
              삭제하려면 오른쪽의 삭제 버튼을 한 번 더 누르세요.
            </p>
          ) : null}

          {isActionMenuOpen ? (
            <div className="mt-3 flex justify-end gap-2 text-[13px]">
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setActionMenuOpen(false);
                  openEditor();
                }}
                className="rounded-lg border border-[#e5e5e5] px-3 py-1.5 text-[#111] hover:border-[#111] hover:bg-[#fafafa]"
              >
                편집
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  handleDelete();
                }}
                disabled={isDeleting}
                className="rounded-lg border border-red-100 px-3 py-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
              >
                {isDeleting
                  ? "삭제 중"
                  : isDeleteConfirming
                    ? "삭제 확인"
                    : "삭제"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-center gap-1 pr-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((prev) => !prev);
              setActionMenuOpen(false);
              setDeleteRevealed(false);
              setDeleteConfirming(false);
            }}
            className="hidden h-8 w-8 items-center justify-center rounded-lg text-[18px] text-[#666] hover:bg-[#fafafa] hover:text-[#111] md:flex"
            aria-label={isExpanded ? "카드 접기" : "카드 펼치기"}
          >
            {isExpanded ? "⌃" : "⌄"}
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setActionMenuOpen((prev) => !prev);
              setDeleteRevealed(false);
            }}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[18px] text-[#666] hover:bg-[#fafafa] hover:text-[#111]"
            aria-label="카드 작업 더보기"
          >
            ⋮
          </button>
        </div>
      </div>

      <div
        className={`absolute inset-y-0 right-0 flex w-24 items-center justify-center bg-red-50 transition-transform duration-200 ${
          isDeleteRevealed ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            handleDelete();
          }}
          disabled={isDeleting}
          className="h-full w-full text-[13px] font-semibold text-red-600 disabled:opacity-50"
        >
          {isDeleting ? "삭제 중" : isDeleteConfirming ? "확인" : "삭제"}
        </button>
      </div>
    </div>
  );
}
