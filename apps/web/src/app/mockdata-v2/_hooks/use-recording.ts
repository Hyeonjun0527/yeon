import { useState, useRef, useCallback } from "react";
import type { RecordItem } from "../_lib/types";
import { fmtDuration, createTimestamp } from "../_lib/utils";

interface UseRecordingParams {
  onRecordingStop: (record: RecordItem) => void;
}

export function useRecording({ onRecordingStop }: UseRecordingParams) {
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed((p) => p + 1);
    }, 1000);
  }, []);

  const stop = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;

    const record: RecordItem = {
      id: `rec-${Date.now()}`,
      title: `녹음 ${createTimestamp()}`,
      status: "processing",
      meta: "",
      duration: fmtDuration(elapsed),
      studentName: "",
      type: "",
      transcript: [],
      aiSummary: "",
      aiMessages: [],
    };

    onRecordingStop(record);
  }, [elapsed, onRecordingStop]);

  return { elapsed, start, stop };
}
