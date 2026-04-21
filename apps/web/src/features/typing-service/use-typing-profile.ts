"use client";

import { useCallback, useEffect, useState } from "react";

export type TypingProfile = {
  nickname: string;
  characterId: string;
};

const STORAGE_KEY = "yeon:typing-profile";
const DEFAULT_PROFILE: TypingProfile = { nickname: "Guest", characterId: "camel" };

export function useTypingProfile() {
  const [profile, setProfile] = useState<TypingProfile>(DEFAULT_PROFILE);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setProfile(JSON.parse(raw) as TypingProfile);
    } catch {
      // localStorage 접근 불가 환경 무시
    }
    setLoaded(true);
  }, []);

  const updateProfile = useCallback((updates: Partial<TypingProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...updates };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { profile, updateProfile, loaded };
}
