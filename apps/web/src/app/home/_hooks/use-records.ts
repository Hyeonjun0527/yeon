"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CounselingChatMessage,
  CounselingRecordListItem,
  CounselingRecordDetail,
} from "@yeon/api-contract/counseling-records";
import { analysisResultSchema } from "@yeon/api-contract/counseling-records";
import type {
  RecordItem,
  InternalPhase,
  HomeViewState,
  AiMessage,
  AnalysisResult,
  TranscriptSegment,
} from "../_lib/types";
import { getProcessingChecklistStep } from "../_lib/processing-progress";
import { fmtRelativeDate, fmtDurationMs } from "../_lib/utils";

const POLL_INTERVAL_MS = 3000;
const BOOSTED_POLL_INTERVAL_MS = 1000;
const BOOSTED_POLL_WINDOW_MS = 15000;

function mapAssistantMessages(messages: CounselingChatMessage[]): AiMessage[] {
  return messages.map((message) => ({
    role: message.role,
    text: message.content,
    createdAt: message.createdAt,
  }));
}

function listItemToRecordItem(item: CounselingRecordListItem): RecordItem {
  return {
    id: item.id,
    spaceId: item.spaceId ?? null,
    memberId: item.memberId ?? null,
    createdAt: item.createdAt,
    title: item.sessionTitle || "제목 없음",
    status: item.status,
    errorMessage:
      item.status === "error" ? (item.errorMessage ?? "알 수 없는 오류") : null,
    meta: `${item.studentName || "수강생 미지정"} · ${fmtRelativeDate(item.createdAt)}`,
    duration: fmtDurationMs(item.audioDurationMs),
    durationMs: item.audioDurationMs ?? 0,
    studentName: item.studentName || "",
    type: item.counselingType || "",
    audioUrl: null,
    transcript: [],
    aiSummary: item.preview || "",
    aiMessages: [],
    aiMessagesLoaded: false,
    analysisResult: null,
    processingStage: item.processingStage,
    processingProgress: item.processingProgress,
    processingMessage: item.processingMessage,
    analysisStatus: item.analysisStatus,
    analysisProgress: item.analysisProgress,
  };
}

