"use client";

import { useEffect, useRef, useState } from "react";
import type { TypingProfile } from "./use-typing-profile";
import { createTranslator, type TypingLocale } from "./use-typing-settings";

export const TYPING_CHARACTERS = [
  { id: "camel", labelKey: "characterCamel" as const, sprite: "/sprites/camel-run.png" },
] as const;

const FRAME_SIZE = 96; // original sprite frame px
const FRAME_COUNT = 6;
const FRAME_COLS = 2;

function CharacterSprite({ sprite, displaySize }: { sprite: string; displaySize: number }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % FRAME_COUNT), 100);
    return () => clearInterval(id);
  }, []);

  const col = frame % FRAME_COLS;
  const row = Math.floor(frame / FRAME_COLS);
  const scale = displaySize / FRAME_SIZE;

  return (
    <div
      style={{
        width: displaySize,
        height: displaySize,
        backgroundImage: `url('${sprite}')`,
        backgroundSize: `${FRAME_SIZE * FRAME_COLS * scale}px ${FRAME_SIZE * (FRAME_COUNT / FRAME_COLS) * scale}px`,
        backgroundPosition: `-${col * displaySize}px -${row * displaySize}px`,
        imageRendering: "pixelated",
        flexShrink: 0,
      }}
    />
  );
}

type TypingProfileCardProps = {
  profile: TypingProfile;
  onNicknameChange: (nickname: string) => void;
  onCharacterChange: (characterId: string) => void;
  locale: TypingLocale;
};

export function TypingProfileCard({
  profile,
  onNicknameChange,
  onCharacterChange,
  locale,
}: TypingProfileCardProps) {
  const t = createTranslator(locale);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(profile.nickname);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(profile.nickname);
  }, [profile.nickname]);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const submitNickname = () => {
    const trimmed = draft.trim();
    onNicknameChange(trimmed || profile.nickname);
    setDraft(trimmed || profile.nickname);
    setIsEditing(false);
  };

  const selectedChar =
    TYPING_CHARACTERS.find((c) => c.id === profile.characterId) ?? TYPING_CHARACTERS[0];

  return (
    <div className="flex w-[340px] flex-col items-center rounded-2xl border border-[#e5e5e5] bg-white px-10 py-8">
      {/* 캐릭터 애니메이션 */}
      <div className="mb-6 flex items-center justify-center rounded-xl bg-[#f5f5f5] p-5">
        <CharacterSprite sprite={selectedChar.sprite} displaySize={160} />
      </div>

      {/* 닉네임 */}
      <div className="mb-5 flex items-center gap-2">
        {isEditing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={submitNickname}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitNickname();
              if (e.key === "Escape") {
                setDraft(profile.nickname);
                setIsEditing(false);
              }
            }}
            maxLength={20}
            className="w-44 border-b border-[#111] bg-transparent text-center text-[20px] font-semibold text-[#111] outline-none"
          />
        ) : (
          <button
            type="button"
            className="flex items-center gap-1.5 text-[20px] font-semibold text-[#111] hover:text-[#555]"
            onClick={() => setIsEditing(true)}
          >
            {profile.nickname}
            <span className="text-[13px] font-normal text-[#bbb]">✎</span>
          </button>
        )}
      </div>

      {/* 캐릭터 선택 */}
      <div className="flex flex-wrap justify-center gap-2">
        {TYPING_CHARACTERS.map((char) => (
          <button
            key={char.id}
            type="button"
            onClick={() => onCharacterChange(char.id)}
            className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium transition-colors ${
              profile.characterId === char.id
                ? "border-[#111] bg-[#111] text-white"
                : "border-[#e5e5e5] text-[#555] hover:border-[#aaa]"
            }`}
          >
            {t(char.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
