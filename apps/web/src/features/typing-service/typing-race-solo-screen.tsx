"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw } from "lucide-react";
import {
  TYPING_RACE_DEFAULTS,
  TYPING_RACE_LANE_ACCENTS,
  TYPING_RACE_LANE_ROLE,
  TYPING_RACE_STAGE,
  clampRaceProgress,
  type TypingRaceSnapshot,
} from "@yeon/race-shared";
import {
  mountTypingRaceEngine,
  type TypingRaceEngineController,
} from "@yeon/typing-race-engine";
import { TYPING_PASSAGES } from "./typing-content";
import { useTypingProfile } from "./use-typing-profile";
import { createTranslator, getSpeedUnit, useTypingSettings } from "./use-typing-settings";
import { TypingSettingsButton } from "./typing-settings-button";

const RACE_PASSAGES = TYPING_PASSAGES.filter((p) => p.difficulty === "flow");

const BENCHMARK_LANES = [
  { id: "benchmark-1", label: "Guest", wpm: 270, multiplier: 1.0, startDelay: 0.4, accent: TYPING_RACE_LANE_ACCENTS[1] },
  { id: "benchmark-2", label: "Guest", wpm: 270, multiplier: 1.0, startDelay: 0.7, accent: TYPING_RACE_LANE_ACCENTS[2] },
  { id: "benchmark-3", label: "Guest", wpm: 270, multiplier: 1.0, startDelay: 1.1, accent: TYPING_RACE_LANE_ACCENTS[3] },
] as const;

function getRandomPassage() {
  return RACE_PASSAGES[Math.floor(Math.random() * RACE_PASSAGES.length)] ?? RACE_PASSAGES[0];
}

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

export type TypingRaceSoloScreenProps = {
  offlineReason?: string | null;
  retryLabel?: string;
  onRetryMultiplayer?: () => void;
};

