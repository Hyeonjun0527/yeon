"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type {
  CounselingRecordListItem,
  CounselingRecordDetail,
} from "@yeon/api-contract/counseling-records";
import type { RecordItem, RecordPhase, AiMessage, TranscriptSegment } from "../_lib/types";
import { fmtRelativeDate, fmtDurationMs } from "../_lib/utils";

const POLL_INTERVAL_MS = 3000;

function listItemToRecordItem(item: CounselingRecordListItem): RecordItem {
  return {
    id: item.id,
    title: item.sessionTitle || "제목 없음",
    status: item.status === "error" ? "ready" : item.status,
    meta: `${item.studentName || "수강생 미지정"} · ${fmtRelativeDate(item.createdAt)}`,
    duration: fmtDurationMs(item.audioDurationMs),
    studentName: item.studentName || "",
    type: item.counselingType || "",
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

  // ref로 현재 records 미러링 — state updater 바깥에서 비교할 때 사용
  const recordsRef = useRef<RecordItem[]>([]);
  recordsRef.current = records;

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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
      setProcessingStep((prev) => (prev >= 5 ? 5 : prev + 1));
    }, 2000);

    return () => {
      if (stepTimerRef.current) {
        clearInterval(stepTimerRef.current);
        stepTimerRef.current = null;
      }
    };
  }, [phase]);

  const fetchDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/v1/counseling-records/${id}`);
      if (!res.ok) return;
      const data = (await res.json()) as { record: CounselingRecordDetail };
      const transcript = detailToTranscript(data.record);
      setRecords((prev) =>
        prev.map((r) => (r.id === id ? { ...r, transcript } : r)),
      );
    } catch {
      // detail 로드 실패는 무시
    }
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

        // 아직 업로드 중인 임시 레코드(temp- 접두사)는 서버 목록에 없으므로 보존
        const tempRecords = prev.filter((p) => p.id.startsWith("temp-"));
        const merged = [...tempRecords, ...serverMerged];

        setRecords(merged);

        for (const id of readyTransitioned) {
          fetchDetail(id);
          if (selectedIdRef.current === id && phaseRef.current === "processing") {
            setPhase("ready");
          }
        }

        if (opts?.initialLoad) {
          setPhase(items.length === 0 ? "empty" : "ready");
        }
      } finally {
        if (opts?.initialLoad) setLoading(false);
      }
    },
    [fetchDetail],
  );

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
    setProcessingStep(0);
  }, []);

  const selectRecord = useCallback(
    async (id: string) => {
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

  /** 업로드 실패: 임시 레코드 제거 후 phase 복구 */
  const removeRecord = useCallback((id: string) => {
    setRecords((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next;
    });
    setSelectedId((prev) => {
      if (prev !== id) return prev;
      // 제거된 레코드가 선택된 경우 첫 번째 레코드로 이동
      const remaining = recordsRef.current.filter((r) => r.id !== id);
      return remaining[0]?.id ?? null;
    });
    setPhase((prev) => {
      if (prev !== "processing") return prev;
      const remaining = recordsRef.current.filter((r) => r.id !== id);
      return remaining.length === 0 ? "empty" : "ready";
    });
  }, []);

  return {
    records,
    selectedId,
    selected,
    phase,
    processingStep,
    loading,
    addProcessingRecord,
    replaceRecord,
    removeRecord,
    selectRecord,
    updateMessages,
    clearMessages,
    setPhase,
  };
}
