"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  TYPING_RACE_LANE_ACCENTS,
  TYPING_RACE_LANE_ROLE,
  TYPING_RACE_STAGE,
  type TypingRaceLaneSnapshot,
  type TypingRaceSnapshot,
} from "@yeon/race-shared";
import {
  mountTypingRaceEngine,
  type TypingRaceEngineController,
} from "@yeon/typing-race-engine";
import { useTypingProfile } from "./use-typing-profile";
import { createTranslator, getSpeedUnit, useTypingSettings } from "./use-typing-settings";
import { TypingSettingsButton } from "./typing-settings-button";
import type { UseRaceRoomResult } from "./use-race-room";

function calculateAccuracy(prompt: string, input: string) {
  const promptChars = Array.from(prompt);
  const inputChars = Array.from(input);
  if (inputChars.length === 0) return 100;
  const matched = inputChars.reduce(
    (count, char, i) => count + Number(char === promptChars[i]),
    0,
  );
  return Math.max(0, Math.round((matched / inputChars.length) * 100));
}

function calculateTypingSpeed(input: string, elapsedSeconds: number) {
  const len = Array.from(input).length;
  if (elapsedSeconds <= 0 || len === 0) return 0;
  return Math.round((len / elapsedSeconds) * 60);
}

function getProgress(prompt: string, input: string) {
  const promptLen = Array.from(prompt).length;
  if (promptLen === 0) return 0;
  return Math.min(100, Math.round((Array.from(input).length / promptLen) * 100));
}

export type TypingRaceMultiplayerScreenProps = {
  race: UseRaceRoomResult;
};

