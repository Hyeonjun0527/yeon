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

const RACE_PASSAGES = TYPING_PASSAGES.filter((p) => p.difficulty === "flow");

const BENCHMARK_LANES = [
  { id: "benchmark-1", label: "Guest", wpm: 268, multiplier: 1.02, accent: TYPING_RACE_LANE_ACCENTS[1] },
  { id: "benchmark-2", label: "Guest", wpm: 244, multiplier: 0.94, accent: TYPING_RACE_LANE_ACCENTS[2] },
  { id: "benchmark-3", label: "Guest", wpm: 228, multiplier: 0.88, accent: TYPING_RACE_LANE_ACCENTS[3] },
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

export function TypingRacePlayScreen() {
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

  // 카운트다운
  useEffect(() => {
    if (countdownRemaining <= 0 || completed) return;
    const timeout = window.setTimeout(() => {
      setCountdownRemaining((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [completed, countdownRemaining]);

  // 카운트다운 끝나면 입력 포커스
  useEffect(() => {
    if (countdownRemaining !== 0 || startedAt || completed) return;
    setStartedAt(Date.now());
    textareaRef.current?.focus();
  }, [completed, countdownRemaining, startedAt]);

  // 경과 시간
  useEffect(() => {
    if (!startedAt || completed) return;
    const interval = window.setInterval(() => {
      setElapsedSeconds((Date.now() - startedAt) / 1000);
    }, 100);
    return () => window.clearInterval(interval);
  }, [completed, startedAt]);

  // Phaser 엔진 마운트
  useEffect(() => {
    let active = true;
    if (!engineContainerRef.current) return;

    void mountTypingRaceEngine({ container: engineContainerRef.current }).then(
      (controller) => {
        if (!active) { controller.destroy(); return; }
        engineControllerRef.current = controller;
      },
    );

    return () => {
      active = false;
      engineControllerRef.current?.destroy();
      engineControllerRef.current = null;
    };
  }, []);

  // 스냅샷 동기화
  const snapshot = useMemo<TypingRaceSnapshot>(() => {
    const promptLength = Math.max(1, promptChars.length);

    const benchmarkLanes = BENCHMARK_LANES.map((lane, index) => {
      const simulatedChars =
        raceStage === TYPING_RACE_STAGE.COUNTDOWN
          ? 0
          : elapsedSeconds * (lane.wpm / 60) * lane.multiplier + index * 3;

      return {
        id: lane.id,
        label: lane.label,
        accent: lane.accent,
        role: TYPING_RACE_LANE_ROLE.BENCHMARK,
        progress: clampRaceProgress((simulatedChars / promptLength) * 100),
        wpm: lane.wpm,
      };
    });

    return {
      stage: raceStage,
      countdownRemaining,
      headline: "",
      subheadline: "",
      roundLabel: passage.title,
      lanes: [
        {
          id: "local-player",
          label: "You",
          accent: TYPING_RACE_LANE_ACCENTS[0],
          role: TYPING_RACE_LANE_ROLE.LOCAL,
          progress,
          wpm: typingSpeed,
        },
        ...benchmarkLanes,
      ],
    };
  }, [countdownRemaining, elapsedSeconds, passage.title, progress, promptChars.length, raceStage, typingSpeed]);

  useEffect(() => {
    engineControllerRef.current?.setSnapshot(snapshot);
  }, [snapshot]);

  const handleRestart = () => {
    setPassage(getRandomPassage());
    setInput("");
    setCountdownRemaining(TYPING_RACE_DEFAULTS.countdownSeconds);
    setStartedAt(null);
    setElapsedSeconds(0);
  };

  return (
    <div className="min-h-screen bg-white text-[#111]">
      {/* 헤더 */}
      <header className="border-b border-[#e5e5e5] px-6 py-3 md:px-12">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between">
          <Link
            href="/typing-service"
            className="inline-flex items-center gap-2 text-[13px] text-[#888] no-underline hover:text-[#111]"
          >
            <ArrowLeft size={14} />
            타자연습
          </Link>
          <span className="font-mono text-[12px] text-[#aaa]">
            {passage.title}
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] px-4 py-4 md:px-8">
        {/* 캔버스 */}
        <div className="overflow-hidden rounded-xl border border-[#e5e5e5]">
          <div ref={engineContainerRef} className="min-h-[520px] w-full" />
        </div>

        {/* 통계 바 */}
        <div className="mt-3 flex items-center gap-6 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-5 py-3 font-mono text-[13px]">
          <span className="text-[#888]">wpm</span>
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

        {/* 완주 패널 */}
        {completed && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-5 py-4">
            <div className="flex items-center gap-6 font-mono text-[13px]">
              <span className="text-[#888]">결과</span>
              <span className="text-[#111]"><span className="text-[20px] font-bold">{typingSpeed}</span> wpm</span>
              <span className="text-[#111]"><span className="text-[20px] font-bold">{accuracy}</span>% 정확도</span>
              <span className="text-[#111]"><span className="text-[20px] font-bold">{elapsedSeconds.toFixed(1)}</span>s</span>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded border border-[#e5e5e5] px-5 py-2 text-[13px] font-medium text-[#555] transition-colors hover:border-[#aaa]"
              onClick={handleRestart}
            >
              <RotateCcw size={13} />
              다시 레이스
            </button>
          </div>
        )}

        {/* 프롬프트 + 입력 */}
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
              aria-label="타자 입력 영역"
              className="w-full resize-none rounded-lg border border-[#e5e5e5] bg-white px-5 py-4 font-mono text-[16px] leading-[1.7] text-[#111] outline-none transition-colors placeholder:text-[#ccc] focus:border-[#111] disabled:cursor-not-allowed disabled:opacity-40"
              placeholder={countdownRemaining > 0 ? `${countdownRemaining}초 후 시작...` : "여기에 입력하세요"}
            />
          </div>
        )}
      </div>
    </div>
  );
}
