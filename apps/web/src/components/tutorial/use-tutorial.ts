"use client";

import { useState, useEffect } from "react";

const STORAGE_KEYS = {
  home: "yeon_tutorial_home_done",
  student: "yeon_tutorial_student_done",
} as const;

export function useTutorial(key: keyof typeof STORAGE_KEYS) {
  const storageKey = STORAGE_KEYS[key];
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      // 짧은 딜레이 후 시작 — 페이지 렌더 완료 후 타겟 요소가 DOM에 있어야 함
      const timer = setTimeout(() => setRun(true), 800);
      return () => clearTimeout(timer);
    }
  }, [storageKey]);

  const finish = () => {
    localStorage.setItem(storageKey, "1");
    setRun(false);
  };

  const restart = () => setRun(true);

  return { run, finish, restart };
}
