import { useState, useRef, useCallback, useEffect } from "react";

export function useAudioPlayer(audioUrl: string | null, fallbackTotalSeconds: number) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(fallbackTotalSeconds);

  // fallbackTotalSeconds가 바뀌면 (레코드 선택 변경) duration 동기화
  useEffect(() => {
    if (!audioRef.current || !isFinite(audioRef.current.duration)) {
      setDuration(fallbackTotalSeconds);
    }
  }, [fallbackTotalSeconds]);

  // audioUrl 변경 시 audio element 재생성
  useEffect(() => {
    // 이전 audio 정리
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setPosition(0);
    setIsPlaying(false);

    if (!audioUrl) {
      setDuration(fallbackTotalSeconds);
      return;
    }

    const audio = new Audio(audioUrl);
    audioRef.current = audio;

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration)) {
        setDuration(Math.round(audio.duration));
      }
    };
    const onTimeUpdate = () => {
      setPosition(Math.round(audio.currentTime));
    };
    const onEnded = () => {
      setIsPlaying(false);
      setPosition(0);
    };

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
      audio.src = "";
    };
  }, [audioUrl, fallbackTotalSeconds]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => {
        // 자동 재생 차단 등 무시
      });
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = pct * (isFinite(audio.duration) ? audio.duration : duration);
    audio.currentTime = target;
    setPosition(Math.round(target));
  }, [duration]);

  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPosition(0);
    setIsPlaying(false);
  }, []);

  return {
    isPlaying,
    position,
    totalSeconds: duration,
    toggle,
    seek,
    reset,
  };
}
