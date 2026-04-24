"use client";

import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { createTranslator, type TypingLocale, useTypingSettings } from "./use-typing-settings";

const LOCALE_OPTIONS: { value: TypingLocale; label: string; unit: string }[] = [
  { value: "ko", label: "한국어", unit: "타/분" },
  { value: "en", label: "English", unit: "wpm" },
];

export function TypingSettingsButton() {
  const { settings, updateSettings, loaded } = useTypingSettings();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = createTranslator(settings.locale);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!loaded) return null;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center rounded-lg border border-[#e5e5e5] p-2 text-[#888] transition-colors hover:border-[#aaa] hover:text-[#111]"
        aria-label={t("settings")}
      >
        <Settings size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-44 rounded-xl border border-[#e5e5e5] bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-[11px] font-medium text-[#aaa]">{t("speedUnit")}</p>
          {LOCALE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { updateSettings({ locale: opt.value }); setOpen(false); }}
              className={`flex w-full items-center justify-between px-3 py-2 text-[13px] transition-colors hover:bg-[#f5f5f5] ${
                settings.locale === opt.value ? "font-semibold text-[#111]" : "text-[#555]"
              }`}
            >
              <span>{opt.label}</span>
              <span className="font-mono text-[11px] text-[#aaa]">{opt.unit}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
