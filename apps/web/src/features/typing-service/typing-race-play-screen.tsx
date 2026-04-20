"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw, SkipForward } from "lucide-react";
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
import {
  TYPING_DIFFICULTY_LABELS,
  TYPING_PASSAGES,
  type TypingDifficulty,
  type TypingPassage,
} from "./typing-content";

function getDifficultyPassages(difficulty: TypingDifficulty) {
  return TYPING_PASSAGES.filter((passage) => passage.difficulty === difficulty);
}

function getNextPassage(
  currentPassageId: string,
  difficulty: TypingDifficulty,
): TypingPassage {
  const passages = getDifficultyPassages(difficulty);
  const currentIndex = passages.findIndex(
    (passage) => passage.id === currentPassageId,
  );

  if (currentIndex === -1 || currentIndex === passages.length - 1) {
    return passages[0];
  }

  return passages[currentIndex + 1];
}

function calculateAccuracy(prompt: string, input: string) {
  const promptChars = Array.from(prompt);
  const inputChars = Array.from(input);

  if (inputChars.length === 0) {
    return 100;
  }

  const matchedLength = inputChars.reduce((count, char, index) => {
    return count + Number(char === promptChars[index]);
  }, 0);

  return Math.max(0, Math.round((matchedLength / inputChars.length) * 100));
}

function calculateTypingSpeed(input: string, elapsedSeconds: number) {
  const inputChars = Array.from(input);

  if (elapsedSeconds <= 0 || inputChars.length === 0) {
    return 0;
  }

  return Math.round((inputChars.length / elapsedSeconds) * 60);
}

function getProgress(prompt: string, input: string) {
  const promptChars = Array.from(prompt);
  const inputChars = Array.from(input);

  if (promptChars.length === 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((inputChars.length / promptChars.length) * 100),
  );
}

