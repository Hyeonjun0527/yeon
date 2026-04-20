"use client";

import { useTypingProfile } from "./use-typing-profile";
import { TypingProfileCard } from "./typing-profile-card";

export function TypingServiceHome() {
  const { profile, updateProfile, loaded } = useTypingProfile();

  return (
    <div className="min-h-screen bg-white text-[#111]">
      <header className="border-b border-[#e5e5e5] px-6 py-3 md:px-12">
        <span className="text-[14px] font-semibold text-[#111]">타자연습</span>
      </header>

      <main className="flex flex-col items-center px-6 py-16 md:py-24">
        {loaded && (
          <>
            <TypingProfileCard
              profile={profile}
              onNicknameChange={(nickname) => updateProfile({ nickname })}
              onCharacterChange={(characterId) => updateProfile({ characterId })}
            />

            <a
              href="/typing-service/play"
              className="mt-5 inline-flex w-[340px] items-center justify-center rounded-xl bg-[#111] py-4 text-[15px] font-semibold text-white no-underline transition-colors hover:bg-[#333]"
            >
              레이스 입장
            </a>
          </>
        )}
      </main>
    </div>
  );
}
