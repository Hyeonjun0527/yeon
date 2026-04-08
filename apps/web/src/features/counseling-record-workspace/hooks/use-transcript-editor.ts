import { useDeferredValue, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { counselingRecordSpeakerToneSchema } from "@yeon/api-contract";
import type { CounselingRecordDetail, CounselingRecordListItem } from "@yeon/api-contract";
import { isTranscriptSegmentMatched } from "../utils";

export function useTranscriptEditor(
  selectedRecord: CounselingRecordListItem | null,
  setRecordDetails: Dispatch<SetStateAction<Record<string, CounselingRecordDetail | null>>>,
  setSaveToast: (message: string) => void,
) {
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentText, setEditingSegmentText] = useState("");
  const [editingSegmentSaving, setEditingSegmentSaving] = useState(false);

  // 저장 시점의 최신 값을 보장하기 위한 ref
  const editingSegmentIdRef = useRef(editingSegmentId);
  const editingSegmentTextRef = useRef(editingSegmentText);
  editingSegmentIdRef.current = editingSegmentId;
  editingSegmentTextRef.current = editingSegmentText;
  const [transcriptQuery, setTranscriptQuery] = useState("");

  const deferredTranscriptQuery = useDeferredValue(transcriptQuery);
  const normalizedTranscriptQuery = deferredTranscriptQuery
    .trim()
    .toLowerCase();

  function computeTranscriptMatchCount(
    detail: CounselingRecordDetail | null,
  ): number {
    if (!detail) {
      return 0;
    }

    return detail.transcriptSegments.filter((segment) =>
      isTranscriptSegmentMatched(segment, normalizedTranscriptQuery),
    ).length;
  }

  function startEditingSegment(segmentId: string, currentText: string) {
    setEditingSegmentId(segmentId);
    setEditingSegmentText(currentText);
  }

  function cancelEditingSegment() {
    setEditingSegmentId(null);
    setEditingSegmentText("");
  }

  async function saveEditingSegment() {
    const targetSegmentId = editingSegmentIdRef.current;
    const targetText = editingSegmentTextRef.current;

    if (!selectedRecord || !targetSegmentId || editingSegmentSaving) {
      return;
    }

    setEditingSegmentSaving(true);

    try {
      const response = await fetch(
        `/api/v1/counseling-records/${selectedRecord.id}/segments/${targetSegmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: targetText }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
        };

        setSaveToast(data.message ?? "세그먼트 수정에 실패했습니다.");
        return;
      }

      setRecordDetails((current) => {
        const detail = current[selectedRecord.id];

        if (!detail) {
          return current;
        }

        return {
          ...current,
          [selectedRecord.id]: {
            ...detail,
            transcriptSegments: detail.transcriptSegments.map((s) =>
              s.id === targetSegmentId
                ? { ...s, text: targetText }
                : s,
            ),
          },
        };
      });

      setEditingSegmentId(null);
      setEditingSegmentText("");
    } catch {
      setSaveToast("세그먼트 수정에 실패했습니다.");
    } finally {
      setEditingSegmentSaving(false);
    }
  }

  async function handleSpeakerLabelChange(
    segmentId: string,
    newLabel: string,
    newTone: string,
  ) {
    if (!selectedRecord) {
      return;
    }

    const parsedTone = counselingRecordSpeakerToneSchema.safeParse(newTone);

    if (!parsedTone.success) {
      return;
    }

    try {
      const response = await fetch(
        `/api/v1/counseling-records/${selectedRecord.id}/segments/${segmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            speakerLabel: newLabel,
            speakerTone: parsedTone.data,
          }),
        },
      );

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          message?: string;
        };

        setSaveToast(data.message ?? "화자 변경에 실패했습니다.");
        return;
      }

      setRecordDetails((current) => {
        const detail = current[selectedRecord.id];

        if (!detail) {
          return current;
        }

        return {
          ...current,
          [selectedRecord.id]: {
            ...detail,
            transcriptSegments: detail.transcriptSegments.map((s) =>
              s.id === segmentId
                ? {
                    ...s,
                    speakerLabel: newLabel,
                    speakerTone: parsedTone.data,
                  }
                : s,
            ),
          },
        };
      });
    } catch {
      setSaveToast("화자 변경에 실패했습니다.");
    }
  }

  return {
    editingSegmentId,
    editingSegmentText,
    setEditingSegmentText,
    editingSegmentSaving,
    transcriptQuery,
    setTranscriptQuery,
    normalizedTranscriptQuery,
    computeTranscriptMatchCount,
    startEditingSegment,
    cancelEditingSegment,
    saveEditingSegment,
    handleSpeakerLabelChange,
  };
}
