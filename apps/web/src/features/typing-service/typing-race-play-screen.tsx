"use client";

import { useEffect, useState } from "react";
import { useTypingProfile } from "./use-typing-profile";
import { usePlayerIdentity } from "./use-player-identity";
import { useRaceRoom } from "./use-race-room";
import { TypingRaceMultiplayerScreen } from "./typing-race-multiplayer-screen";
import { TypingRaceSoloScreen } from "./typing-race-solo-screen";
import { createTranslator, useTypingSettings } from "./use-typing-settings";

const CONNECTION_TIMEOUT_MS = 4000;

export function TypingRacePlayScreen() {
  const { profile, loaded: profileLoaded } = useTypingProfile();
  const { settings } = useTypingSettings();
  const t = createTranslator(settings.locale);
  const playerId = usePlayerIdentity();
  const [fallbackToSolo, setFallbackToSolo] = useState(false);

  const race = useRaceRoom({
    enabled: profileLoaded && !!playerId && !fallbackToSolo,
    playerLabel: profile.nickname,
    playerId,
    locale: settings.locale,
  });

  // 연결 실패 시 솔로 모드로 fallback
  useEffect(() => {
    if (race.connectionState === "connected" || race.connectionState === "idle") return;
    if (race.connectionState === "error" || race.connectionState === "disconnected") {
      setFallbackToSolo(true);
      return;
    }
    if (race.connectionState === "connecting") {
      const timeout = window.setTimeout(() => {
        setFallbackToSolo(true);
      }, CONNECTION_TIMEOUT_MS);
      return () => window.clearTimeout(timeout);
    }
  }, [race.connectionState]);

  const retryMultiplayer = () => {
    setFallbackToSolo(false);
    race.rejoin();
  };

  if (fallbackToSolo) {
    return (
      <TypingRaceSoloScreen
        offlineReason={t("offlineFallback")}
        retryLabel={t("reconnect")}
        onRetryMultiplayer={retryMultiplayer}
      />
    );
  }

  if (race.connectionState !== "connected" || !race.prompt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-[#111]">
        <div className="flex flex-col items-center gap-3 font-mono text-[13px] text-[#888]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e5e5e5] border-t-[#111]" />
          <span>{t("connectingToServer")}</span>
        </div>
      </div>
    );
  }

  return <TypingRaceMultiplayerScreen race={race} />;
}
