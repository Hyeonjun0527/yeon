"use client";

import { useState, useRef, useCallback } from "react";
import type { CounselingRecordDetail } from "@yeon/api-contract/counseling-records";
import type { RecordItem } from "../_lib/types";
import { fmtDuration, fmtDurationMs, createTimestamp } from "../_lib/utils";

interface UseRecordingParams {
  /** 녹음 중단 즉시 호출 — 임시 레코드로 processing 상태로 즉시 전환 */
  onRecordingStop: (tempRecord: RecordItem) => void;
  /** 업로드 완료 후 임시 레코드를 실제 서버 레코드로 교체 */
  onUploadComplete: (tempId: string, realRecord: RecordItem) => void;
  /** 업로드 실패 시 임시 레코드 제거 */
  onUploadError: (tempId: string, message: string) => void;
  getDefaultRecordContext?: () => {
    memberId: string | null;
    studentName: string;
  };
}

export function useRecording({
  onRecordingStop,
  onUploadComplete,
  onUploadError,
  getDefaultRecordContext,
}: UseRecordingParams) {
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedRef = useRef(0);
  const tempIdRef = useRef<string>("");

  const resetRecorderState = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;

      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    elapsedRef.current = 0;
    tempIdRef.current = "";
    setElapsed(0);
    setUploading(false);
  }, []);

  const start = useCallback(async () => {
    // 이미 녹음 중이면 스트림 누수를 막기 위해 중복 호출 차단
    if (mediaRecorderRef.current) return;

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
      stream.getTracks().forEach((t) => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const tempId = tempIdRef.current;

      setUploading(true);
      try {
        const context = getDefaultRecordContext?.() ?? {
          memberId: null,
          studentName: "",
        };
        const formData = new FormData();
        formData.append("audio", blob, `녹음_${createTimestamp()}.webm`);
        formData.append("sessionTitle", `녹음 ${createTimestamp()}`);
        formData.append("studentName", context.studentName);
        formData.append("counselingType", "");
        if (context.memberId) {
          formData.append("memberId", context.memberId);
        }
        formData.append("audioDurationMs", String(elapsedRef.current * 1000));

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

        const realRecord: RecordItem = {
          id: item.id,
          spaceId: item.spaceId,
          createdAt: item.createdAt,
          title: item.sessionTitle || `녹음 ${createTimestamp()}`,
          status: "processing",
          errorMessage: null,
          meta: "",
          duration:
            fmtDurationMs(item.audioDurationMs) ||
            fmtDuration(elapsedRef.current),
          durationMs: item.audioDurationMs ?? elapsedRef.current * 1000,
          studentName: item.studentName || context.studentName,
          type: item.counselingType || "",
          audioUrl: null,
          transcript: [],
          aiSummary: "",
          aiMessages: [],
          analysisResult: null,
          memberId: item.memberId ?? context.memberId,
          processingStage: item.processingStage,
          processingProgress: item.processingProgress,
          processingMessage: item.processingMessage,
          analysisStatus: item.analysisStatus,
          analysisProgress: item.analysisProgress,
        };

        onUploadComplete(tempId, realRecord);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "업로드에 실패했습니다.";
        setError(msg);
        onUploadError(tempId, msg);
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
  }, [onUploadComplete, onUploadError]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 임시 레코드 생성 후 즉시 콜백 호출 → 업로드 전에도 UI가 processing으로 전환됨
    const tempId = `temp-${Date.now()}`;
    tempIdRef.current = tempId;
    const tempRecord: RecordItem = {
      id: tempId,
      spaceId: null,
      memberId: getDefaultRecordContext?.().memberId ?? null,
      createdAt: new Date().toISOString(),
      title: `녹음 ${createTimestamp()}`,
      status: "processing",
      errorMessage: null,
      meta: "",
      duration: fmtDuration(elapsedRef.current),
      durationMs: elapsedRef.current * 1000,
      studentName: getDefaultRecordContext?.().studentName ?? "",
      type: "",
      audioUrl: null,
      transcript: [],
      aiSummary: "업로드 중...",
      aiMessages: [],
      analysisResult: null,
      processingStage: "queued",
      processingProgress: 5,
      processingMessage:
        "업로드가 완료되어 백그라운드 전사를 준비하고 있습니다.",
      analysisStatus: "idle",
      analysisProgress: 0,
    };
    onRecordingStop(tempRecord);

    // MediaRecorder 중단 → onstop에서 업로드 후 교체
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    mediaRecorderRef.current = null;
  }, [getDefaultRecordContext, onRecordingStop]);

  const cancel = useCallback(() => {
    resetRecorderState();
    setError(null);
  }, [resetRecorderState]);

  return { elapsed, uploading, error, start, stop, cancel };
}
