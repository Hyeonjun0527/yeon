"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type TypingLocale = "ko" | "en";

export type TypingSettings = {
  locale: TypingLocale;
};

const STORAGE_KEY = "yeon:typing-settings";
const DEFAULT_SETTINGS: TypingSettings = { locale: "ko" };

export function getSpeedUnit(locale: TypingLocale) {
  return locale === "ko" ? "타" : "wpm";
}

type TranslationKey =
  | "appName"
  | "joinRace"
  | "restart"
  | "result"
  | "accuracy"
  | "seconds"
  | "typeHere"
  | "startingIn"
  | "settings"
  | "speedUnit"
  | "nicknamePlaceholder"
  | "characterCamel"
  | "typingInputLabel"
  | "connectingToServer"
  | "offlineFallback"
  | "reconnect"
  | "roundFlowFocus";

const TRANSLATIONS: Record<TypingLocale, Record<TranslationKey, string>> = {
  ko: {
    appName: "타자연습",
    joinRace: "레이스 입장",
    restart: "다시 레이스",
    result: "결과",
    accuracy: "정확도",
    seconds: "s",
    typeHere: "여기에 입력하세요",
    startingIn: "초 후 시작...",
    settings: "설정",
    speedUnit: "속도 단위",
    nicknamePlaceholder: "Guest",
    characterCamel: "낙타",
    typingInputLabel: "타자 입력 영역",
    connectingToServer: "레이스 서버에 연결 중...",
    offlineFallback: "멀티플레이 서버에 연결할 수 없어 솔로 모드로 진행합니다.",
    reconnect: "재연결",
    roundFlowFocus: "몰입 플로우",
  },
  en: {
    appName: "Typing Race",
    joinRace: "Join Race",
    restart: "Restart",
    result: "Result",
    accuracy: "accuracy",
    seconds: "s",
    typeHere: "Type here",
    startingIn: "s to start...",
    settings: "Settings",
    speedUnit: "Speed unit",
    nicknamePlaceholder: "Guest",
    characterCamel: "Camel",
    typingInputLabel: "Typing input",
    connectingToServer: "Connecting to race server...",
    offlineFallback: "Cannot reach multiplayer server. Playing in solo mode.",
    reconnect: "Reconnect",
    roundFlowFocus: "Flow Focus",
  },
};

export function createTranslator(locale: TypingLocale) {
  return (key: TranslationKey) => TRANSLATIONS[locale][key];
}

type TypingSettingsStore = {
  settings: TypingSettings;
  updateSettings: (updates: Partial<TypingSettings>) => void;
};

const useTypingSettingsStore = create<TypingSettingsStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (updates) =>
        set((state) => ({ settings: { ...state.settings, ...updates } })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ settings: state.settings }),
    },
  ),
);

export function useTypingSettings() {
  const settings = useTypingSettingsStore((s) => s.settings);
  const updateSettings = useTypingSettingsStore((s) => s.updateSettings);

  // SSR/CSR hydration mismatch 방지: persist rehydrate 완료 시점을 노출
  const [loaded, setLoaded] = useState(
    () => useTypingSettingsStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (loaded) return;
    const unsub = useTypingSettingsStore.persist.onFinishHydration(() => setLoaded(true));
    if (useTypingSettingsStore.persist.hasHydrated()) setLoaded(true);
    return unsub;
  }, [loaded]);

  return { settings, updateSettings, loaded };
}
