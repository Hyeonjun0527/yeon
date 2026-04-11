"use client";

import { useEffect, useRef, useState } from "react";
import styles from "../../mockdata.module.css";

const TOTAL_SECONDS = 154; // 2분 34초

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer() {
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= TOTAL_SECONDS) {
            setIsPlaying(false);
            return TOTAL_SECONDS;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying]);

  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return;
    const ratio = (e.clientX - rect.left) / rect.width;
    setCurrentTime(Math.round(ratio * TOTAL_SECONDS));
  }

  return (
    <div className={styles.audioPlayer}>
      <button
        className={styles.playBtn}
        onClick={() => setIsPlaying((p) => !p)}
      >
        {isPlaying ? "⏸" : "▶"}
      </button>
      <span className={styles.audioTime}>{fmtTime(currentTime)}</span>
      <div
        ref={trackRef}
        className={`${styles.audioTrack} ${styles.audioTrackInteractive}`}
        onClick={handleTrackClick}
      >
        <div
          className={styles.audioTrackFill}
          style={{ width: `${(currentTime / TOTAL_SECONDS) * 100}%` }}
        />
      </div>
      <span className={styles.audioTime}>{fmtTime(TOTAL_SECONDS)}</span>
    </div>
  );
}
