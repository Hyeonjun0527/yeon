import { useDeferredValue, useState, type Dispatch, type SetStateAction } from "react";
import type { CounselingRecordDetail, CounselingRecordListItem } from "@yeon/api-contract";
import { isTranscriptSegmentMatched } from "../utils";

export function useTranscriptEditor(
  selectedRecord: CounselingRecordListItem | null,
  setRecordDetails: Dispatch<SetStateAction<Record<string, CounselingRecordDetail>>>,
  setSaveToast: (message: string) => void,
) {
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentText, setEditingSegmentText] = useState("");
  const [editingSegmentSaving, setEditingSegmentSaving] = useState(false);
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
    if (!selectedRecord || !editingSegmentId || editingSegmentSaving) {
      return;
    }

    setEditingSegmentSaving(true);

    try {
      const response = await fetch(
        `/api/v1/counseling-records/${selectedRecord.id}/segments/${editingSegmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: editingSegmentText }),
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
              s.id === editingSegmentId
                ? { ...s, text: editingSegmentText }
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

    try {
      const response = await fetch(
        `/api/v1/counseling-records/${selectedRecord.id}/segments/${segmentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            speakerLabel: newLabel,
            speakerTone: newTone,
          }),
        },
      );

      if (!response.ok) {
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
                    speakerTone: newTone as typeof s.speakerTone,
                  }
                : s,
            ),
          },
        };
      });
    } catch {
      // 실패 시 무시 (이미 서버에 반영 안 됨)
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
