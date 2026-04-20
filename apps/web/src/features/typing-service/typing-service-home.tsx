"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, RefreshCcw, TimerReset } from "lucide-react";
import {
  TYPING_DIFFICULTY_LABELS,
  TYPING_FAQS,
  TYPING_PASSAGES,
  type TypingDifficulty,
  type TypingPassage,
} from "./typing-content";

const BENCHMARK_RECORDS = [
  { rank: "01", label: "Benchmark Alpha", wpm: 268, accuracy: 99 },
  { rank: "02", label: "Benchmark Bravo", wpm: 244, accuracy: 98 },
  { rank: "03", label: "Benchmark Charlie", wpm: 228, accuracy: 97 },
] as const;

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

export function TypingServiceHome() {
  const [difficulty, setDifficulty] = useState<TypingDifficulty>("starter");
  const [activePassageId, setActivePassageId] = useState(
    getDifficultyPassages("starter")[0]?.id ?? "",
  );
  const [input, setInput] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
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

  useEffect(() => {
    if (!startedAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setElapsedSeconds((Date.now() - startedAt) / 1000);
    }, 100);

    return () => window.clearInterval(interval);
  }, [startedAt]);

  const accuracy = useMemo(
    () => calculateAccuracy(activePassage.prompt, input),
    [activePassage.prompt, input],
  );
  const progress = useMemo(
    () => getProgress(activePassage.prompt, input),
    [activePassage.prompt, input],
  );
  const typingSpeed = useMemo(
    () => calculateTypingSpeed(input, elapsedSeconds),
    [elapsedSeconds, input],
  );
  const completed = input === activePassage.prompt;

  useEffect(() => {
    setActivePassageId(difficultyPassages[0]?.id ?? "");
    setInput("");
    setStartedAt(null);
    setElapsedSeconds(0);
  }, [difficulty, difficultyPassages]);

  const mismatches = useMemo(() => {
    return promptChars.reduce<number[]>((acc, char, idx) => {
      if (inputChars[idx] !== undefined && inputChars[idx] !== char) {
        acc.push(idx);
      }
      return acc;
    }, []);
  }, [inputChars, promptChars]);

  const handleReset = () => {
    setInput("");
    setStartedAt(null);
    setElapsedSeconds(0);
    textareaRef.current?.focus();
  };

  const handleNextPassage = () => {
    setActivePassageId(getNextPassage(activePassage.id, difficulty).id);
    setInput("");
    setStartedAt(null);
    setElapsedSeconds(0);
    textareaRef.current?.focus();
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_82%_-10%,_rgba(123,255,175,0.18),_transparent_42%),radial-gradient(circle_at_-10%_30%,_rgba(94,141,255,0.14),_transparent_40%),linear-gradient(180deg,_#07101a_0%,_#081320_45%,_#091520_100%)] text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[repeating-linear-gradient(90deg,_rgba(255,255,255,0.04)_0px,_rgba(255,255,255,0.04)_1px,_transparent_1px,_transparent_120px)] opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[56%] h-px bg-[linear-gradient(90deg,_transparent,_rgba(123,255,175,0.45),_transparent)]"
      />

      <section className="relative mx-auto grid max-w-[1240px] gap-14 px-5 pb-16 pt-10 md:px-10 md:pb-24 md:pt-16">
        <header className="grid gap-10 md:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] md:items-end">
          <div className="grid gap-7">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-[#7bffaf] shadow-[0_0_14px_rgba(123,255,175,0.9)]" />
              <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.36em] text-[#7bffaf]">
                Yeon Typing Race
              </p>
            </div>

            <h1 className="m-0 font-['Outfit',sans-serif] text-[clamp(46px,10vw,108px)] font-black leading-[0.9] tracking-[-0.06em] text-white">
              치면,
              <br />
              앞서나간다
              <span className="text-[#7bffaf]">.</span>
            </h1>

            <p className="m-0 max-w-[48ch] text-[16px] leading-[1.8] text-[#aac2d8] md:text-[18px]">
              출발선에서 10초 카운트다운이 끝나는 순간, 당신의 레인이 움직입니다.
              로그인도, 튜토리얼도 없이 바로 경쟁에 들어갑니다.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <a
                href="/typing-service/play"
                className="group relative inline-flex min-h-[60px] items-center gap-3 overflow-hidden rounded-full bg-[#7bffaf] px-8 text-[15px] font-bold tracking-[-0.01em] text-[#04130a] no-underline shadow-[0_20px_50px_rgba(123,255,175,0.28)] transition-transform duration-200 hover:-translate-y-0.5"
              >
                <span className="relative z-10">출발선 입장하기</span>
                <ChevronRight
                  size={18}
                  className="relative z-10 transition-transform duration-200 group-hover:translate-x-1"
                />
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1/3 translate-x-[-120%] bg-gradient-to-r from-transparent via-white/70 to-transparent transition-transform duration-700 group-hover:translate-x-[320%]"
                />
              </a>
              <a
                href="#practice"
                className="inline-flex min-h-[60px] items-center gap-2 rounded-full border border-white/18 bg-white/4 px-7 text-[14px] font-semibold text-white/90 no-underline transition-colors hover:bg-white/10"
              >
                연습 라운드 먼저 보기
              </a>
            </div>
          </div>

          <div className="relative">
            <div
              aria-hidden="true"
              className="absolute -left-6 -top-8 text-[140px] font-black leading-none tracking-[-0.08em] text-white/5 md:text-[200px]"
            >
              03
            </div>
            <div className="relative grid gap-5 rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl md:p-7">
              <div className="flex items-center justify-between">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#7bffaf]">
                  Today Benchmark
                </p>
                <span className="font-mono text-[11px] text-white/50">
                  KOR · WPM
                </span>
              </div>

              <ul className="m-0 grid gap-3 p-0">
                {BENCHMARK_RECORDS.map((record, index) => (
                  <li
                    key={record.rank}
                    className="flex items-center justify-between gap-4 border-t border-white/6 pt-3 first:border-t-0 first:pt-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[13px] text-white/40">
                        #{record.rank}
                      </span>
                      <span className="text-[13px] font-medium text-white/80">
                        {record.label}
                      </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span
                        className={`font-['Outfit',sans-serif] text-[28px] font-black leading-none tracking-[-0.05em] ${
                          index === 0 ? "text-[#7bffaf]" : "text-white"
                        }`}
                      >
                        {record.wpm}
                      </span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/45">
                        wpm · {record.accuracy}%
                      </span>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="flex items-center justify-between border-t border-white/6 pt-3">
                <span className="text-[12px] text-white/55">
                  내 기록으로 이 줄 위에 올라설 수 있습니다
                </span>
                <a
                  href="/typing-service/play"
                  className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#7bffaf] no-underline hover:text-white"
                >
                  도전
                  <ChevronRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </header>

        <div className="relative grid gap-3 overflow-hidden rounded-[22px] border border-white/8 bg-[#050c14]/70 px-6 py-5 backdrop-blur md:flex md:items-center md:justify-between md:gap-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 w-px bg-gradient-to-b from-transparent via-[#7bffaf] to-transparent"
          />
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#7bffaf]">
              Starting Grid
            </span>
            <span className="text-[14px] text-white/70">
              3개 레인 동시 스타트 · 10초 카운트다운 후 즉시 플레이
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-5 font-mono text-[11px] uppercase tracking-[0.18em] text-white/45">
            <span>No login</span>
            <span className="text-white/20">/</span>
            <span>Korean &amp; English</span>
            <span className="text-white/20">/</span>
            <span>Live wpm · accuracy</span>
          </div>
        </div>
      </section>

      <section
        id="practice"
        className="relative border-t border-white/6 bg-[#061020]/60"
      >
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-14 md:px-10 md:py-20">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="grid gap-3">
              <p className="m-0 font-mono text-[11px] uppercase tracking-[0.3em] text-[#7bffaf]">
                Warm-up Round
              </p>
              <h2 className="m-0 font-['Outfit',sans-serif] text-[clamp(32px,5vw,52px)] font-black tracking-[-0.05em] text-white">
                연습 라운드
              </h2>
              <p className="m-0 max-w-[52ch] text-[15px] leading-[1.75] text-[#a3bccf]">
                본 경기에 들어가기 전 가볍게 손을 풀 수 있도록 세 가지 결의
                문장을 준비했습니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                Object.keys(TYPING_DIFFICULTY_LABELS) as TypingDifficulty[]
              ).map((item) => {
                const isActive = difficulty === item;
                return (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={isActive}
                    className={`rounded-full border px-5 py-2.5 text-[13px] font-semibold transition-all ${
                      isActive
                        ? "border-[#7bffaf] bg-[#7bffaf] text-[#04130a] shadow-[0_10px_30px_rgba(123,255,175,0.25)]"
                        : "border-white/12 bg-white/4 text-white/75 hover:border-white/30 hover:bg-white/8"
                    }`}
                    onClick={() => setDifficulty(item)}
                  >
                    {TYPING_DIFFICULTY_LABELS[item]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="relative grid gap-5 overflow-hidden rounded-[28px] border border-white/8 bg-[#081423]/80 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] md:p-8">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 h-1 w-full bg-[linear-gradient(90deg,_#7bffaf,_transparent_60%)]"
                style={{ width: `${progress}%` }}
              />

              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1.5">
                  <p className="m-0 font-mono text-[11px] uppercase tracking-[0.24em] text-[#7bffaf]/80">
                    {activePassage.description}
                  </p>
                  <h3 className="m-0 text-[24px] font-bold tracking-[-0.03em] text-white">
                    {activePassage.title}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activePassage.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-white/4 px-3 py-1 text-[11px] font-medium text-white/70"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[20px] border border-white/6 bg-[#05101c] p-6 text-[19px] leading-[1.95] tracking-[-0.005em] text-white/50">
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
                maxLength={promptChars.length}
                aria-label={`${activePassage.title} 타자 입력 영역`}
                onChange={(event) => {
                  if (!startedAt && event.target.value.length > 0) {
                    setStartedAt(Date.now());
                  }

                  setInput(
                    Array.from(event.target.value)
                      .slice(0, promptChars.length)
                      .join(""),
                  );
                }}
                spellCheck={false}
                placeholder="여기에 그대로 입력해 보세요"
                className="min-h-[160px] rounded-[20px] border border-white/10 bg-[#040b14] px-5 py-4 text-[16px] leading-[1.7] text-white outline-none ring-0 transition-colors placeholder:text-white/25 focus:border-[#7bffaf] focus:shadow-[0_0_0_4px_rgba(123,255,175,0.12)]"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/4 px-5 py-2.5 text-[13px] font-semibold text-white/85 transition-colors hover:bg-white/10"
                    onClick={handleReset}
                  >
                    <TimerReset size={15} />
                    다시 입력
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[#04130a] transition-transform hover:-translate-y-px"
                    onClick={handleNextPassage}
                  >
                    <RefreshCcw size={15} />
                    다음 문장
                  </button>
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
                  목표 {activePassage.targetSeconds}s
                </span>
              </div>
            </div>

            <aside className="grid gap-3">
              {[
                { label: "Progress", value: `${progress}`, suffix: "%" },
                { label: "Accuracy", value: `${accuracy}`, suffix: "%" },
                { label: "Speed", value: `${typingSpeed}`, suffix: "wpm" },
                {
                  label: "Elapsed",
                  value: elapsedSeconds.toFixed(1),
                  suffix: "s",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-baseline justify-between rounded-[22px] border border-white/8 bg-white/[0.035] px-5 py-5"
                >
                  <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-white/55">
                    {item.label}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-['Outfit',sans-serif] text-[34px] font-black leading-none tracking-[-0.05em] text-white">
                      {item.value}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-white/45">
                      {item.suffix}
                    </span>
                  </div>
                </div>
              ))}

              <div
                className={`grid gap-2 rounded-[22px] border p-5 transition-colors ${
                  completed
                    ? "border-[#7bffaf]/40 bg-[#7bffaf]/10"
                    : "border-white/8 bg-white/[0.035]"
                }`}
              >
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#7bffaf]">
                  {completed ? "Lap Complete" : "In Session"}
                </span>
                <p className="m-0 text-[13px] leading-[1.7] text-white/70">
                  {completed
                    ? "완주했습니다. 다음 문장으로 리듬을 이어가세요."
                    : "눈은 다음 단어를, 손은 한 박자 뒤를 치면 정확도가 안정됩니다."}
                </p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section
        id="faq"
        className="relative border-t border-white/6 bg-[#050c15]"
      >
        <div className="mx-auto grid max-w-[1240px] gap-8 px-5 py-14 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] md:px-10 md:py-20">
          <div className="grid content-start gap-4">
            <p className="m-0 font-mono text-[11px] uppercase tracking-[0.3em] text-[#7bffaf]">
              FAQ
            </p>
            <h2 className="m-0 font-['Outfit',sans-serif] text-[clamp(32px,5vw,52px)] font-black tracking-[-0.05em] text-white">
              출발 전<br />
              자주 묻는 질문
            </h2>
            <p className="m-0 max-w-[36ch] text-[14px] leading-[1.7] text-white/55">
              처음 들어온 러너도 망설이지 않도록, 핵심 질문에 미리 답해
              두었습니다.
            </p>
          </div>

          <div className="grid gap-3">
            {TYPING_FAQS.map((faq, index) => (
              <details
                key={faq.question}
                className="group rounded-[20px] border border-white/8 bg-white/[0.035] px-5 py-4 transition-colors open:border-[#7bffaf]/30 open:bg-white/[0.05]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold tracking-[-0.01em] text-white">
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-[11px] text-[#7bffaf]">
                      Q{String(index + 1).padStart(2, "0")}
                    </span>
                    {faq.question}
                  </span>
                  <ChevronRight
                    size={16}
                    className="text-white/40 transition-transform duration-200 group-open:rotate-90 group-open:text-[#7bffaf]"
                  />
                </summary>
                <p className="m-0 mt-3 border-t border-white/6 pt-3 text-[14px] leading-[1.8] text-white/65">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