function detailToTranscript(
  detail: CounselingRecordDetail,
): TranscriptSegment[] {
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

function detailToRecordPatch(
  detail: CounselingRecordDetail,
): Partial<RecordItem> {
  const rawAnalysis = detail.analysisResult;
  const parsedAnalysis =
    rawAnalysis != null ? analysisResultSchema.safeParse(rawAnalysis) : null;
  const analysisResult = parsedAnalysis?.success ? parsedAnalysis.data : null;

  return {
    spaceId: detail.spaceId ?? null,
    memberId: detail.memberId ?? null,
    createdAt: detail.createdAt,
    title: detail.sessionTitle || "제목 없음",
    status: detail.status,
    errorMessage:
      detail.status === "error"
        ? (detail.errorMessage ?? "알 수 없는 오류")
        : null,
    meta: `${detail.studentName || "수강생 미지정"} · ${fmtRelativeDate(detail.createdAt)}`,
    duration: fmtDurationMs(detail.audioDurationMs),
    durationMs: detail.audioDurationMs ?? 0,
    studentName: detail.studentName || "",
    type: detail.counselingType || "",
    audioUrl: detail.audioUrl || null,
    transcript: detailToTranscript(detail),
    aiSummary: detail.preview || "",
    aiMessages: mapAssistantMessages(detail.assistantMessages),
    aiMessagesLoaded: true,
    analysisResult,
    processingStage: detail.processingStage,
    processingProgress: detail.processingProgress,
    processingMessage: detail.processingMessage,
    analysisStatus: detail.analysisStatus,
    analysisProgress: detail.analysisProgress,
  };
}
export function useRecords() {
  const queryClient = useQueryClient();

  const [localOverrides, setLocalOverrides] = useState<
    Map<string, Partial<RecordItem>>
  >(new Map());
  const [tempRecords, setTempRecords] = useState<RecordItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<InternalPhase>("idle");
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [pollBoostUntil, setPollBoostUntil] = useState<number>(0);

  // 서버 목록 쿼리
  const { data: serverData, isPending } = useQuery({
    queryKey: ["counseling-records"],
    queryFn: async () => {
      const res = await fetch("/api/v1/counseling-records");
      if (!res.ok) throw new Error("목록 조회 실패");
      return res.json() as Promise<{ records: CounselingRecordListItem[] }>;
    },
    refetchInterval: (query) => {
      const items = query.state.data?.records || [];
      if (!items.some((r) => r.status === "processing")) {
        return false;
      }

      return Date.now() < pollBoostUntil
        ? BOOSTED_POLL_INTERVAL_MS
        : POLL_INTERVAL_MS;
    },
  });

  // 병합된 records (서버 + 로컬 오버라이드 + 임시 레코드)
  const records = useMemo(() => {
    const serverItems = serverData ? serverData.records : [];
    const serverMerged = serverItems.map(listItemToRecordItem).map((r) => {
      const overrides = localOverrides.get(r.id);
      if (!overrides) return r;
      return { ...r, ...overrides };
    });

    const serverIds = new Set(serverItems.map((item) => item.id));
    const preserved = tempRecords.filter(
      (t) =>
        !serverIds.has(t.id) &&
        (t.id.startsWith("temp-") || t.status === "processing"),
    );

    return [...preserved, ...serverMerged];
  }, [serverData, localOverrides, tempRecords]);

  const selected = records.find((r) => r.id === selectedId) ?? null;

  // 서버에서 processing → ready 전환 감지 (이전 데이터와 비교)
  const prevServerDataRef = useRef<{
    records: CounselingRecordListItem[];
  } | null>(null);
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
          // eslint-disable-next-line no-restricted-syntax
          const res = await fetch(`/api/v1/counseling-records/${item.id}`);
          if (!res.ok) throw new Error("상세 조회 실패");
          return res.json() as Promise<{ record: CounselingRecordDetail }>;
        },
      });
    }
  }, [serverData, queryClient]);

  useEffect(() => {
    if (phase === "processing" && selected?.status !== "processing") {
      setPhase("idle");
    }
  }, [phase, selected?.status]);

  const processingStep = useMemo(() => {
    if (selected?.status !== "processing") {
      return 0;
    }

    return getProcessingChecklistStep({
      processingStage: selected.processingStage,
      analysisStatus: selected.analysisStatus,
    });
  }, [selected?.analysisStatus, selected?.processingStage, selected?.status]);

  const fetchDetail = useCallback(
    async (id: string) => {
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
        const parsedAnalysis =
          rawAnalysis != null
            ? analysisResultSchema.safeParse(rawAnalysis)
            : null;
        const analysisResult = parsedAnalysis?.success
          ? parsedAnalysis.data
          : null;

        setLocalOverrides((prev) => {
          const next = new Map(prev);
          const existing = next.get(id) ?? {};
          next.set(id, {
            ...existing,
            transcript,
            audioUrl,
            analysisResult,
            aiMessages: mapAssistantMessages(data.record.assistantMessages),
            aiMessagesLoaded: true,
          });
          return next;
        });
      } catch {
        // detail 로드 실패는 무시
      } finally {
        setTranscriptLoading(false);
      }
    },
    [queryClient],
  );

  const addProcessingRecord = useCallback((record: RecordItem) => {
    setTempRecords((prev) => {
      if (prev.some((r) => r.id === record.id)) return prev;
      return [record, ...prev];
    });
    setSelectedId(record.id);
    setPhase("processing");
  }, []);

  const addReadyRecord = useCallback(
    (record: RecordItem) => {
      setTempRecords((prev) => {
        if (prev.some((r) => r.id === record.id)) return prev;
        return [record, ...prev];
      });
      setSelectedId(record.id);
      setPhase("idle");
      // 서버 목록 갱신
      queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
    },
    [queryClient],
  );

  const selectRecord = useCallback(
    (id: string) => {
      const rec = records.find((r) => r.id === id);
      if (!rec) return;
      setSelectedId(id);
      setPhase(rec.status === "processing" ? "processing" : "idle");

      if (
        rec.status === "ready" &&
        (rec.transcript.length === 0 ||
          rec.analysisResult === null ||
          rec.aiMessagesLoaded !== true)
      ) {
        fetchDetail(id);
      }
    },
    [records, fetchDetail],
  );

  const replaceRecord = useCallback(
    (tempId: string, realRecord: RecordItem) => {
      setTempRecords((prev) =>
        prev.map((r) => (r.id === tempId ? realRecord : r)),
      );
      setSelectedId((prev) => (prev === tempId ? realRecord.id : prev));
      queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
    },
    [queryClient],
  );

  const removeRecord = useCallback(
    (id: string) => {
      setTempRecords((prev) => prev.filter((r) => r.id !== id));
      setLocalOverrides((prev) => {
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
      queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
      setSelectedId((prev) => (prev === id ? null : prev));
      setPhase((prev) => (prev === "processing" ? "idle" : prev));
    },
    [queryClient],
  );

  const markUploadError = useCallback((id: string, message: string) => {
    setTempRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              aiSummary: `업로드 실패: ${message}`,
              status: "error" as const,
              errorMessage: message,
            }
          : r,
      ),
    );
    setLocalOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? {};
      next.set(id, {
        ...existing,
        aiSummary: `업로드 실패: ${message}`,
        status: "error" as const,
        errorMessage: message,
      });
      return next;
    });
    setPhase((prev) => (prev === "processing" ? "idle" : prev));
  }, []);

  const updateMessages = useCallback(
    (id: string, updater: (prev: AiMessage[]) => AiMessage[]) => {
      setLocalOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(id) ?? {};
        const currentMessages = (existing.aiMessages as AiMessage[]) || [];
        next.set(id, {
          ...existing,
          aiMessages: updater(currentMessages),
          aiMessagesLoaded: true,
        });
        return next;
      });
    },
    [],
  );

  const clearMessages = useCallback(async (id: string) => {
    const response = await fetch(`/api/v1/counseling-records/${id}/chat`, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error("채팅 기록을 초기화하지 못했습니다.");
    }

    setLocalOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? {};
      next.set(id, { ...existing, aiMessages: [], aiMessagesLoaded: true });
      return next;
    });
  }, []);

  const boostPolling = useCallback(() => {
    setPollBoostUntil(Date.now() + BOOSTED_POLL_WINDOW_MS);
  }, []);

  const markAnalysisRetryStart = useCallback(
    (id: string) => {
      setLocalOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(id) ?? {};
        next.set(id, {
          ...existing,
          analysisStatus: "processing",
          analysisProgress: 0,
          processingMessage: "AI 분석을 다시 준비하고 있습니다.",
        });
        return next;
      });
      setSelectedId(id);
      setPhase("idle");
      boostPolling();
    },
    [boostPolling],
  );

  const updateAnalysisResult = useCallback(
    (id: string, result: AnalysisResult) => {
      setLocalOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(id) ?? {};
        next.set(id, { ...existing, analysisResult: result });
        return next;
      });
    },
    [],
  );

  const updateMemberId = useCallback((id: string, memberId: string | null) => {
    setLocalOverrides((prev) => {
      const next = new Map(prev);
      const existing = next.get(id) ?? {};
      next.set(id, { ...existing, memberId });
      return next;
    });
  }, []);

  const applyRecordDetail = useCallback(
    (detail: CounselingRecordDetail) => {
      const patch = detailToRecordPatch(detail);
      setLocalOverrides((prev) => {
        const next = new Map(prev);
        const existing = next.get(detail.id) ?? {};
        next.set(detail.id, { ...existing, ...patch });
        return next;
      });
      queryClient.setQueryData(["counseling-record", detail.id], {
        record: detail,
      });
      queryClient.invalidateQueries({ queryKey: ["counseling-records"] });
      setSelectedId(detail.id);
      setPhase(detail.status === "processing" ? "processing" : "idle");
      if (detail.status === "processing") {
        boostPolling();
      }
    },
    [boostPolling, queryClient],
  );

  // viewState — 단일 진실의 원천
  // isPending: 서버 데이터가 한 번도 도착하지 않은 상태 (첫 렌더 포함)
  // isLoading(=isPending&&isFetching)만 쓰면 마운트 첫 렌더에서 isFetching=false 구간이 생겨 "empty" 깜빡임 발생
  const viewState = useMemo((): HomeViewState => {
    if (phase === "recording") return { kind: "recording" };
    if (phase === "processing")
      return { kind: "processing", step: processingStep };
    if (isPending) return { kind: "loading" };
    if (records.length === 0) return { kind: "empty" };
    return { kind: "ready", records };
  }, [phase, processingStep, isPending, records]);

  // 외부용 recording 시작 메서드
  const startRecording = useCallback(() => {
    setPhase("recording");
  }, []);

  const cancelRecording = useCallback(() => {
    setPhase("idle");
  }, []);

  return {
    records,
    selectedId,
    selected,
    viewState,
    processingStep,
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
    applyRecordDetail,
    markAnalysisRetryStart,
    boostPolling,
    startRecording,
    cancelRecording,
  };
}
