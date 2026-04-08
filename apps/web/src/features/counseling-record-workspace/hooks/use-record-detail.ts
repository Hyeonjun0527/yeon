import {
  counselingRecordDetailResponseSchema,
  type CounselingRecordDetail,
  type CounselingRecordListItem,
} from "@yeon/api-contract";
import { useEffect, useRef, useState, startTransition, type Dispatch, type SetStateAction } from "react";
import type { UploadTone } from "../types";
import { PROCESSING_REFRESH_INTERVAL_MS } from "../constants";
import { fetchApi, buildClientRequestId, upsertRecordList } from "../utils";

export function useRecordDetail(
  selectedRecordId: string | null,
  selectedRecord: CounselingRecordListItem | null,
  setRecords: Dispatch<SetStateAction<CounselingRecordListItem[]>>,
) {
  const [recordDetails, setRecordDetails] = useState<
    Record<string, CounselingRecordDetail | null>
  >({});
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isDetailMetaOpen, setIsDetailMetaOpen] = useState(false);
  const [retryState, setRetryState] = useState<{
    isSubmitting: boolean;
    message: string | null;
    tone: UploadTone;
  }>({
    isSubmitting: false,
    message: null,
    tone: "idle",
  });

  const recordDetailsRef = useRef(recordDetails);
  recordDetailsRef.current = recordDetails;

  const selectedRecordDetail = selectedRecordId
    ? (recordDetails[selectedRecordId] ?? null)
    : null;

  // 상세 로드
  useEffect(() => {
    if (!selectedRecordId || selectedRecordId in recordDetailsRef.current) {
      return;
    }

    let ignore = false;

    async function loadDetail() {
      setIsLoadingDetail(true);

      try {
        const data = await fetchApi(
          `/api/v1/counseling-records/${selectedRecordId}`,
          {
            method: "GET",
          },
          counselingRecordDetailResponseSchema.parse,
        );

        if (ignore) {
          return;
        }

        startTransition(() => {
          setRecordDetails((current) => ({
            ...current,
            [data.record.id]: data.record,
          }));
          setRecords((current) => upsertRecordList(current, data.record));
        });
      } catch (error) {
        if (ignore) {
          return;
        }

        // 실패한 ID를 null로 기록하여 무한 재시도 방지
        setRecordDetails((current) => ({
          ...current,
          [selectedRecordId!]: null,
        }));
        setRetryState({
          isSubmitting: false,
          message:
            error instanceof Error
              ? error.message
              : "상담 기록 상세를 불러오지 못했습니다.",
          tone: "error",
        });
      } finally {
        if (!ignore) {
          setIsLoadingDetail(false);
        }
      }
    }

    void loadDetail();

    return () => {
      ignore = true;
    };
  }, [selectedRecordId, setRecords]);

  // processing 상태 자동 갱신 폴링 (5s)
  useEffect(() => {
    if (!selectedRecordId || selectedRecord?.status !== "processing") {
      return;
    }

    const timer = window.setInterval(() => {
      void refreshRecordDetail(selectedRecordId, { silent: true });
    }, PROCESSING_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [selectedRecord?.status, selectedRecordId]);

  async function refreshRecordDetail(
    recordId: string,
    options?: {
      silent?: boolean;
    },
  ) {
    if (!options?.silent) {
      setRetryState({
        isSubmitting: true,
        message: null,
        tone: "idle",
      });
    }

    try {
      const data = await fetchApi(
        `/api/v1/counseling-records/${recordId}`,
        {
          method: "GET",
        },
        counselingRecordDetailResponseSchema.parse,
      );

      startTransition(() => {
        setRecordDetails((current) => ({
          ...current,
          [data.record.id]: data.record,
        }));
        setRecords((current) => upsertRecordList(current, data.record));
      });

      if (!options?.silent) {
        setRetryState({
          isSubmitting: false,
          message: "최신 상태로 새로고침했습니다.",
          tone: "success",
        });
      }
    } catch (error) {
      if (!options?.silent) {
        setRetryState({
          isSubmitting: false,
          message:
            error instanceof Error
              ? error.message
              : "상담 기록 상태를 새로고침하지 못했습니다.",
          tone: "error",
        });
      }
    }
  }

  async function retryTranscription(recordId: string) {
    setRetryState({
      isSubmitting: true,
      message: null,
      tone: "idle",
    });

    try {
      const data = await fetchApi(
        `/api/v1/counseling-records/${recordId}/transcribe`,
        {
          method: "POST",
          headers: {
            "X-Client-Request-Id": buildClientRequestId(),
          },
        },
        counselingRecordDetailResponseSchema.parse,
      );

      startTransition(() => {
        setRecordDetails((current) => ({
          ...current,
          [data.record.id]: data.record,
        }));
        setRecords((current) => upsertRecordList(current, data.record));
      });
      setRetryState({
        isSubmitting: false,
        message:
          "재전사를 다시 시작했습니다. 처리 중 상태를 자동으로 갱신합니다.",
        tone: "success",
      });
    } catch (error) {
      setRetryState({
        isSubmitting: false,
        message:
          error instanceof Error
            ? error.message
            : "음성 재전사를 처리하지 못했습니다.",
        tone: "error",
      });
    }
  }

  function clearRecordDetail(recordId: string) {
    setRecordDetails((current) => {
      const next = { ...current };
      delete next[recordId];
      return next;
    });
  }

  return {
    selectedRecordDetail,
    isLoadingDetail,
    isDetailMetaOpen,
    setIsDetailMetaOpen,
    retryState,
    setRetryState,
    refreshRecordDetail,
    retryTranscription,
    setRecordDetails,
    recordDetails,
    clearRecordDetail,
  };
}
