"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const STORAGE_KEYS = {
  home: "yeon_tutorial_home_done",
  student: "yeon_tutorial_student_done",
  "check-board": "yeon_tutorial_check_board_done",
} as const;

export function useTutorial(key: keyof typeof STORAGE_KEYS) {
  const storageKey = STORAGE_KEYS[key];
  const [run, setRun] = useState(false);
  const eventName = useMemo(() => `yeon:tutorial:${key}:start`, [key]);

  useEffect(() => {
    const handleStart = () => {
      window.setTimeout(() => setRun(true), 80);
    };

    window.addEventListener(eventName, handleStart);
    return () => window.removeEventListener(eventName, handleStart);
  }, [eventName]);

  const finish = useCallback(() => {
    localStorage.setItem(storageKey, "1");
    setRun(false);
  }, [storageKey]);

  const restart = useCallback(() => {
    window.dispatchEvent(new CustomEvent(eventName));
  }, [eventName]);

  return { run, finish, restart };
}
