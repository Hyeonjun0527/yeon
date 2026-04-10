"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  CounselingRecordListItem,
  CounselingRecordDetail,
} from "@yeon/api-contract/counseling-records";
import type { RecordItem, RecordPhase, AiMessage, TranscriptSegment } from "../_lib/types";
import { fmtRelativeDate, fmtDurationMs } from "../_lib/utils";

const POLL_INTERVAL_MS = 3000;
const PROCESSING_STEP_COUNT = 6;
const PROCESSING_STEP_INTERVAL_MS = 2000;
/** 모든 단계 애니메이션이 완료된 뒤 전환 — 6단계 × 2초 + 여유 1초 */
const MIN_PROCESSING_DISPLAY_MS = PROCESSING_STEP_COUNT * PROCESSING_STEP_INTERVAL_MS + 1000;

function listItemToRecordItem(item: CounselingRecordListItem): RecordItem {
  return {
    id: item.id,
    title: item.sessionTitle || "제목 없음",
    status: item.status,
    errorMessage: item.status === "error" ? (item.errorMessage ?? "알 수 없는 오류") : null,
    meta: `${item.studentName || "수강생 미지정"} · ${fmtRelativeDate(item.createdAt)}`,
    duration: fmtDurationMs(item.audioDurationMs),
    durationMs: item.audioDurationMs ?? 0,
    studentName: item.studentName || "",
    type: item.counselingType || "",
    audioUrl: null,
    transcript: [],
    aiSummary: item.preview || "",
    aiMessages: [],
  };
}

function detailToTranscript(detail: CounselingRecordDetail): TranscriptSegment[] {
  return detail.transcriptSegments.map((seg) => ({
    id: seg.id,
    segmentIndex: seg.segmentIndex,
    startMs: seg.startMs,
    endMs: seg.endMs,
    speakerLabel: seg.speakerLabel,
    speakerTone: seg.speakerTone,
    text: seg.text,
  }));
}

