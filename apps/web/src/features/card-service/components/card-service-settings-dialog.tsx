"use client";

import { useEffect, useState } from "react";

import {
  setBulkCardHelpVisible,
  shouldShowBulkCardHelp,
} from "../utils/bulk-card-help-preference";

interface CardServiceSettingsDialogProps {
  onClose: () => void;
}

export function CardServiceSettingsDialog({
  onClose,
}: CardServiceSettingsDialogProps) {
  const [isBulkHelpVisible, setBulkHelpVisibleState] = useState(true);

  useEffect(() => {
    setBulkHelpVisibleState(shouldShowBulkCardHelp());
  }, []);

  function handleToggle(value: boolean) {
    setBulkHelpVisibleState(value);
    setBulkCardHelpVisible(value);
  }

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
      role="dialog"
    >
      <div
        className="w-full max-w-[420px] rounded-xl bg-white p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="text-[18px] font-semibold text-[#111]">카드 설정</h2>
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#e5e5e5] p-4">
          <input
            checked={isBulkHelpVisible}
            className="mt-1"
            onChange={(event) => handleToggle(event.target.checked)}
            type="checkbox"
          />
          <span>
            <span className="block text-[14px] font-semibold text-[#111]">
              AI 형식 붙여넣기 도움말 카드 보기
            </span>
            <span className="mt-1 block text-[13px] leading-5 text-[#666]">
              X 버튼으로 숨긴 도움말을 다시 보이게 합니다.
            </span>
          </span>
        </label>
        <div className="mt-5 flex justify-end">
          <button
            className="rounded-xl bg-[#111] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#333]"
            onClick={onClose}
            type="button"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
