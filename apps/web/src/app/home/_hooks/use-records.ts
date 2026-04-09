import { useState, useEffect, useCallback } from "react";
import {
  TRANSCRIPT,
  PROCESSING_STEPS,
} from "../../mockdata/app/_data/mock-data";
import type { RecordItem, RecordPhase, AiMessage } from "../_lib/types";
import { buildInitialRecords } from "../_lib/utils";

export function useRecords() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [phase, setPhase] = useState<RecordPhase>("empty");
  const [processingStep, setProcessingStep] = useState(0);

  const selected = records.find((r) => r.id === selectedId) ?? null;

  /* 처리 단계 자동 진행 */
  useEffect(() => {
    if (phase !== "processing") return;

    const timers: ReturnType<typeof setTimeout>[] = [];

    PROCESSING_STEPS.forEach((step, i) => {
      timers.push(
        setTimeout(() => setProcessingStep(i + 1), step.completeAt),
      );
    });

    const lastStep = PROCESSING_STEPS[PROCESSING_STEPS.length - 1];
    timers.push(
      setTimeout(() => {
        setRecords((prev) =>
          prev.map((r) =>
            r.id === selectedId
              ? {
                  ...r,
                  status: "ready" as const,
                  title: "수학 과제 누락 상담",
                  studentName: "김민수",
                  type: "대면 상담",
                  meta: "김민수 · 오늘",
                  transcript: TRANSCRIPT,
                  aiSummary:
                    "학원 일정(주 5회)으로 과제 시간 부족. 제출 기한을 익일 오전으로 조정하기로 합의. 2주 후 학습 루틴 재점검 예정.",
                  aiMessages: [],
                }
              : r,
          ),
        );
        setPhase("ready");
      }, lastStep.completeAt + 800),
    );

    return () => timers.forEach(clearTimeout);
  }, [phase, selectedId]);

  const addProcessingRecord = useCallback(
    (record: RecordItem) => {
      setRecords((prev) => [record, ...prev]);
      setSelectedId(record.id);
      setPhase("processing");
      setProcessingStep(0);
    },
    [],
  );

  const selectRecord = useCallback(
    (id: string) => {
      const rec = records.find((r) => r.id === id);
      if (!rec) return;
      setSelectedId(id);
      setPhase(rec.status === "processing" ? "processing" : "ready");
    },
    [records],
  );

  const updateMessages = useCallback(
    (id: string, updater: (prev: AiMessage[]) => AiMessage[]) => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id
            ? { ...r, aiMessages: updater(r.aiMessages) }
            : r,
        ),
      );
    },
    [],
  );

  const clearMessages = useCallback(
    (id: string) => {
      setRecords((prev) =>
        prev.map((r) =>
          r.id === id ? { ...r, aiMessages: [] } : r,
        ),
      );
    },
    [],
  );

  return {
    records,
    selectedId,
    selected,
    phase,
    processingStep,
    addProcessingRecord,
    selectRecord,
    updateMessages,
    clearMessages,
    setPhase,
    buildInitialRecords,
  };
}
