"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { CARD_BULK_IMPORT_MAX_ITEMS } from "@yeon/api-contract/card-decks";

import { useAddCards } from "../hooks";
import { parseBulkCardImportInput } from "../utils/bulk-card-import-parser";
import {
  BULK_CARD_HELP_VISIBILITY_EVENT,
  setBulkCardHelpVisible,
  shouldShowBulkCardHelp,
} from "../utils/bulk-card-help-preference";

const BULK_CARD_TEMPLATE = `[[Q]]
문제
[[A]]
정답
[[CARD]]
[[Q]]
문제
[[A]]
정답`;

interface BulkAddCardsFormProps {
  deckId: string;
}

export function BulkAddCardsForm({ deckId }: BulkAddCardsFormProps) {
  const [rawText, setRawText] = useState("");
  const [isHelpVisible, setHelpVisible] = useState(true);
  const { mutate, isPending, error } = useAddCards(deckId);
  const parseResult = useMemo(
    () => parseBulkCardImportInput(rawText),
    [rawText],
  );
  const canSubmit =
    parseResult.cards.length > 0 &&
    parseResult.errors.length === 0 &&
    !isPending;
  const previewCards = parseResult.cards.slice(0, 5);
  const hiddenPreviewCount = Math.max(
    parseResult.cards.length - previewCards.length,
    0,
  );

  useEffect(() => {
    setHelpVisible(shouldShowBulkCardHelp());

    function handlePreferenceChange(event: Event) {
      const customEvent = event as CustomEvent<{ isVisible: boolean }>;
      setHelpVisible(customEvent.detail?.isVisible ?? shouldShowBulkCardHelp());
    }

    window.addEventListener(
      BULK_CARD_HELP_VISIBILITY_EVENT,
      handlePreferenceChange,
    );
    return () => {
      window.removeEventListener(
        BULK_CARD_HELP_VISIBILITY_EVENT,
        handlePreferenceChange,
      );
    };
  }, []);

  function handleDismissHelp() {
    setHelpVisible(false);
    setBulkCardHelpVisible(false);
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    mutate(
      { items: parseResult.cards },
      {
        onSuccess: () => {
          setRawText("");
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {isHelpVisible ? (
        <div className="relative rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-4 pr-12 text-[13px] text-[#555]">
          <button
            aria-label="AI 형식 도움말 숨기기"
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full border border-[#e5e5e5] bg-white text-[15px] font-semibold text-[#666] transition-colors hover:border-[#111] hover:text-[#111]"
            onClick={handleDismissHelp}
            type="button"
          >
            ×
          </button>
          <p className="font-semibold text-[#111]">
            AI에게 이렇게 만들어달라고 요청하세요.
          </p>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-[12px] leading-5 text-[#333]">
            {BULK_CARD_TEMPLATE}
          </pre>
          <p className="mt-3">
            마커는 한 줄 전체가 <code>[[Q]]</code>, <code>[[A]]</code>,{" "}
            <code>[[CARD]]</code>일 때만 인식합니다. 문제/정답 안의 일반
            대괄호는 그대로 저장됩니다.
          </p>
        </div>
      ) : null}

      <label className="flex flex-col gap-2">
        <span className="text-[13px] text-[#666]">AI 형식 붙여넣기</span>
        <textarea
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          rows={12}
          placeholder={BULK_CARD_TEMPLATE}
          className="resize-y rounded-lg border border-[#e5e5e5] px-3 py-2 font-mono text-[13px] leading-5 text-[#111] outline-none focus:border-[#111]"
        />
      </label>

      <div className="flex flex-col gap-2 text-[13px]">
        <p className="text-[#666]">
          인식된 카드:{" "}
          <strong className="text-[#111]">{parseResult.cards.length}</strong>장
          / 최대 {CARD_BULK_IMPORT_MAX_ITEMS}장
        </p>
        {parseResult.errors.length > 0 ? (
          <ul className="flex flex-col gap-1 rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
            {parseResult.errors.map((message) => (
              <li key={message}>• {message}</li>
            ))}
          </ul>
        ) : null}
        {parseResult.warnings.length > 0 ? (
          <ul className="flex flex-col gap-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-700">
            {parseResult.warnings.map((message) => (
              <li key={message}>• {message}</li>
            ))}
          </ul>
        ) : null}
        {error ? <p className="text-red-600">{error.message}</p> : null}
      </div>

      {previewCards.length > 0 ? (
        <div className="rounded-xl border border-[#e5e5e5] p-4">
          <h4 className="text-[14px] font-semibold text-[#111]">미리보기</h4>
          <ul className="mt-3 flex flex-col gap-3">
            {previewCards.map((card, index) => (
              <li
                key={`${card.frontText}-${index}`}
                className="rounded-lg bg-[#fafafa] p-3 text-[13px]"
              >
                <p className="font-semibold text-[#111]">{index + 1}. 앞면</p>
                <p className="mt-1 whitespace-pre-wrap text-[#555]">
                  {card.frontText}
                </p>
                <p className="mt-3 font-semibold text-[#111]">뒷면</p>
                <p className="mt-1 whitespace-pre-wrap text-[#555]">
                  {card.backText}
                </p>
              </li>
            ))}
          </ul>
          {hiddenPreviewCount > 0 ? (
            <p className="mt-3 text-[13px] text-[#888]">
              외 {hiddenPreviewCount}장은 추가 시 함께 저장됩니다.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-xl bg-[#111] px-4 py-2 text-[14px] font-semibold text-white transition-colors hover:bg-[#333] disabled:opacity-50"
        >
          {isPending ? "추가 중..." : `${parseResult.cards.length || 0}장 추가`}
        </button>
      </div>
    </form>
  );
}
