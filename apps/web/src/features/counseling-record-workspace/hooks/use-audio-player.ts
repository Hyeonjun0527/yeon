import { useEffect, useRef, useState } from "react";

export function useAudioPlayer(
  selectedRecordId: string | null,
  audioUrl: string | null | undefined,
) {
  const [currentAudioTimeMs, setCurrentAudioTimeMs] = useState<number | null>(
    null,
  );
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // 42차: 키보드 spacebar 재생/정지
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT" ||
        target.isContentEditable;

      if (isInput) {
        return;
      }

      if (event.key === " " && audioPlayerRef.current) {
        event.preventDefault();
        if (audioPlayerRef.current.paused) {
          audioPlayerRef.current.play();
        } else {
          audioPlayerRef.current.pause();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // 레코드/오디오 URL 변경 시 시간 리셋
  useEffect(() => {
    setCurrentAudioTimeMs(null);
    setAudioLoadError(null);

    return () => {
      audioPlayerRef.current?.pause();
    };
  }, [selectedRecordId, audioUrl]);

  function handleAudioTimeUpdate() {
    const player = audioPlayerRef.current;

    if (!player) {
      return;
    }

    setCurrentAudioTimeMs(Math.max(Math.round(player.currentTime * 1000), 0));
  }

  function seekAudioToTime(startMs: number | null) {
    const player = audioPlayerRef.current;

    if (!player || startMs === null) {
      return;
    }

    player.currentTime = Math.max(startMs, 0) / 1000;
    setCurrentAudioTimeMs(Math.max(startMs, 0));
  }

  return {
    currentAudioTimeMs,
    audioLoadError,
    setAudioLoadError,
    isAutoScrollEnabled,
    setIsAutoScrollEnabled,
    audioPlayerRef,
    handleAudioTimeUpdate,
    seekAudioToTime,
  };
}
