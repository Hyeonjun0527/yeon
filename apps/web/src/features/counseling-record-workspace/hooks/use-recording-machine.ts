import { useEffect, useRef, useState } from "react";
import type { RecordingPhase } from "../types";

export function useRecordingMachine() {
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);

  function resetRecordingState() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    mediaRecorderRef.current = null;
    recordedChunksRef.current = [];
    recordingStartedAtRef.current = null;
    setIsRecording(false);
    setIsFinalizingRecording(false);
    setRecordingElapsedMs(0);
  }

  // 녹음 타이머 (250ms 간격)
  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timer = window.setInterval(() => {
      if (!recordingStartedAtRef.current) {
        return;
      }

      setRecordingElapsedMs(Date.now() - recordingStartedAtRef.current);
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [isRecording]);

  // 컴포넌트 언마운트 시에만 녹음 리소스 정리
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function startRecording(
    onAudioReady: (file: File) => Promise<void> | void,
    onOpenUploadPanel: () => void,
  ) {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setRecordingError(
        "이 브라우저에서는 음성 녹음을 지원하지 않습니다. 파일 업로드를 사용해 주세요.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError(
        "브라우저 마이크 권한을 사용할 수 없습니다. 파일 업로드를 사용해 주세요.",
      );
      return;
    }

    // 녹음 상태 UI가 업로드 패널 안에 있으므로 패널을 열어야 함
    onOpenUploadPanel();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ].find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
      const recorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
            audioBitsPerSecond: 64000,
          })
        : new MediaRecorder(stream, {
            audioBitsPerSecond: 64000,
          });

      recordedChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setRecordingElapsedMs(0);
      setRecordingError(null);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        const activeType = recorder.mimeType || mimeType || "audio/webm";
        const extension = activeType.includes("webm")
          ? ".webm"
          : activeType.includes("ogg")
            ? ".ogg"
            : activeType.includes("mp4")
              ? ".m4a"
              : ".wav";
        const chunks = recordedChunksRef.current;

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        recordedChunksRef.current = [];
        recordingStartedAtRef.current = null;
        setIsRecording(false);
        setIsFinalizingRecording(true);

        if (chunks.length === 0) {
          setIsFinalizingRecording(false);
          setRecordingError("녹음 데이터가 비어 있어 저장하지 못했습니다.");
          return;
        }

        const now = new Date();
        const readableTitle = `바로 녹음하기 ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const file = new File(chunks, `${readableTitle}${extension}`, {
          type: activeType,
        });

        try {
          await onAudioReady(file);
        } catch (error) {
          console.error(error);
          setRecordingError(
            "녹음 파일을 저장 준비 상태로 넘기지 못했습니다. 다시 시도해 주세요.",
          );
        } finally {
          setIsFinalizingRecording(false);
        }
      };

      recorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      setRecordingError(
        "마이크 권한을 얻지 못했습니다. 브라우저 권한을 확인해 주세요.",
      );
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
      recordingStartedAtRef.current = null;
      setIsRecording(false);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function cancelRecording() {
    setRecordingError(null);

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;

      if (mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    }

    resetRecordingState();
  }

  const recordingPhase: RecordingPhase = isRecording
    ? "recording"
    : isFinalizingRecording
      ? "finalizing"
      : "idle";

  return {
    recordingPhase,
    recordingElapsedMs,
    recordingError,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
