"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, RefreshCcw, TimerReset, Trophy, Zap } from "lucide-react";
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,214,10,0.24),_transparent_28%),linear-gradient(180deg,_#fff8ef_0%,_#fffdf8_40%,_#f7f3ea_100%)] text-[#19140e]">
      <section className="mx-auto grid max-w-[1200px] gap-8 px-5 pb-10 pt-8 md:px-10 md:pb-16 md:pt-14">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px] md:items-end">
          <div className="grid gap-4">
            <p className="m-0 inline-flex w-fit items-center rounded-full border border-[#d8b657] bg-[#fff1c9] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8e6500]">
              typing-service
            </p>
            <div className="grid gap-3">
              <h1 className="m-0 max-w-[10ch] font-['Outfit',sans-serif] text-[clamp(38px,9vw,88px)] font-black leading-[0.96] tracking-[-0.06em] text-[#1b130b]">
                로그인 없이
                <br />
                바로 치는
                <br />
                타자연습
              </h1>
              <p className="m-0 max-w-[48ch] text-[15px] leading-[1.8] text-[#5e4b35] md:text-[17px]">
                첫 유입에서도 바로 플레이할 수 있게 만들었습니다. 짧은 문장,
                몰입형 문단, 속도 스프린트를 번갈아 연습하면서 정확도와 리듬을
                함께 확인하세요.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <a
                href="/typing-service/play"
                className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] bg-[#17110c] px-6 text-[15px] font-bold text-white no-underline shadow-[0_18px_42px_rgba(23,17,12,0.22)] transition-transform duration-200 hover:-translate-y-px"
              >
                출발선 입장하기
              </a>
              <a
                href="#faq"
                className="inline-flex min-h-[54px] items-center justify-center rounded-[18px] border border-[#d8c7a8] bg-white/70 px-6 text-[15px] font-semibold text-[#3d2f21] no-underline transition-colors duration-200 hover:bg-white"
              >
                자주 묻는 질문
              </a>
            </div>
          </div>

          <aside className="grid gap-3 rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-[0_18px_40px_rgba(88,66,24,0.08)] backdrop-blur">
            <div className="flex items-center gap-2 text-[#8e6500]">
              <Keyboard size={18} />
              <span className="text-[12px] font-semibold uppercase tracking-[0.18em]">
                seo-first service
              </span>
            </div>
            <h2 className="m-0 text-[22px] font-bold tracking-[-0.03em]">
              검색 유입 후 바로 플레이까지
            </h2>
            <ul className="m-0 grid gap-2 pl-5 text-[14px] leading-[1.7] text-[#5e4b35]">
              <li>익명 진입 가능</li>
              <li>랜딩과 플레이 경로를 분리하되 같은 도메인에서 유지</li>
              <li>10초 카운트다운과 lane 기반 레이스 프리뷰 제공</li>
              <li>타수, 정확도, 진행률 실시간 피드백</li>
              <li>FAQ와 metadata로 검색 의도 대응</li>
            </ul>
          </aside>
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            { label: "진입 방식", value: "익명 시작" },
            { label: "플레이 구조", value: "랜딩 + play" },
            { label: "실시간 지표", value: "타수 · 정확도" },
            { label: "레이스 톤", value: "10초 카운트다운" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-white/65 bg-white/64 px-4 py-4 shadow-[0_12px_28px_rgba(88,66,24,0.06)]"
            >
              <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8e6500]">
                {item.label}
              </div>
              <div className="mt-2 font-['Outfit',sans-serif] text-[26px] font-bold tracking-[-0.04em] text-[#1b130b]">
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section
        id="practice"
        className="border-y border-[#eadcc1] bg-[rgba(255,255,255,0.72)]"
      >
        <div className="mx-auto grid max-w-[1200px] gap-6 px-5 py-8 md:px-10 md:py-12">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8e6500]">
                practice now
              </p>
              <h2 className="m-0 mt-2 text-[30px] font-black tracking-[-0.04em] text-[#1b130b]">
                바로 타이핑해 보세요
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {(
                Object.keys(TYPING_DIFFICULTY_LABELS) as TypingDifficulty[]
              ).map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`rounded-full px-4 py-2 text-[13px] font-semibold transition-colors ${
                    difficulty === item
                      ? "bg-[#1b130b] text-white"
                      : "bg-[#f2e4c5] text-[#6a5131] hover:bg-[#ead5a8]"
                  }`}
                  onClick={() => setDifficulty(item)}
                >
                  {TYPING_DIFFICULTY_LABELS[item]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
            <div className="grid gap-5 rounded-[30px] border border-[#eadcc1] bg-[#fffdfa] p-5 shadow-[0_18px_42px_rgba(88,66,24,0.08)] md:p-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8e6500]">
                    {activePassage.description}
                  </p>
                  <h3 className="m-0 mt-2 text-[22px] font-bold tracking-[-0.03em] text-[#1b130b]">
                    {activePassage.title}
                  </h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activePassage.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[#f7edd6] px-3 py-1 text-[12px] font-medium text-[#7b6036]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-[24px] border border-[#e8d5ad] bg-[#fff5df] p-5 text-[19px] leading-[1.9] tracking-[-0.01em] text-[#1f160d]">
                {promptChars.map((char, index) => {
                  const typed = inputChars[index];
                  const isCurrent = index === inputChars.length;
                  const isMismatch = mismatches.includes(index);
                  const isMatched = typed === char;

                  return (
                    <span
                      key={`${activePassage.id}-${index}`}
                      className={`rounded-[6px] ${
                        isMismatch
                          ? "bg-[#ffd8c8] text-[#b63b00]"
                          : isMatched
                            ? "text-[#1f160d]"
                            : isCurrent
                              ? "bg-[#1b130b] text-white"
                              : "text-[#8a7350]"
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
                className="min-h-[200px] rounded-[24px] border border-[#d9c6a0] bg-white px-5 py-4 text-[16px] leading-[1.7] text-[#1b130b] outline-none ring-0 transition-colors placeholder:text-[#a18a62] focus:border-[#8e6500]"
              />

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-[16px] border border-[#d7c5a3] bg-white px-4 py-3 text-[14px] font-semibold text-[#3d2f21] transition-colors hover:bg-[#fff8e9]"
                  onClick={handleReset}
                >
                  <TimerReset size={16} />
                  다시 입력
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-[16px] bg-[#1b130b] px-4 py-3 text-[14px] font-semibold text-white transition-transform hover:-translate-y-px"
                  onClick={handleNextPassage}
                >
                  <RefreshCcw size={16} />
                  다음 문장
                </button>
              </div>
            </div>

            <aside className="grid gap-4">
              <div className="grid gap-3 rounded-[28px] border border-[#eadcc1] bg-[#fffdfa] p-5 shadow-[0_18px_42px_rgba(88,66,24,0.08)]">
                <div className="flex items-center gap-2 text-[#8e6500]">
                  <Zap size={18} />
                  <span className="text-[12px] font-semibold uppercase tracking-[0.16em]">
                    live stats
                  </span>
                </div>
                <div className="grid gap-3">
                  {[
                    { label: "진행률", value: `${progress}%` },
                    { label: "정확도", value: `${accuracy}%` },
                    { label: "타수", value: `${typingSpeed}` },
                    {
                      label: "경과 시간",
                      value: `${elapsedSeconds.toFixed(1)}초`,
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[20px] border border-[#f0e5cf] bg-[#fff5df] px-4 py-4"
                    >
                      <div className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[#8e6500]">
                        {item.label}
                      </div>
                      <div className="mt-1 font-['Outfit',sans-serif] text-[28px] font-bold tracking-[-0.05em] text-[#1b130b]">
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 rounded-[28px] border border-[#eadcc1] bg-[#1b130b] p-5 text-white shadow-[0_18px_42px_rgba(23,17,12,0.22)]">
                <div className="flex items-center gap-2 text-[#f9cf6e]">
                  <Trophy size={18} />
                  <span className="text-[12px] font-semibold uppercase tracking-[0.16em]">
                    session result
                  </span>
                </div>
                <h3 className="m-0 text-[22px] font-bold tracking-[-0.03em]">
                  {completed ? "문장을 완주했습니다" : "지금은 워밍업 단계"}
                </h3>
                <p className="m-0 text-[14px] leading-[1.75] text-white/72">
                  {completed
                    ? "완료 직후 다른 난이도로 넘어가거나 다음 문장을 이어서 치면서 리듬을 유지하세요."
                    : "시선이 다음 단어를 먼저 읽게 하고, 손은 한 박자 늦게 따라오게 하면 정확도가 안정됩니다."}
                </p>
                <div className="h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[#f9cf6e] transition-[width] duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-[13px] leading-[1.7] text-white/68">
                  추천 목표 시간: {activePassage.targetSeconds}초 안에 오타 없이
                  끝내기
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1200px] gap-10 px-5 py-12 md:px-10 md:py-16">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              title: "검색 의도에 맞는 공개 랜딩",
              description:
                "타자연습, 한글 타자연습, 무료 타자연습처럼 명확한 검색어에 맞춰 서비스 설명과 실제 사용 화면을 한 페이지 안에 함께 제공합니다.",
            },
            {
              title: "즉시 사용 가능한 바이럴 구조",
              description:
                "로그인 장벽 없이 바로 시작하고, 이후 기록 저장이나 랭킹은 나중 차수에서 별도로 올릴 수 있게 익명 우선 구조를 유지합니다.",
            },
            {
              title: "장기 확장 가능한 정보 구조",
              description:
                "추후 `/typing-service/play`, `/typing-service/rankings`, `/typing-service/texts/<slug>`로 확장할 수 있게 메인 경로를 브랜드 허브로 잡았습니다.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-[28px] border border-white/70 bg-white/72 p-5 shadow-[0_18px_42px_rgba(88,66,24,0.08)]"
            >
              <h2 className="m-0 text-[22px] font-bold tracking-[-0.03em] text-[#1b130b]">
                {item.title}
              </h2>
              <p className="m-0 mt-3 text-[14px] leading-[1.75] text-[#5e4b35]">
                {item.description}
              </p>
            </article>
          ))}
        </div>

        <section
          id="faq"
          className="grid gap-4 rounded-[32px] border border-[#eadcc1] bg-white/78 p-6 shadow-[0_18px_42px_rgba(88,66,24,0.08)] md:p-8"
        >
          <div>
            <p className="m-0 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#8e6500]">
              faq
            </p>
            <h2 className="m-0 mt-2 text-[32px] font-black tracking-[-0.04em] text-[#1b130b]">
              자주 묻는 질문
            </h2>
          </div>

          <div className="grid gap-3">
            {TYPING_FAQS.map((faq) => (
              <details
                key={faq.question}
                className="rounded-[22px] border border-[#eadcc1] bg-[#fffaf0] px-5 py-4"
              >
                <summary className="cursor-pointer list-none text-[16px] font-bold tracking-[-0.02em] text-[#1b130b]">
                  {faq.question}
                </summary>
                <p className="m-0 mt-3 text-[14px] leading-[1.8] text-[#5e4b35]">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