export function TypingRaceSoloScreen({ offlineReason, retryLabel, onRetryMultiplayer }: TypingRaceSoloScreenProps) {
  const { profile } = useTypingProfile();
  const { settings } = useTypingSettings();
  const speedUnit = getSpeedUnit(settings.locale);
  const t = createTranslator(settings.locale);
  const [passage, setPassage] = useState(() => getRandomPassage());
  const [input, setInput] = useState("");
  const [countdownRemaining, setCountdownRemaining] = useState<number>(
    TYPING_RACE_DEFAULTS.countdownSeconds,
  );
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const engineContainerRef = useRef<HTMLDivElement | null>(null);
  const engineControllerRef = useRef<TypingRaceEngineController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const benchmarkNoiseRef = useRef<{
    noise: number;
    nextChangeAt: number;
    accChars: number;
    prevEffectiveSec: number;
    finishedWpm: number | null;
    giveUpAt: number | null;
    pauseAt: number | null;
    pausedUntil: number | null;
  }[]>(
    BENCHMARK_LANES.map(() => ({
      noise: 1.0,
      nextChangeAt: 0,
      accChars: 0,
      prevEffectiveSec: 0,
      finishedWpm: null,
      giveUpAt: Math.random() < 1 / 25 ? 0.25 + Math.random() * 0.45 : null,
      pauseAt: Math.random() < 1 / 20 ? 0.2 + Math.random() * 0.6 : null,
      pausedUntil: null,
    })),
  );

  const promptChars = useMemo(() => Array.from(passage.prompt), [passage.prompt]);
  const inputChars = useMemo(() => Array.from(input), [input]);

  const progress = useMemo(() => getProgress(passage.prompt, input), [passage.prompt, input]);
  const accuracy = useMemo(() => calculateAccuracy(passage.prompt, input), [passage.prompt, input]);
  const typingSpeed = useMemo(() => calculateTypingSpeed(input, elapsedSeconds), [elapsedSeconds, input]);
  const completed = input === passage.prompt;

  const raceStage = completed
    ? TYPING_RACE_STAGE.FINISHED
    : countdownRemaining > 0
      ? TYPING_RACE_STAGE.COUNTDOWN
      : TYPING_RACE_STAGE.LIVE;

  const mismatches = useMemo(() => {
    return promptChars.reduce<number[]>((acc, char, idx) => {
      if (inputChars[idx] !== undefined && inputChars[idx] !== char) acc.push(idx);
      return acc;
    }, []);
  }, [inputChars, promptChars]);

  useEffect(() => {
    if (countdownRemaining <= 0 || completed) return;
    const timeout = window.setTimeout(() => {
      setCountdownRemaining((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [completed, countdownRemaining]);

  useEffect(() => {
    if (countdownRemaining !== 0 || startedAt || completed) return;
    setStartedAt(Date.now());
    textareaRef.current?.focus();
  }, [completed, countdownRemaining, startedAt]);

  useEffect(() => {
    if (!startedAt || completed) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((Date.now() - startedAt) / 1000);
    }, 100);
    return () => window.clearInterval(interval);
  }, [completed, startedAt]);

  useEffect(() => {
    let active = true;
    if (!engineContainerRef.current) return;

    const mountPromise = mountTypingRaceEngine({ container: engineContainerRef.current });
    mountPromise.then((controller) => {
      if (!active) return;
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

  const snapshot = useMemo<TypingRaceSnapshot>(() => {
    const promptLength = Math.max(1, promptChars.length);

    const benchmarkLanes = BENCHMARK_LANES.map((lane, index) => {
      const effectiveSeconds = raceStage === TYPING_RACE_STAGE.COUNTDOWN
        ? 0
        : Math.max(0, elapsedSeconds - lane.startDelay);

      const noiseState = benchmarkNoiseRef.current[index]!;
      if (effectiveSeconds > 0 && effectiveSeconds >= noiseState.nextChangeAt) {
        noiseState.noise = 0.6 + Math.random() * 0.8;
        noiseState.nextChangeAt = effectiveSeconds + 0.3 + Math.random() * 1.2;
      }

      const progressRatio = noiseState.accChars / promptLength;
      const alreadyGaveUp = noiseState.giveUpAt !== null && progressRatio >= noiseState.giveUpAt;

      if (noiseState.pauseAt !== null && progressRatio >= noiseState.pauseAt && noiseState.pausedUntil === null) {
        noiseState.pausedUntil = effectiveSeconds + 2;
        noiseState.pauseAt = null;
      }
      const isPausing = noiseState.pausedUntil !== null && effectiveSeconds < noiseState.pausedUntil;

      if (effectiveSeconds > 0 && !alreadyGaveUp && !isPausing) {
        const delta = effectiveSeconds - noiseState.prevEffectiveSec;
        if (delta > 0) {
          noiseState.accChars += delta * (lane.wpm / 60) * lane.multiplier * noiseState.noise;
        }
      }
      noiseState.prevEffectiveSec = effectiveSeconds;
      const simulatedChars = noiseState.accChars;
      const laneProgress = clampRaceProgress((simulatedChars / promptLength) * 100);

      if (laneProgress >= 100 && noiseState.finishedWpm === null && effectiveSeconds > 0) {
        noiseState.finishedWpm = Math.round((simulatedChars / effectiveSeconds) * 60);
      }

      return {
        id: lane.id,
        label: lane.label,
        accent: lane.accent,
        role: TYPING_RACE_LANE_ROLE.BENCHMARK,
        progress: laneProgress,
        wpm: noiseState.finishedWpm ?? 0,
      };
    });

    return {
      stage: raceStage,
      countdownRemaining,
      headline: "",
      subheadline: "",
      roundLabel: passage.title,
      speedUnit,
      lanes: [
        {
          id: "local-player",
          label: profile.nickname,
          accent: TYPING_RACE_LANE_ACCENTS[0],
          role: TYPING_RACE_LANE_ROLE.LOCAL,
          progress,
          wpm: typingSpeed,
        },
        ...benchmarkLanes,
      ],
    };
  }, [countdownRemaining, elapsedSeconds, passage.title, profile.nickname, progress, promptChars.length, raceStage, speedUnit, typingSpeed]);

  useEffect(() => {
    engineControllerRef.current?.setSnapshot(snapshot);
  }, [snapshot]);

  const handleRestart = () => {
    benchmarkNoiseRef.current = BENCHMARK_LANES.map(() => ({
      noise: 1.0,
      nextChangeAt: 0,
      accChars: 0,
      prevEffectiveSec: 0,
      finishedWpm: null,
      giveUpAt: Math.random() < 1 / 25 ? 0.25 + Math.random() * 0.45 : null,
      pauseAt: Math.random() < 1 / 20 ? 0.2 + Math.random() * 0.6 : null,
      pausedUntil: null,
    }));
    setPassage(getRandomPassage());
    setInput("");
    setCountdownRemaining(TYPING_RACE_DEFAULTS.countdownSeconds);
    setStartedAt(null);
    setElapsedSeconds(0);
  };

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
            <span className="font-mono text-[12px] text-[#aaa]">{passage.title}</span>
            <TypingSettingsButton />
          </div>
        </div>
      </header>

      {offlineReason && (
        <div className="border-b border-[#fcd34d] bg-[#fef3c7] px-6 py-2 text-[12px] text-[#92400e]">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between">
            <span>{offlineReason}</span>
            {onRetryMultiplayer && (
              <button
                type="button"
                onClick={onRetryMultiplayer}
                className="rounded border border-[#f59e0b] px-2 py-0.5 text-[11px] font-medium text-[#92400e] hover:bg-[#fde68a]"
              >
                {retryLabel ?? "재연결"}
              </button>
            )}
          </div>
        </div>
      )}

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
                    key={`${passage.id}-${index}`}
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
              disabled={countdownRemaining > 0}
              rows={3}
              spellCheck={false}
              aria-label={t("typingInputLabel")}
              className="w-full resize-none rounded-lg border border-[#e5e5e5] bg-white px-5 py-4 font-mono text-[16px] leading-[1.7] text-[#111] outline-none transition-colors placeholder:text-[#ccc] focus:border-[#111] disabled:cursor-not-allowed disabled:opacity-40"
              placeholder={countdownRemaining > 0 ? `${countdownRemaining}${t("startingIn")}` : t("typeHere")}
            />
          </div>
        )}
      </div>
    </div>
  );
}