export function useRecords() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<RecordPhase>("empty");
  const [processingStep, setProcessingStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  // ref로 현재 records 미러링 — state updater 바깥에서 비교할 때 사용
  const recordsRef = useRef<RecordItem[]>([]);
  recordsRef.current = records;

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const readyTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const processingStartRef = useRef<number | null>(null);
  const phaseRef = useRef<RecordPhase>("empty");
  const selectedIdRef = useRef<string | null>(null);
  phaseRef.current = phase;
  selectedIdRef.current = selectedId;

  const selected = records.find((r) => r.id === selectedId) ?? null;

  /* 처리 단계 시각 애니메이션 */
  useEffect(() => {
    if (phase !== "processing") {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
      }
      setProcessingStep(0);
      return;
    }

    setProcessingStep(0);
    stepTimerRef.current = setInterval(() => {
      setProcessingStep((prev) => Math.min(prev + 1, PROCESSING_STEP_COUNT));
    }, PROCESSING_STEP_INTERVAL_MS);

    return () => {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
      }
    };
  }, [phase]);

  const fetchDetail = useCallback(async (id: string) => {
    setTranscriptLoading(true);
    try {
      const res = await fetch(`/api/v1/counseling-records/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { record: CounselingRecordDetail };
      const transcript = detailToTranscript(data.record);
      const audioUrl = data.record.audioUrl || null;
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, transcript, audioUrl } : r)),
      );
    } catch {
      // detail 로드 실패는 무시
    } finally {
      setTranscriptLoading(false);
    }
  }, []);

  /**
   * 서버에서 ready 전환이 감지됐을 때 호출.
   * MIN_PROCESSING_DISPLAY_MS 만큼의 최소 표시 시간을 보장한 뒤 setPhase("ready").
   */
  const scheduleReadyTransition = useCallback((id: string) => {
    const elapsed = processingStartRef.current != null
      ? Date.now() - processingStartRef.current
      : MIN_PROCESSING_DISPLAY_MS;
    const delay = Math.max(0, MIN_PROCESSING_DISPLAY_MS - elapsed);

    if (readyTransitionTimerRef.current) {
      clearTimeout(readyTransitionTimerRef.current);
    }
    readyTransitionTimerRef.current = setTimeout(() => {
      readyTransitionTimerRef.current = null;
      if (selectedIdRef.current === id && phaseRef.current === "processing") {
        setPhase("ready");
      }
    }, delay);
  }, []);

  /** 서버 목록을 가져와 records state를 병합. 기존 aiMessages·transcript 보존. */
  const syncFromServer = useCallback(
    async (opts?: { initialLoad?: boolean }) => {
      if (opts?.initialLoad) setLoading(true);
      try {
        const res = await fetch("/api/v1/counseling-records");
        if (!res.ok) return;
        const data = (await res.json()) as { records: CounselingRecordListItem[] };
        const items = data.records;
        const prev = recordsRef.current;

        // processing → ready 전환 감지 (state updater 밖에서)
        const readyTransitioned = items
          .filter((item) => {
            const existing = prev.find((p) => p.id === item.id);
            return existing?.status === "processing" && item.status !== "processing";
          })
          .map((item) => item.id);

        const serverMerged = items.map(listItemToRecordItem).map((r) => {
          const existing = prev.find((p) => p.id === r.id);
          if (!existing) return r;
          return {
            ...r,
            aiMessages: existing.aiMessages,
            transcript:
              existing.transcript.length > 0 ? existing.transcript : r.transcript,
          };
        });

        // 서버 응답에 없는 기존 레코드 보존 전략:
        // - temp- 접두사: 아직 업로드 중인 임시 레코드
        // - processing 상태의 실제 서버 ID: replaceRecord 직후 폴링이 먼저 도착해
        //   서버 목록에 아직 반영되지 않은 레코드 (타이밍 경합 방지)
        const serverIds = new Set(items.map((item) => item.id));
        const preservedRecords = prev.filter(
          (p) => !serverIds.has(p.id) && (p.id.startsWith("temp-") || p.status === "processing"),
        );
        const merged = [...preservedRecords, ...serverMerged];

        setRecords(merged);

        for (const id of readyTransitioned) {
          fetchDetail(id);
          if (selectedIdRef.current === id && phaseRef.current === "processing") {
            scheduleReadyTransition(id);
          }
        }

        if (opts?.initialLoad) {
          // recording/processing 중이면 사용자 액션이 진행 중 — phase를 덮어쓰지 않음
          setPhase((prev) => {
            if (prev === "recording" || prev === "processing") return prev;
            return items.length === 0 ? "empty" : "ready";
          });
        }
      } finally {
        if (opts?.initialLoad) setLoading(false);
      }
    },
    [fetchDetail, scheduleReadyTransition],
  );

  /* 언마운트 시 지연 전환 타이머 정리 */
  useEffect(() => {
    return () => {
      if (readyTransitionTimerRef.current) {
        clearTimeout(readyTransitionTimerRef.current);
      }
    };
  }, []);

  /* 초기 로드 */
  useEffect(() => {
    syncFromServer({ initialLoad: true });
  }, [syncFromServer]);

  /* processing 레코드가 있을 때 폴링 */
  const hasProcessing = records.some((r) => r.status === "processing");

  useEffect(() => {
    if (!hasProcessing) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      return;
    }

    if (pollIntervalRef.current) return;

    pollIntervalRef.current = setInterval(() => {
      syncFromServer();
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [hasProcessing, syncFromServer]);

  const addProcessingRecord = useCallback((record: RecordItem) => {
    setRecords((prev) => {
      if (prev.some((r) => r.id === record.id)) return prev;
      return [record, ...prev];
    });
    setSelectedId(record.id);
    setPhase("processing");
    processingStartRef.current = Date.now();
  }, []);

  const selectRecord = useCallback(
    (id: string) => {
      const rec = recordsRef.current.find((r) => r.id === id);
      if (!rec) return;
      setSelectedId(id);
      setPhase(rec.status === "processing" ? "processing" : "ready");

      if (rec.status === "ready" && rec.transcript.length === 0) {
        fetchDetail(id);
      }
    },
    [fetchDetail],
  );

  const updateMessages = useCallback(
    (id: string, updater: (prev: AiMessage[]) => AiMessage[]) => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, aiMessages: updater(r.aiMessages) } : r,
        ),
      );
    },
    [],
  );

  const clearMessages = useCallback((id: string) => {
    setRecords((prev) =>
      prev.map((r) => (r.id === id ? { ...r, aiMessages: [] } : r)),
    );
  }, []);

  /** 업로드 완료: 임시 레코드를 실제 서버 레코드로 교체 */
  const replaceRecord = useCallback((tempId: string, realRecord: RecordItem) => {
    setRecords((prev) => prev.map((r) => (r.id === tempId ? realRecord : r)));
    setSelectedId((prev) => (prev === tempId ? realRecord.id : prev));
  }, []);

  /**
   * 레코드를 목록에서 제거.
   * temp- 접두사 레코드는 로컬만 제거하고, 실제 서버 레코드는 호출 측에서 별도 삭제 API를 호출해야 한다.
   */
  const removeRecord = useCallback((id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setSelectedId((prev) => (prev === id ? null : prev));
    setPhase((prev) => {
      // 삭제 후 남은 레코드가 없으면 empty로 전환
      const remaining = recordsRef.current.filter((r) => r.id !== id);
      if (remaining.length === 0) return "empty";
      return prev === "processing" ? "ready" : prev;
    });
  }, []);

  /** 업로드 실패: 임시 레코드를 오류 상태로 표시 — 화면에서 사라지지 않음 */
  const markUploadError = useCallback((id: string, message: string) => {
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, aiSummary: `업로드 실패: ${message}`, status: "error" as const, errorMessage: message }
          : r,
      ),
    );
    // phase는 "processing" → "ready"로만 전환. "empty"로는 절대 내려가지 않음.
    setPhase((prev) => (prev === "processing" ? "ready" : prev));
  }, []);

  return {
    records,
    selectedId,
    selected,
    phase,
    processingStep,
    loading,
    transcriptLoading,
    addProcessingRecord,
    replaceRecord,
    markUploadError,
    removeRecord,
    selectRecord,
    updateMessages,
    clearMessages,
    setPhase,
  };
}
