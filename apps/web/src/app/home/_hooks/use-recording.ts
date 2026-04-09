"use client";

import { useState, useRef, useCallback } from "react";
import type { CounselingRecordDetail } from "@yeon/api-contract/counseling-records";
import type { RecordItem } from "../_lib/types";
import { fmtDuration, fmtDurationMs, createTimestamp } from "../_lib/utils";

interface UseRecordingParams {
  onRecordingStop: (record: RecordItem) => void;
}

export function useRecording({ onRecordingStop }: UseRecordingParams) {
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const elapsedRef = useRef(0);

  const start = useCallback(async () => {
    setError(null);
    setElapsed(0);
    elapsedRef.current = 0;
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("마이크 접근 권한이 필요합니다.");
      return;
    }

    streamRef.current = stream;
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      // 스트림 트랙 종료
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const durationMs = elapsedRef.current * 1000;

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("audio", blob, `녹음_${createTimestamp()}.webm`);
        formData.append("sessionTitle", `녹음 ${createTimestamp()}`);
        formData.append("studentName", "");
        formData.append("counselingType", "");
        formData.append("audioDurationMs", String(durationMs));

        const res = await fetch("/api/v1/counseling-records", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "업로드에 실패했습니다.");
        }

        const data = (await res.json()) as { record: CounselingRecordDetail };
        const item = data.record;

        const record: RecordItem = {
          id: item.id,
          title: item.sessionTitle || `녹음 ${createTimestamp()}`,
          status: "processing",
          meta: "",
          duration: fmtDurationMs(item.audioDurationMs) || fmtDuration(elapsedRef.current),
          studentName: item.studentName || "",
          type: item.counselingType || "",
          transcript: [],
          aiSummary: "",
          aiMessages: [],
        };

        onRecordingStop(record);
      } catch (err) {
        setError(err instanceof Error ? err.message : "업로드에 실패했습니다.");
      } finally {
        setUploading(false);
      }
    };

    recorder.start();

    timerRef.current = setInterval(() => {
      setElapsed((p) => {
        elapsedRef.current = p + 1;
        return p + 1;
      });
    }, 1000);
  }, [onRecordingStop]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
  }, []);

  return { elapsed, uploading, error, start, stop };
}
