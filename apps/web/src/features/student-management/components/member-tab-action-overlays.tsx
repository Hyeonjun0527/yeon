"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";

interface MemberTabActionTarget {
  id: string;
  name: string;
}

interface MemberTabContextMenuProps {
  x: number;
  y: number;
  onRename: () => void;
  onDelete: () => void;
}

interface MemberTabRenameModalProps {
  target: MemberTabActionTarget | null;
  isSubmitting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onSubmit: (payload: { name: string }) => void;
}

interface MemberTabDeleteModalProps {
  target: MemberTabActionTarget | null;
  isDeleting: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onDelete: () => void;
}

export function MemberTabContextMenu({
  x,
  y,
  onRename,
  onDelete,
}: MemberTabContextMenuProps) {
  return (
    <div
      data-member-tab-menu="true"
      className="fixed z-[340] min-w-[168px] overflow-hidden rounded-xl border border-border bg-surface shadow-[0_18px_48px_rgba(0,0,0,0.38)]"
      style={{ left: x, top: y }}
    >
      <button
        type="button"
        className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-4 hover:text-text"
        onClick={onRename}
      >
        <Pencil size={14} />
        이름 변경
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-2 text-left text-[12px] font-medium text-red transition-colors hover:bg-surface-4"
        onClick={onDelete}
      >
        <Trash2 size={14} />
        삭제
      </button>
    </div>
  );
}

export function MemberTabRenameModal({
  target,
  isSubmitting,
  errorMessage,
  onClose,
  onSubmit,
}: MemberTabRenameModalProps) {
  const [name, setName] = React.useState("");

  React.useEffect(() => {
    setName(target?.name ?? "");
  }, [target]);

  if (!target) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[330] flex items-center justify-center bg-[rgba(0,0,0,0.62)] p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
            탭 이름 변경
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
            탭 이름을 변경할까요?
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            수강생 상세 페이지에서 이 탭을 구분할 수 있는 이름으로 바꿔 주세요.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="space-y-2">
            <label className="block text-[12px] font-medium text-text-secondary">
              탭 이름
            </label>
            <input
              autoFocus
              className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="탭 이름을 입력해 주세요"
              maxLength={80}
            />
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red/20 bg-red/10 px-4 py-3 text-[13px] text-red">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text disabled:opacity-50"
            onClick={onClose}
            disabled={isSubmitting}
          >
            취소
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onSubmit({ name: name.trim() })}
            disabled={!name.trim() || isSubmitting}
          >
            {isSubmitting ? "변경 중..." : "변경하기"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MemberTabDeleteModal({
  target,
  isDeleting,
  errorMessage,
  onClose,
  onDelete,
}: MemberTabDeleteModalProps) {
  if (!target) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[330] flex items-center justify-center bg-[rgba(0,0,0,0.62)] p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget && !isDeleting) {
          onClose();
        }
      }}
    >
      <div className="flex w-full max-w-[460px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <div className="border-b border-border px-5 py-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
            탭 삭제
          </p>
          <h2 className="mt-1 text-[18px] font-semibold tracking-[-0.02em] text-text">
            정말 삭제할까요?
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-text-secondary">
            이 탭과 탭 안의 커스텀 필드가 현재 스페이스에서 함께 제거됩니다.
          </p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-border bg-surface-2/70 px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-text-dim">
              삭제할 탭
            </p>
            <p className="mt-1 text-sm font-semibold text-text">
              {target.name}
            </p>
          </div>

          {errorMessage ? (
            <div className="rounded-xl border border-red/20 bg-red/10 px-4 py-3 text-[13px] text-red">
              {errorMessage}
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <button
            type="button"
            className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text disabled:opacity-50"
            onClick={onClose}
            disabled={isDeleting}
          >
            취소
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg bg-red px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onDelete}
            disabled={isDeleting}
          >
            {isDeleting ? "삭제 중..." : "삭제하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
