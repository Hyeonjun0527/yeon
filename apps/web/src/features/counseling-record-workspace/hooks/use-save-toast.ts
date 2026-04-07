import { useEffect, useState } from "react";

export function useSaveToast() {
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);

  // 32차: 저장 toast 자동 해제
  useEffect(() => {
    if (!saveToast) {
      return;
    }

    const timer = setTimeout(() => setSaveToast(null), 3000);

    return () => clearTimeout(timer);
  }, [saveToast]);

  // 32차: 최근 저장 하이라이트 자동 해제
  useEffect(() => {
    if (!recentlySavedId) {
      return;
    }

    const timer = setTimeout(() => setRecentlySavedId(null), 2000);

    return () => clearTimeout(timer);
  }, [recentlySavedId]);

  return { saveToast, setSaveToast, recentlySavedId, setRecentlySavedId };
}
