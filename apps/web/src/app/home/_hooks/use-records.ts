"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CounselingRecordListItem,
  CounselingRecordDetail,
} from "@yeon/api-contract/counseling-records";
import { analysisResultSchema } from "@yeon/api-contract/counseling-records";
import type { RecordItem, RecordPhase, AiMessage, AnalysisResult, TranscriptSegment } from "../_lib/types";
import { fmtRelativeDate, fmtDurationMs } from "../_lib/utils";

const POLL_INTERVAL_MS = 3000;
const PROCESSING_STEP_COUNT = 6;
const PROCESSING_STEP_INTERVAL_MS = 2000;
const MIN_PROCESSING_DISPLAY_MS = PROCESSING_STEP_COUNT * PROCESSING_STEP_INTERVAL_MS + 1000;

function listItemToRecordItem(item: CounselingRecordListItem): RecordItem {
  return {
    id: item.id,
    spaceId: item.spaceId ?? null,
    memberId: item.memberId ?? null,
    createdAt: item.createdAt,
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
    analysisResult: null,
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
  const queryClient = useQueryClient();

  const [localOverrides, setLocalOverrides] = useState<Map<string, Partial<RecordItem>>>(new Map());
  const [tempRecords, setTempRecords] = useState<RecordItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<RecordPhase>("empty");
  const [processingStep, setProcessingStep] = useState(0);
  const [transcriptLoading, setTranscriptLoading] = useState(false);

  const processingStartRef = useRef<number | null>(null);
  const phaseRef = useRef<RecordPhase>("empty");
  const selectedIdRef = useRef<string | null>(null);
  const readyTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  phaseRef.current = phase;
  selectedIdRef.current = selectedId;

  // 서버 목록 쿼리
  const { data: serverData, isLoading: loading } = useQuery({
    queryKey: ["counseling-records"],
    queryFn: async () => {
      const res = await fetch("/api/v1/counseling-records");
      if (!res.ok) throw new Error("목록 조회 실패");
      return res.json() as Promise<{ records: CounselingRecordListItem[] }>;
    },
    refetchInterval: (query) => {
      const items = query.state.data?.records ?? [];
      return items.some((r) => r.status === "processing") ? POLL_INTERVAL_MS : false;
    },
  });

  // 병합된 records (서버 + 로컬 오버라이드 + 임시 레코드)
  const records = useMemo(() => {
    const serverItems = serverData?.records ?? [];
    const serverMerged = serverItems.map(listItemToRecordItem).map((r) => {
      const overrides = localOverrides.get(r.id);
      if (!overrides) return r;
      return { ...r, ...overrides };
    });

    const serverIds = new Set(serverItems.map((item) => item.id));
    const preserved = tempRecords.filter(
      (t) => !serverIds.has(t.id) && (t.id.startsWith("temp-") || t.status === "processing"),
    );

    return [...preserved, ...serverMerged];
  }, [serverData, localOverrides, tempRecords]);

  const selected = records.find((r) => r.id === selectedId) ?? null;

  // 서버에서 processing → ready 전환 감지 (이전 데이터와 비교)
  const prevServerDataRef = useRef<{ records: CounselingRecordListItem[] } | null>(null);
  useEffect(() => {
    if (!serverData) return;

    const prev = prevServerDataRef.current;
    prevServerDataRef.current = serverData;

    if (!prev) return;

    const readyTransitioned = serverData.records.filter((item) => {
      const existing = prev.records.find((p) => p.id === item.id);
      return existing?.status === "processing" && item.status !== "processing";
    });

    for (const item of readyTransitioned) {
      // 상세 정보 미리 로드 (query cache에 저장)
      queryClient.prefetchQuery({
        queryKey: ["counseling-record", item.id],
        queryFn: async () => {
          const res = await fetch(`/api/v1/counseling-records/${item.id}`);
          if (!res.ok) throw new Error("상세 조회 실패");
          return res.json() as Promise<{ record: CounselingRecordDetail }>;
        },
      });

      if (selectedIdRef.current === item.id && phaseRef.current === "processing") {
        const elapsed = processingStartRef.current != null
          ? Date.now() - processingStartRef.current
          : MIN_PROCESSING_DISPLAY_MS;
        const delay = Math.max(0, MIN_PROCESSING_DISPLAY_MS - elapsed);

        if (readyTransitionTimerRef.current) clearTimeout(readyTransitionTimerRef.current);
        readyTransitionTimerRef.current = setTimeout(() => {
          readyTransitionTimerRef.current = null;
          if (selectedIdRef.current === item.id && phaseRef.current === "processing") {
            setPhase("ready");
          }
        }, delay);
      }
    }
  }, [serverData, queryClient]);

  // 초기 로드 후 phase 결정
  const initialLoadDoneRef = useRef(false);
  useEffect(() => {
    if (loading || initialLoadDoneRef.current) return;
    initialLoadDoneRef.current = true;

    setPhase((prev) => {
      if (prev === "recording" || prev === "processing") return prev;
      const items = serverData?.records ?? [];
      return items.length === 0 ? "empty" : "ready";
    });
  }, [loading, serverData]);

  // 처리 단계 시각 애니메이션
  const stepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
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

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (readyTransitionTimerRef.current) clearTimeout(readyTransitionTimerRef.current);
    };
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    setTranscriptLoading(true);
    try {
      const data = await queryClient.fetchQuery({
        queryKey: ["counseling-record", id],
        queryFn: async () => {
          const res = await fetch(`/api/v1/counseling-records/${id}`);
          if (!res.ok) throw new Error("상세 조회 실패");
          return res.json() as Promise<{ record: CounselingRecordDetail }>;
        },
        staleTime: 30_000,
      });

      const transcript = detailToTranscript(data.record);
      const audioUrl = data.record.audioUrl || null;
      const rawAnalysis = data.record.analysisResult;
      const parsedAnalysis = rawAnalysis != null ? analysisResultSchema.safeParse(rawAnalysis) : null;
      const analysisResult = parsedAnalysis?.success ? parsedAnalysis.data : null;

      setLocalOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(id) ?? {};
        next.set(id, { ...existing, transcript, audioUrl, analysisResult });
        return next;
      });
    } catch {
      // detail 로드 실패는 무시
    } finally {
      setTranscriptLoading(false);
    }
  }, [queryClient]);

  const addProcessingRecord = useCallback((record: RecordItem) => {
    setTempRecords((prev) => {
      if (prev.some((r) => r.id === record.id)) return prev;
      return [record, ...prev];
    });
    setSelectedId(record.id);
    setPhase("processing");
    processingStartRef.current = Date.now();
  }, []);

  const addReadyRecord = useCallback((record: RecordItem) => {
    setTempRecords((prev) => {
      if (prev.some((r) => r.id === record.id)) return prev;
      return [record, ...prev];
    });
    setSelectedId(record.id);
    setPhase("ready");
    // 서버 목록 갱신
    queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
  }, [queryClient]);

  const selectRecord = useCallback(
    (id: string) => {
      const rec = records.find((r) => r.id === id);
      if (!rec) return;
      setSelectedId(id);
      setPhase(rec.status === "processing" ? "processing" : "ready");

      if (rec.status === "ready" && (rec.transcript.length === 0 || rec.analysisResult === null)) {
        fetchDetail(id);
      }
    },
    [records, fetchDetail],
  );

  const replaceRecord = useCallback((tempId: string, realRecord: RecordItem) => {
    setTempRecords((prev) => prev.map((r) => (r.id === tempId ? realRecord : r)));
    setSelectedId((prev) => (prev === tempId ? realRecord.id : prev));
    queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
  }, [queryClient]);

  const removeRecord = useCallback((id: string) => {
    setTempRecords((prev) => prev.filter((r) => r.id !== id));
    setLocalOverrides((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
    setSelectedId((prev) => (prev === id ? null : prev));
    setPhase((prev) => {
      const remaining = records.filter((r) => r.id !== id);
      if (remaining.length === 0) return "empty";
      return prev === "processing" ? "ready" : prev;
    });
  }, [queryClient, records]);

  const markUploadError = useCallback((id: string, message: string) => {
    setTempRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, aiSummary: `업로드 실패: ${message}`, status: "error" as const, errorMessage: message }
          : r,
      ),
    );
    setLocalOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? {};
      next.set(id, { ...existing, aiSummary: `업로드 실패: ${message}`, status: "error" as const, errorMessage: message });
      return next;
    });
    setPhase((prev) => (prev === "processing" ? "ready" : prev));
  }, []);

  const updateMessages = useCallback(
    (id: string, updater: (prev: AiMessage[]) => AiMessage[]) => {
      setLocalOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(id) ?? {};
        const currentMessages = (existing.aiMessages as AiMessage[]) ?? [];
        next.set(id, { ...existing, aiMessages: updater(currentMessages) });
        return next;
      });
    },
    [],
  );

  const clearMessages = useCallback((id: string) => {
    setLocalOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? {};
      next.set(id, { ...existing, aiMessages: [] });
      return next;
    });
  }, []);

  const updateAnalysisResult = useCallback((id: string, result: AnalysisResult) => {
    setLocalOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? {};
      next.set(id, { ...existing, analysisResult: result });
      return next;
    });
  }, []);

  const updateMemberId = useCallback((id: string, memberId: string | null) => {
    setLocalOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? {};
      next.set(id, { ...existing, memberId });
      return next;
    });
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
    addReadyRecord,
    replaceRecord,
    markUploadError,
    removeRecord,
    selectRecord,
    updateMessages,
    clearMessages,
    updateAnalysisResult,
    updateMemberId,
    setPhase,
  };
}
