"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { RefreshCcw, SkipForward } from "lucide-react";
import {
  TYPING_DIFFICULTY_LABELS,
  TYPING_FAQS,
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
  const currentIndex = passages.findIndex((p) => p.id === currentPassageId);
  if (currentIndex === -1 || currentIndex === passages.length - 1) {
    return passages[0];
  }
  return passages[currentIndex + 1];
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
    difficultyPassages.find((p) => p.id === activePassageId) ??
    difficultyPassages[0];
  const promptChars = useMemo(
    () => Array.from(activePassage.prompt),
    [activePassage.prompt],
  );
  const inputChars = useMemo(() => Array.from(input), [input]);

  useEffect(() => {
    setActivePassageId(difficultyPassages[0]?.id ?? "");
    setInput("");
    setStartedAt(null);
    setElapsedSeconds(0);
  }, [difficulty, difficultyPassages]);

  useEffect(() => {
    setInput("");
    setStartedAt(null);
    setElapsedSeconds(0);
  }, [activePassageId]);

  useEffect(() => {
    if (!startedAt) return;
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
    textareaRef.current?.focus();
  };

  return (
    <div className="min-h-screen bg-white text-[#111]">
      {/* 헤더 */}
      <header className="border-b border-[#e5e5e5] px-6 py-3 md:px-12">
        <div className="mx-auto flex max-w-[860px] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-[14px] font-semibold text-[#111]">
              타자연습
            </span>
            <div className="flex gap-1">
              {(Object.keys(TYPING_DIFFICULTY_LABELS) as TypingDifficulty[]).map(
                (item) => (
                  <button
                    key={item}
                    type="button"
                    aria-pressed={difficulty === item}
                    className={`rounded px-3 py-1 text-[12px] font-medium transition-colors ${
                      difficulty === item
                        ? "bg-[#111] text-white"
                        : "text-[#888] hover:text-[#111]"
                    }`}
                    onClick={() => setDifficulty(item)}
                  >
                    {TYPING_DIFFICULTY_LABELS[item]}
                  </button>
                ),
              )}
            </div>
          </div>
          <a
            href="/typing-service/play"
            className="rounded border border-[#e5e5e5] px-4 py-1.5 text-[12px] font-medium text-[#111] no-underline transition-colors hover:border-[#111]"
          >
            레이스 입장
          </a>
        </div>
      </header>

      {/* 타자 영역 */}
      <main className="mx-auto max-w-[860px] px-6 py-10 md:px-12 md:py-16">
        {/* 문장 제목 */}
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <div>
            <span className="text-[12px] text-[#aaa]">
              {activePassage.description}
            </span>
            <h2 className="mt-0.5 text-[15px] font-semibold text-[#111]">
              {activePassage.title}
            </h2>
          </div>
          <span className="shrink-0 text-[12px] text-[#aaa]">
            목표 {activePassage.targetSeconds}s
          </span>
        </div>

        {/* 프롬프트 */}
        <div className="mb-4 rounded-lg border border-[#e5e5e5] bg-[#fafafa] px-6 py-5 font-mono text-[19px] leading-[2] tracking-[0.01em]">
          {promptChars.map((char, index) => {
            const typed = inputChars[index];
            const isCurrent = index === inputChars.length;
            const isMismatch = mismatches.includes(index);
            const isMatched = typed === char;

            return (
              <span
                key={`${activePassage.id}-${index}`}
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

        {/* 입력창 */}
        <textarea
          ref={textareaRef}
          value={input}
          maxLength={promptChars.length}
          aria-label={`${activePassage.title} 타자 입력 영역`}
          onChange={(e) => {
            if (!startedAt && e.target.value.length > 0) {
              setStartedAt(Date.now());
            }
            setInput(
              Array.from(e.target.value).slice(0, promptChars.length).join(""),
            );
          }}
          spellCheck={false}
          placeholder="여기에 입력하세요"
          className="mb-4 w-full resize-none rounded-lg border border-[#e5e5e5] bg-white px-5 py-4 font-mono text-[16px] leading-[1.7] text-[#111] outline-none transition-colors placeholder:text-[#ccc] focus:border-[#111]"
          rows={3}
        />

        {/* 하단 바 */}
        <div className="flex items-center justify-between gap-4">
          {/* 통계 */}
          <div className="flex gap-5 font-mono text-[13px] text-[#888]">
            <span>
              <span className="font-semibold text-[#111]">{typingSpeed}</span>{" "}
              wpm
            </span>
            <span>
              <span className="font-semibold text-[#111]">{accuracy}</span>%
            </span>
            <span>
              <span className="font-semibold text-[#111]">{progress}</span>%
            </span>
            <span className="hidden md:inline">
              <span className="font-semibold text-[#111]">
                {elapsedSeconds.toFixed(1)}
              </span>
              s
            </span>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded border border-[#e5e5e5] px-3 py-1.5 text-[12px] font-medium text-[#555] transition-colors hover:border-[#aaa]"
              onClick={handleReset}
            >
              <RefreshCcw size={13} />
              다시
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded border border-[#e5e5e5] px-3 py-1.5 text-[12px] font-medium text-[#555] transition-colors hover:border-[#aaa]"
              onClick={handleNextPassage}
            >
              <SkipForward size={13} />
              다음
            </button>
          </div>
        </div>

        {completed && (
          <div className="mt-6 rounded-lg border border-[#e5e5e5] px-5 py-4 text-[14px] text-[#555]">
            완주했습니다.{" "}
            <button
              type="button"
              className="font-semibold text-[#111] underline"
              onClick={handleNextPassage}
            >
              다음 문장
            </button>
            으로 이어가거나{" "}
            <a href="/typing-service/play" className="font-semibold text-[#111] underline">
              레이스에 입장
            </a>
            하세요.
          </div>
        )}
      </main>

      {/* FAQ */}
      <section className="border-t border-[#e5e5e5] px-6 py-10 md:px-12 md:py-14">
        <div className="mx-auto max-w-[860px]">
          <h2 className="mb-6 text-[14px] font-semibold text-[#111]">FAQ</h2>
          <div className="grid gap-2">
            {TYPING_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="group rounded-lg border border-[#e5e5e5] px-5 py-3"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[14px] font-medium text-[#111]">
                  {faq.question}
                  <span className="text-[#aaa] transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 border-t border-[#f0f0f0] pt-3 text-[13px] leading-[1.8] text-[#666]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
