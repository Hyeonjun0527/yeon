import { useState, type Dispatch, type SetStateAction } from "react";
import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";

export function useDeleteRecord(
  selectedRecord: CounselingRecordListItem | null,
  setRecords: Dispatch<SetStateAction<CounselingRecordListItem[]>>,
  setSelectedRecordId: (id: string | null) => void,
  setSaveToast: (message: string) => void,
  clearRecordDetail: (recordId: string) => void,
  clearAssistantMessages: (recordId: string) => void,
) {
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDeleteRecord() {
    if (!selectedRecord || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        `/api/v1/counseling-records/${selectedRecord.id}`,
        { method: "DELETE" },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          message?: string;
        } | null;
        throw new Error(
          body?.message ?? "상담 기록 삭제에 실패했습니다.",
        );
      }

      setRecords((current) =>
        current.filter((record) => record.id !== selectedRecord.id),
      );
      clearRecordDetail(selectedRecord.id);
      clearAssistantMessages(selectedRecord.id);
      setSelectedRecordId(null);
      setIsDeleteConfirmOpen(false);
      setSaveToast("기록이 삭제되었습니다.");
    } catch (error) {
      setSaveToast(
        error instanceof Error
          ? error.message
          : "삭제에 실패했습니다.",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  return {
    isDeleteConfirmOpen,
    setIsDeleteConfirmOpen,
    isDeleting,
    handleDeleteRecord,
  };
}