export function TypingRacePlayScreen() {
  const [difficulty, setDifficulty] = useState<TypingDifficulty>("flow");
  const [activePassageId, setActivePassageId] = useState(
    getDifficultyPassages("flow")[0]?.id ?? "",
  );
  const [input, setInput] = useState("");
  const [countdownRemaining, setCountdownRemaining] = useState<number>(
    TYPING_RACE_DEFAULTS.countdownSeconds,
  );
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const engineContainerRef = useRef<HTMLDivElement | null>(null);
  const engineControllerRef = useRef<TypingRaceEngineController | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const difficultyPassages = useMemo(
    () => getDifficultyPassages(difficulty),
    [difficulty],
  );
  const activePassage =
    difficultyPassages.find((passage) => passage.id === activePassageId) ??
    difficultyPassages[0];

  const promptChars = useMemo(
    () => Array.from(activePassage.prompt),
    [activePassage.prompt],
  );
  const inputChars = useMemo(() => Array.from(input), [input]);

  const progress = useMemo(
    () => getProgress(activePassage.prompt, input),
    [activePassage.prompt, input],
  );
  const accuracy = useMemo(
    () => calculateAccuracy(activePassage.prompt, input),
    [activePassage.prompt, input],
  );
  const typingSpeed = useMemo(
    () => calculateTypingSpeed(input, elapsedSeconds),
    [elapsedSeconds, input],
  );
  const completed = input === activePassage.prompt;
  const raceStage = completed
    ? TYPING_RACE_STAGE.FINISHED
    : countdownRemaining > 0
      ? TYPING_RACE_STAGE.COUNTDOWN
      : TYPING_RACE_STAGE.LIVE;

  const mismatches = useMemo(() => {
    return promptChars.reduce<number[]>((acc, char, idx) => {
      if (inputChars[idx] !== undefined && inputChars[idx] !== char) {
        acc.push(idx);
      }
      return acc;
    }, []);
  }, [inputChars, promptChars]);

  useEffect(() => {
    setActivePassageId(getDifficultyPassages(difficulty)[0]?.id ?? "");
  }, [difficulty]);

  useEffect(() => {
    setInput("");
    setCountdownRemaining(TYPING_RACE_DEFAULTS.countdownSeconds);
    setStartedAt(null);
    setElapsedSeconds(0);
  }, [activePassageId]);

  useEffect(() => {
    if (countdownRemaining <= 0 || completed) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setCountdownRemaining((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [completed, countdownRemaining]);

  useEffect(() => {
    if (countdownRemaining !== 0 || startedAt || completed) {
      return;
    }

    setStartedAt(Date.now());
    textareaRef.current?.focus();
  }, [completed, countdownRemaining, startedAt]);

  useEffect(() => {
    if (!startedAt || completed) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((Date.now() - startedAt) / 1000);
    }, 100);

    return () => window.clearInterval(interval);
  }, [completed, startedAt]);

  useEffect(() => {
    let active = true;

    if (!engineContainerRef.current) {
      return;
    }

    void mountTypingRaceEngine({
      container: engineContainerRef.current,
    }).then((controller) => {
      if (!active) {
        controller.destroy();
        return;
      }

      engineControllerRef.current = controller;
    });

    return () => {
      active = false;
      engineControllerRef.current?.destroy();
      engineControllerRef.current = null;
    };
  }, []);

  const snapshot = useMemo<TypingRaceSnapshot>(() => {
    const promptLength = Math.max(1, Array.from(activePassage.prompt).length);
    const benchmarkLanes = [
      {
        id: "benchmark-1",
        label: "Benchmark Alpha",
        accent: TYPING_RACE_LANE_ACCENTS[1],
        wpm: 268,
        multiplier: 1.02,
      },
      {
        id: "benchmark-2",
        label: "Benchmark Bravo",
        accent: TYPING_RACE_LANE_ACCENTS[2],
        wpm: 244,
        multiplier: 0.94,
      },
      {
        id: "benchmark-3",
        label: "Benchmark Charlie",
        accent: TYPING_RACE_LANE_ACCENTS[3],
        wpm: 228,
        multiplier: 0.88,
      },
    ].map((lane, index) => {
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
      headline:
        raceStage === TYPING_RACE_STAGE.COUNTDOWN
          ? "출발선"
          : raceStage === TYPING_RACE_STAGE.FINISHED
            ? "결승선 통과"
            : "레이스 진행 중",
      subheadline:
        raceStage === TYPING_RACE_STAGE.COUNTDOWN
          ? "10초 뒤 입력이 시작됩니다."
          : raceStage === TYPING_RACE_STAGE.FINISHED
            ? "다음 문장으로 이어갈 수 있습니다."
            : "입력과 동시에 내 레인이 움직입니다.",
      roundLabel: activePassage.title,
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
  }, [
    activePassage.prompt,
    activePassage.title,
    countdownRemaining,
    elapsedSeconds,
    progress,
    raceStage,
    typingSpeed,
  ]);

  useEffect(() => {
    engineControllerRef.current?.setSnapshot(snapshot);
  }, [snapshot]);

  const handleReset = () => {
    setInput("");
    setCountdownRemaining(TYPING_RACE_DEFAULTS.countdownSeconds);
    setStartedAt(null);
    setElapsedSeconds(0);
  };

  const handleNextPassage = () => {
    setActivePassageId(getNextPassage(activePassage.id, difficulty).id);
  };

  const statusLabel =
    countdownRemaining > 0
      ? `T-${countdownRemaining}s`
      : completed
        ? "FINISHED"
        : "LIVE";
  const statusColor =
    countdownRemaining > 0
      ? "text-[#f9cf6e]"
      : completed
        ? "text-[#7bffaf]"
        : "text-[#7bffaf]";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_80%_-20%,_rgba(123,255,175,0.14),_transparent_40%),radial-gradient(circle_at_-10%_20%,_rgba(94,141,255,0.12),_transparent_38%),linear-gradient(180deg,_#07101a_0%,_#081320_45%,_#091520_100%)] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(90deg,_rgba(255,255,255,0.025)_0px,_rgba(255,255,255,0.025)_1px,_transparent_1px,_transparent_140px)]"
      />

      <header className="relative border-b border-white/6 bg-[#050c14]/70 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4 px-5 py-4 md:px-10">
          <div className="flex items-center gap-5">
            <Link
              href="/typing-service"
              className="inline-flex items-center gap-2 text-[13px] font-semibold text-white/70 no-underline transition-colors hover:text-white"
            >
              <ArrowLeft size={15} />
              타자연습
            </Link>
            <span className="hidden h-5 w-px bg-white/10 md:block" />
            <div className="hidden items-center gap-2 md:flex">
              <span
                className={`inline-flex h-1.5 w-1.5 rounded-full ${
                  countdownRemaining > 0
                    ? "bg-[#f9cf6e] shadow-[0_0_10px_rgba(249,207,110,0.9)]"
                    : "animate-pulse bg-[#7bffaf] shadow-[0_0_10px_rgba(123,255,175,0.9)]"
                }`}
              />
              <span
                className={`font-mono text-[11px] font-bold uppercase tracking-[0.3em] ${statusColor}`}
              >
                {statusLabel}
              </span>
              <span className="text-[12px] text-white/40">·</span>
              <span className="text-[12px] font-medium text-white/60">
                {activePassage.title}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(TYPING_DIFFICULTY_LABELS) as TypingDifficulty[]).map(
              (item) => {
                const isActive = difficulty === item;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={isActive}
                    className={`rounded-full border px-4 py-1.5 text-[12px] font-semibold transition-all ${
                      isActive
                        ? "border-[#7bffaf] bg-[#7bffaf] text-[#04130a]"
                        : "border-white/12 bg-white/4 text-white/70 hover:border-white/25 hover:bg-white/8"
                    }`}
                    onClick={() => setDifficulty(item)}
                  >
                    {TYPING_DIFFICULTY_LABELS[item]}
                  </button>
                );
              },
            )}
          </div>
        </div>
      </header>

      <section className="relative mx-auto grid max-w-[1400px] gap-5 px-5 py-5 md:px-10 md:py-8">
        <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[#050c14]/90 shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,_transparent,_rgba(123,255,175,0.6),_transparent)]"
          />
          <div className="absolute left-5 top-4 z-10 flex items-center gap-2 md:left-7 md:top-5">
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/40">
              Lane · 04
            </span>
          </div>
          <div className="absolute right-5 top-4 z-10 flex items-center gap-4 md:right-7 md:top-5">
            <div className="flex items-baseline gap-1">
              <span className="font-['Outfit',sans-serif] text-[22px] font-black leading-none tracking-[-0.04em] text-white">
                {progress}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                %
              </span>
            </div>
            <div className="hidden items-baseline gap-1 md:flex">
              <span className="font-['Outfit',sans-serif] text-[22px] font-black leading-none tracking-[-0.04em] text-white">
                {accuracy}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                acc
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-['Outfit',sans-serif] text-[22px] font-black leading-none tracking-[-0.04em] text-[#7bffaf]">
                {typingSpeed}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                wpm
              </span>
            </div>
          </div>

          <div
            ref={engineContainerRef}
            className="relative min-h-[560px] w-full"
          />
        </div>

        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-[#081423]/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#7bffaf]">
                Prompt
              </span>
              <span className="text-[13px] text-white/55">
                {countdownRemaining > 0
                  ? `${countdownRemaining}초 뒤 입력 시작`
                  : completed
                    ? "완주했습니다"
                    : "문장을 그대로 입력하세요"}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/4 px-4 py-2 text-[12px] font-semibold text-white/85 transition-colors hover:bg-white/10"
                onClick={handleReset}
              >
                <RotateCcw size={14} />
                다시 시작
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full bg-[#7bffaf] px-4 py-2 text-[12px] font-bold text-[#04130a] transition-transform hover:-translate-y-px"
                onClick={handleNextPassage}
              >
                <SkipForward size={14} />
                다음 문장
              </button>
            </div>
          </div>

          <div className="rounded-[18px] border border-white/6 bg-[#040b14] px-5 py-5 text-[18px] leading-[1.95] tracking-[-0.005em] text-white/45">
            {promptChars.map((char, index) => {
              const typed = inputChars[index];
              const isCurrent = index === inputChars.length;
              const isMismatch = mismatches.includes(index);
              const isMatched = typed === char;

              return (
                <span
                  key={`${activePassage.id}-${index}`}
                  className={`rounded-[4px] transition-colors ${
                    isMismatch
                      ? "bg-[#ff5e6c]/20 text-[#ff9aa2]"
                      : isMatched
                        ? "text-white"
                        : isCurrent
                          ? "bg-[#7bffaf] text-[#04130a]"
                          : "text-white/35"
                  }`}
                >
                  {char}
                </span>
              );
            })}
          </div>

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            disabled={countdownRemaining > 0 || completed}
            rows={3}
            spellCheck={false}
            aria-label={`${activePassage.title} 타자 입력 영역`}
            className="w-full resize-none rounded-[18px] border border-white/10 bg-[#040b14] px-5 py-4 text-[16px] leading-[1.8] text-white outline-none transition-colors placeholder:text-white/25 focus:border-[#7bffaf] focus:shadow-[0_0_0_4px_rgba(123,255,175,0.12)] disabled:cursor-not-allowed disabled:opacity-60"
            placeholder={
              countdownRemaining > 0
                ? `출발까지 ${countdownRemaining}초...`
                : "여기에 그대로 입력하세요"
            }
          />
        </div>
      </section>
    </main>
  );
}
