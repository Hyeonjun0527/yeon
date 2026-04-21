"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Client, type Room } from "colyseus.js";
import {
  RACE_EVENTS,
  TYPING_RACE_DEFAULTS,
  TYPING_RACE_ROOM_NAME,
  TYPING_RACE_STAGE,
  type RaceFinishMessage,
  type RaceProgressMessage,
  type RaceSeedMessage,
  type TypingRaceSnapshot,
  type TypingRaceStage,
} from "@yeon/race-shared";

export type RaceConnectionState = "idle" | "connecting" | "connected" | "error" | "disconnected";

export type UseRaceRoomOptions = {
  enabled: boolean;
  playerLabel: string;
  playerId: string | null;
  locale: "ko" | "en";
};

export type UseRaceRoomResult = {
  connectionState: RaceConnectionState;
  snapshot: TypingRaceSnapshot | null;
  prompt: string | null;
  countdownRemaining: number;
  stage: TypingRaceStage;
  mySeat: string | null;
  sendProgress: (payload: RaceProgressMessage) => void;
  sendFinish: (payload: RaceFinishMessage) => void;
  rejoin: () => void;
};

const DEFAULT_SERVER_URL = "ws://localhost:2567";

function resolveServerUrl() {
  const envUrl = process.env.NEXT_PUBLIC_RACE_SERVER_URL;
  return envUrl && envUrl.length > 0 ? envUrl : DEFAULT_SERVER_URL;
}

export function useRaceRoom(options: UseRaceRoomOptions): UseRaceRoomResult {
  const { enabled, playerLabel, playerId, locale } = options;
  const [connectionState, setConnectionState] = useState<RaceConnectionState>("idle");
  const [snapshot, setSnapshot] = useState<TypingRaceSnapshot | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [mySeat, setMySeat] = useState<string | null>(null);
  const [rejoinToken, setRejoinToken] = useState(0);

  const roomRef = useRef<Room | null>(null);

  // playerLabel은 접속 시점의 값만 사용 (변경 시 재연결 방지)
  const playerLabelRef = useRef(playerLabel);
  useEffect(() => {
    playerLabelRef.current = playerLabel;
  }, [playerLabel]);

  useEffect(() => {
    if (!enabled || !playerId) return;

    let cancelled = false;
    setConnectionState("connecting");
    setSnapshot(null);
    setPrompt(null);
    setMySeat(null);

    const client = new Client(resolveServerUrl());

    client
      .joinOrCreate<unknown>(TYPING_RACE_ROOM_NAME, {
        playerLabel: playerLabelRef.current,
        playerId,
        locale,
      })
      .then((room) => {
        if (cancelled) {
          try { room.leave(); } catch { /* ignore */ }
          return;
        }

        roomRef.current = room;
        setMySeat(room.sessionId);
        setConnectionState("connected");

        room.onMessage(RACE_EVENTS.RACE_SEED, (message: RaceSeedMessage) => {
          setPrompt(message.prompt);
        });

        room.onMessage(RACE_EVENTS.RACE_STATE, (message: TypingRaceSnapshot) => {
          setSnapshot(message);
        });

        room.onLeave(() => {
          if (!cancelled) setConnectionState("disconnected");
        });

        room.onError((_code, _message) => {
          if (!cancelled) setConnectionState("error");
        });
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("[typing-race] 룸 접속 실패:", err);
          setConnectionState("error");
        }
      });

    return () => {
      cancelled = true;
      const room = roomRef.current;
      roomRef.current = null;
      if (room) {
        try { room.leave(); } catch { /* ignore */ }
      }
    };
  }, [enabled, playerId, locale, rejoinToken]);

  const sendProgress = useCallback((payload: RaceProgressMessage) => {
    roomRef.current?.send(RACE_EVENTS.RACE_PROGRESS, payload);
  }, []);

  const sendFinish = useCallback((payload: RaceFinishMessage) => {
    roomRef.current?.send(RACE_EVENTS.RACE_FINISH, payload);
  }, []);

  const rejoin = useCallback(() => {
    // connectionState를 즉시 "connecting"으로 리셋 (retry flip-back 방지)
    setConnectionState("connecting");
    setSnapshot(null);
    setPrompt(null);
    setMySeat(null);
    setRejoinToken((v) => v + 1);
  }, []);

  return useMemo<UseRaceRoomResult>(
    () => ({
      connectionState,
      snapshot,
      prompt,
      countdownRemaining: snapshot?.countdownRemaining ?? TYPING_RACE_DEFAULTS.countdownSeconds,
      stage: snapshot?.stage ?? TYPING_RACE_STAGE.COUNTDOWN,
      mySeat,
      sendProgress,
      sendFinish,
      rejoin,
    }),
    [connectionState, snapshot, prompt, mySeat, sendProgress, sendFinish, rejoin],
  );
}