export function TypingRaceMultiplayerScreen({ race }: TypingRaceMultiplayerScreenProps) {
  const { profile } = useTypingProfile();
  const { settings } = useTypingSettings();
  const speedUnit = getSpeedUnit(settings.locale);
  const t = createTranslator(settings.locale);

  const [input, setInput] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const engineContainerRef = useRef<HTMLDivElement | null>(null);
  const engineControllerRef = useRef<TypingRaceEngineController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const prompt = race.prompt ?? "";
  const promptChars = useMemo(() => Array.from(prompt), [prompt]);
  const inputChars = useMemo(() => Array.from(input), [input]);

  const progress = useMemo(() => getProgress(prompt, input), [prompt, input]);
  const accuracy = useMemo(() => calculateAccuracy(prompt, input), [prompt, input]);
  const typingSpeed = useMemo(() => calculateTypingSpeed(input, elapsedSeconds), [elapsedSeconds, input]);
  const completed = input.length > 0 && input === prompt;

  const mismatches = useMemo(() => {
    return promptChars.reduce<number[]>((acc, char, idx) => {
      if (inputChars[idx] !== undefined && inputChars[idx] !== char) acc.push(idx);
      return acc;
    }, []);
  }, [inputChars, promptChars]);

  // 카운트다운 종료 시 타이머 시작 + 포커스
  useEffect(() => {
    if (race.stage !== TYPING_RACE_STAGE.LIVE || startedAt || completed) return;
    setStartedAt(Date.now());
    textareaRef.current?.focus();
  }, [race.stage, startedAt, completed]);

  useEffect(() => {
    if (!startedAt || completed) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((Date.now() - startedAt) / 1000);
    }, 100);
    return () => window.clearInterval(interval);
  }, [completed, startedAt]);

  // 서버에 progress 전송 (500ms throttle)
  const lastSentProgressRef = useRef(0);
  const sendProgress = race.sendProgress;
  const sendFinish = race.sendFinish;
  const stage = race.stage;
  useEffect(() => {
    if (stage !== TYPING_RACE_STAGE.LIVE) return;
    const now = Date.now();
    if (now - lastSentProgressRef.current < 500 && !completed) return;
    lastSentProgressRef.current = now;
    sendProgress({ progress, wpm: typingSpeed, accuracy });
  }, [accuracy, completed, progress, sendProgress, stage, typingSpeed]);

  // 완주 시 finish 전송
  const finishSentRef = useRef(false);
  useEffect(() => {
    if (!completed || finishSentRef.current) return;
    finishSentRef.current = true;
    sendFinish({
      progress: 100,
      wpm: typingSpeed,
      accuracy,
      finishedAt: Date.now(),
    });
  }, [accuracy, completed, sendFinish, typingSpeed]);

  // 엔진 마운트: cleanup에서만 destroy해 double-destroy 방지
  useEffect(() => {
    let active = true;
    if (!engineContainerRef.current) return;

    const mountPromise = mountTypingRaceEngine({ container: engineContainerRef.current });
    mountPromise.then((controller) => {
      if (!active) return; // cleanup이 처리하므로 여기서 destroy 호출 안 함
      engineControllerRef.current = controller;
    });

    return () => {
      active = false;
      engineControllerRef.current = null;
      mountPromise.then((controller) => {
        controller.destroy();
      }).catch(() => { /* ignore */ });
    };
  }, []);

  // 서버 스냅샷에 내 로컬 진행률 즉각 반영 (lag 보정)
  const displaySnapshot = useMemo<TypingRaceSnapshot | null>(() => {
    if (!race.snapshot) return null;
    const lanes: TypingRaceLaneSnapshot[] = race.snapshot.lanes.map((lane) => {
      if (lane.id === race.mySeat) {
        return {
          ...lane,
          label: profile.nickname,
          accent: TYPING_RACE_LANE_ACCENTS[0],
          role: TYPING_RACE_LANE_ROLE.LOCAL,
          progress,
          wpm: completed ? typingSpeed : lane.wpm,
        };
      }
      return lane;
    });
    return { ...race.snapshot, lanes, speedUnit };
  }, [race.snapshot, race.mySeat, profile.nickname, progress, typingSpeed, completed, speedUnit]);

  useEffect(() => {
    if (!displaySnapshot) return;
    engineControllerRef.current?.setSnapshot(displaySnapshot);
  }, [displaySnapshot]);

  const handleRestart = () => {
    setInput("");
    setStartedAt(null);
    setElapsedSeconds(0);
    finishSentRef.current = false;
    lastSentProgressRef.current = 0;
    race.rejoin();
  };

  const inCountdown = race.stage === TYPING_RACE_STAGE.COUNTDOWN;

  return (
    <div className="min-h-screen bg-white text-[#111]">
      <header className="border-b border-[#e5e5e5] px-6 py-3 md:px-12">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <Link
            href="/typing-service"
            className="inline-flex items-center gap-2 text-[13px] text-[#888] no-underline hover:text-[#111]"
          >
            <ArrowLeft size={14} />
            {t("appName")}
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[12px] text-[#aaa]">
              {race.snapshot?.roundLabel === "flow-focus" ? t("roundFlowFocus") : (race.snapshot?.roundLabel ?? "")}
            </span>
            <TypingSettingsButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-4 md:px-8">
        <div className="overflow-hidden rounded-xl border border-[#e5e5e5]">
          <div ref={engineContainerRef} className="h-[520px] w-full" />
        </div>

        <div className="mt-3 flex items-center gap-6 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-5 py-3 font-mono text-[13px]">
          <span className="text-[#888]">{speedUnit}</span>
          <span className="text-[18px] font-bold text-[#111]">{typingSpeed}</span>
          <span className="text-[#ddd]">·</span>
          <span className="text-[#888]">acc</span>
          <span className="text-[18px] font-bold text-[#111]">{accuracy}%</span>
          <span className="text-[#ddd]">·</span>
          <span className="text-[#888]">progress</span>
          <span className="text-[18px] font-bold text-[#111]">{progress}%</span>
          <span className="text-[#ddd]">·</span>
          <span className="text-[#888]">time</span>
          <span className="text-[18px] font-bold text-[#111]">{elapsedSeconds.toFixed(1)}s</span>
        </div>

        {completed && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-5 py-4">
            <div className="flex items-center gap-6 font-mono text-[13px]">
              <span className="text-[#888]">{t("result")}</span>
              <span className="text-[#111]"><span className="text-[20px] font-bold">{typingSpeed}</span> {speedUnit}</span>
              <span className="text-[#111]"><span className="text-[20px] font-bold">{accuracy}</span>% {t("accuracy")}</span>
              <span className="text-[#111]"><span className="text-[20px] font-bold">{elapsedSeconds.toFixed(1)}</span>s</span>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded border border-[#e5e5e5] px-5 py-2 text-[13px] font-medium text-[#555] transition-colors hover:border-[#aaa]"
              onClick={handleRestart}
            >
              <RotateCcw size={13} />
              {t("restart")}
            </button>
          </div>
        )}

        {!completed && (
          <div className="mt-3 grid gap-3">
            <div className="rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-6 py-5 font-mono text-[19px] leading-[2] tracking-[0.01em]">
              {promptChars.map((char, index) => {
                const typed = inputChars[index];
                const isCurrent = index === inputChars.length;
                const isMismatch = mismatches.includes(index);
                const isMatched = typed === char;

                return (
                  <span
                    key={`${index}-${char}`}
                    className={
                      isMismatch
                        ? "bg-red-100 text-red-500"
                        : isMatched
                          ? "text-[#111]"
                          : isCurrent
                            ? "bg-[#111] text-white"
                            : "text-[#ccc]"
                    }
                  >
                    {char}
                  </span>
                );
              })}
            </div>

            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(Array.from(e.target.value).slice(0, promptChars.length).join(""))}
              disabled={inCountdown}
              rows={3}
              spellCheck={false}
              aria-label={t("typingInputLabel")}
              className="w-full resize-none rounded-lg border border-[#e5e5e5] bg-white px-5 py-4 font-mono text-[16px] leading-[1.7] text-[#111] outline-none transition-colors placeholder:text-[#ccc] focus:border-[#111] disabled:cursor-not-allowed disabled:opacity-40"
              placeholder={inCountdown ? `${race.countdownRemaining}${t("startingIn")}` : t("typeHere")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
