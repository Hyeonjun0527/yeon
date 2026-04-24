"use client";

import { useEffect, useState } from "react";

import { GuestStoreMergeContractError } from "@/lib/guest-card-service-store";

import { useMergeGuestDecks } from "../hooks/use-merge-guest";

type MergeDialogViewState =
  | { kind: "confirm" }
  | { kind: "merging" }
  | { kind: "success"; createdDeckCount: number; createdItemCount: number }
  | { kind: "error"; message: string };

type MergeGuestDialogProps = {
  guestDeckCount: number;
  onClose: () => void;
};

export function MergeGuestDialog({
  guestDeckCount,
  onClose,
}: MergeGuestDialogProps) {
  const [state, setState] = useState<MergeDialogViewState>({ kind: "confirm" });
  const mutation = useMergeGuestDecks();

  const isBusy = state.kind === "merging";

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isBusy) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [isBusy, onClose]);

  async function handleAccept() {
    setState({ kind: "merging" });
    try {
      const result = await mutation.mutateAsync();
      setState({
        kind: "success",
        createdDeckCount: result.createdDeckCount,
        createdItemCount: result.createdItemCount,
      });
    } catch (error) {
      const message =
        error instanceof GuestStoreMergeContractError
          ? error.message
          : error instanceof Error
            ? error.message
            : "덱 이관에 실패했습니다. 다시 시도해 주세요.";
      setState({ kind: "error", message });
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="merge-guest-dialog-title"
      className="fixed inset-0 z-30 flex items-center justify-center bg-[rgba(8,10,14,0.6)] p-6"
    >
      <div className="w-full max-w-[440px] rounded-[24px] border border-[rgba(17,19,24,0.08)] bg-white p-6 text-[#111318] shadow-[0_28px_80px_rgba(15,18,24,0.18)]">
        {state.kind === "success" ? (
          <div className="grid gap-4">
            <h2
              id="merge-guest-dialog-title"
              className="m-0 text-[20px] font-black tracking-[-0.02em]"
            >
              계정에 덱을 추가했어요
            </h2>
            <p className="m-0 text-[14px] leading-[1.6] text-[#4b5563]">
              덱 {state.createdDeckCount}개 · 카드 {state.createdItemCount}장을
              계정으로 이관했습니다. 이제 다른 기기에서도 같은 덱으로 공부할
              수 있어요.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="min-h-12 rounded-[14px] bg-[#111318] px-4 text-[14px] font-bold text-white transition-transform duration-200 hover:-translate-y-px"
            >
              확인
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            <h2
              id="merge-guest-dialog-title"
              className="m-0 text-[20px] font-black tracking-[-0.02em]"
            >
              방금 만든 덱 {guestDeckCount}개를 계정에 추가할까요?
            </h2>
            <p className="m-0 text-[14px] leading-[1.6] text-[#4b5563]">
              로그인 전에 만들어 둔 덱을 계정으로 가져옵니다. 이관한 뒤에는 이
              기기에서만 보이던 덱이 다른 기기에서도 보이게 됩니다.
            </p>

            {state.kind === "error" ? (
              <p
                role="alert"
                className="m-0 rounded-[12px] border border-[rgba(232,99,10,0.24)] bg-[rgba(232,99,10,0.08)] px-3 py-2 text-[13px] leading-[1.55] text-[#a3430a]"
              >
                {state.message}
              </p>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isBusy}
                className="min-h-12 rounded-[14px] border border-[rgba(17,19,24,0.12)] bg-white px-4 text-[14px] font-bold text-[#111318] transition-[transform,background-color] duration-200 hover:enabled:-translate-y-px hover:enabled:bg-[rgba(17,19,24,0.04)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                나중에
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleAccept();
                }}
                disabled={isBusy}
                autoFocus
                className="min-h-12 rounded-[14px] bg-[#e8630a] px-5 text-[14px] font-bold text-white transition-transform duration-200 hover:enabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isBusy ? "이관 중..." : "계정에 추가"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
