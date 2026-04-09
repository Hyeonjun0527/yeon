import { useState, useRef, useCallback, useEffect } from "react";
import { TOTAL_AUDIO_SECONDS } from "../../mockdata/app/_data/mock-data";

export function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggle = useCallback(() => {
    if (isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      timerRef.current = setInterval(() => {
        setPosition((p) => {
          if (p >= TOTAL_AUDIO_SECONDS) {
            if (timerRef.current) clearInterval(timerRef.current);
            setIsPlaying(false);
            return 0;
          }
          return p + 1;
        });
      }, 1000);
    }
  }, [isPlaying]);

  const seek = useCallback((pct: number) => {
    setPosition(Math.floor(pct * TOTAL_AUDIO_SECONDS));
  }, []);

  const reset = useCallback(() => {
    setPosition(0);
    setIsPlaying(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return {
    isPlaying,
    position,
    totalSeconds: TOTAL_AUDIO_SECONDS,
    toggle,
    seek,
    reset,
  };
}
