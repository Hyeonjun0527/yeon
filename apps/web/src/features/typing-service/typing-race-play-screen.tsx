"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, RotateCcw, TimerReset, Trophy, Zap } from "lucide-react";
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
        label: "Benchmark Guest",
        accent: TYPING_RACE_LANE_ACCENTS[1],
        wpm: 268,
        multiplier: 1.02,
      },
      {
        id: "benchmark-2",
        label: "Benchmark Guest",
        accent: TYPING_RACE_LANE_ACCENTS[2],
        wpm: 244,
        multiplier: 0.94,
      },
      {
        id: "benchmark-3",
        label: "Benchmark Guest",
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
          ? "출발선에 바로 입장했습니다"
          : raceStage === TYPING_RACE_STAGE.FINISHED
            ? "라운드 완주"
            : "레이스 진행 중",
      subheadline:
        raceStage === TYPING_RACE_STAGE.COUNTDOWN
          ? "별도 로딩 없이 10초 카운트다운 뒤 바로 타이핑이 시작됩니다."
          : raceStage === TYPING_RACE_STAGE.FINISHED
            ? "다음 문장으로 바로 이어서 다시 달릴 수 있습니다."
            : "입력 진행률이 lane 이동과 바로 연결됩니다.",
      roundLabel: activePassage.title,
      lanes: [
        {
          id: "local-player",
          label: "Guest (you)",
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

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#08111b_0%,_#091722_48%,_#101d2a_100%)] text-white">
      <section className="mx-auto grid max-w-[1240px] gap-6 px-5 py-6 md:px-10 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="grid gap-2">
            <Link
              href="/typing-service"
              className="inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#8db7de] no-underline transition-colors hover:text-white"
            >
              <ArrowLeft size={16} />
              타자연습 소개로 돌아가기
            </Link>
            <div>
              <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8db7de]">
                typing race preview
              </p>
              <h1 className="m-0 mt-2 font-['Outfit',sans-serif] text-[clamp(34px,6vw,64px)] font-black tracking-[-0.05em] text-white">
                SEO는 유지하고, 플레이는 출발선에서 시작합니다
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(TYPING_DIFFICULTY_LABELS) as TypingDifficulty[]).map(
              (item) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                    difficulty === item
                      ? "bg-white text-[#091722]"
                      : "bg-white/10 text-[#d7e6f6] hover:bg-white/16"
                  }`}
                  onClick={() => setDifficulty(item)}
                >
                  {TYPING_DIFFICULTY_LABELS[item]}
                </button>
              ),
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-[30px] border border-white/10 bg-black/20 shadow-[0_30px_80px_rgba(0,0,0,0.24)]">
          <div ref={engineContainerRef} className="min-h-[520px] w-full" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <section className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="grid gap-2">
                <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8db7de]">
                  current round
                </p>
                <h2 className="m-0 text-[28px] font-bold tracking-[-0.04em] text-white">
                  {activePassage.title}
                </h2>
                <p className="m-0 max-w-[62ch] text-[15px] leading-[1.8] text-[#afc4d8]">
                  {activePassage.description}. 카운트다운이 끝나면 바로 아래
                  입력창으로 이어집니다.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[16px] border border-white/10 bg-white/8 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/14"
                  onClick={handleReset}
                >
                  <RotateCcw size={16} />
                  다시 시작
                </button>
                <button
                  type="button"
                  className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[16px] bg-[#f2c94c] px-4 text-sm font-bold text-[#121212] transition-transform hover:-translate-y-px"
                  onClick={handleNextPassage}
                >
                  <TimerReset size={16} />
                  다음 문장
                </button>
              </div>
            </div>

            <div className="mt-4 rounded-[24px] border border-white/10 bg-[#07131f] p-5">
              <p className="m-0 text-[18px] leading-[1.85] text-[#e9f2fb]">
                {activePassage.prompt}
              </p>
            </div>

            <label className="mt-4 grid gap-2">
              <span className="text-sm font-semibold text-[#8db7de]">
                {countdownRemaining > 0
                  ? `${countdownRemaining}초 뒤 입력 시작`
                  : completed
                    ? "완주했습니다. 다음 문장으로 이어가거나 다시 시작하세요."
                    : "입력하면 내 lane이 바로 움직입니다."}
              </span>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                disabled={countdownRemaining > 0 || completed}
                rows={6}
                spellCheck={false}
                className="w-full resize-none rounded-[24px] border border-white/10 bg-white/6 px-5 py-4 text-[16px] leading-[1.8] text-white outline-none transition-colors placeholder:text-[#5f7487] focus:border-[#8db7de] disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="카운트다운이 끝나면 여기에 문장을 그대로 입력하세요."
              />
            </label>
          </section>

          <aside className="grid gap-3">
            {[
              {
                label: "진행률",
                value: `${progress}%`,
                icon: Zap,
              },
              {
                label: "정확도",
                value: `${accuracy}%`,
                icon: Trophy,
              },
              {
                label: "현재 타수",
                value: `${typingSpeed} wpm`,
                icon: TimerReset,
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-[24px] border border-white/10 bg-white/6 p-5"
                >
                  <div className="flex items-center gap-2 text-[#8db7de]">
                    <Icon size={16} />
                    <span className="text-[12px] font-semibold uppercase tracking-[0.16em]">
                      {item.label}
                    </span>
                  </div>
                  <div className="mt-3 font-['Outfit',sans-serif] text-[36px] font-black tracking-[-0.05em] text-white">
                    {item.value}
                  </div>
                </div>
              );
            })}

            <div className="rounded-[24px] border border-white/10 bg-white/6 p-5 text-sm leading-[1.8] text-[#b9cad9]">
              이 화면은 `apps/web` 안에서 SEO 셸을 유지한 채, Phaser 엔진만
              client-only로 mount하는 1차 구조입니다. 실시간 서버가 붙으면 현재
              benchmark lane 자리에 authoritative room state가 들어옵니다.
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
