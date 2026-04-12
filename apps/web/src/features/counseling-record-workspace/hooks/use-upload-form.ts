import {
  counselingRecordDetailResponseSchema,
  type CounselingRecordDetail,
} from "@yeon/api-contract/counseling-records";
import { useEffect, useRef, useState, type FormEvent } from "react";

import {
  AUDIO_UPLOAD_ERROR_MESSAGE,
  isAcceptedAudioFile,
} from "@/lib/audio-file";

import type { RecordingPhase, UploadFormState, UploadTone } from "../types";
import { COUNSELING_TYPE_OPTIONS, MAX_AUDIO_UPLOAD_BYTES } from "../constants";
import { fetchApi, buildClientRequestId, readAudioDurationMs } from "../utils";

interface UseUploadFormCallbacks {
  onRecordCreated: (record: CounselingRecordDetail) => void;
  setSaveToast: (message: string) => void;
  setRecentlySavedId: (id: string) => void;
  recordingPhase: RecordingPhase;
}

export function useUploadForm(callbacks: UseUploadFormCallbacks) {
  const { onRecordCreated, setSaveToast, setRecentlySavedId, recordingPhase } =
    callbacks;

  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false);
  const [formState, setFormState] = useState<UploadFormState>({
    studentName: "",
    sessionTitle: "",
    counselingType: COUNSELING_TYPE_OPTIONS[0],
  });
  const [uploadState, setUploadState] = useState<{
    isUploading: boolean;
    message: string | null;
    tone: UploadTone;
  }>({
    isUploading: false,
    message: null,
    tone: "idle",
  });
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [selectedAudioDurationMs, setSelectedAudioDurationMs] = useState<
    number | null
  >(null);
  const [selectedAudioPreviewUrl, setSelectedAudioPreviewUrl] = useState<
    string | null
  >(null);
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const hasAudioReady = Boolean(selectedAudioFile) && recordingPhase === "idle";

  function getDefaultSessionTitle(file: File) {
    const trimmedName = file.name.replace(/\.[^/.]+$/, "").trim();

    if (trimmedName) {
      return trimmedName;
    }

    const now = new Date();
    return `녹음 ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }

  // preview URL revoke
  useEffect(() => {
    const urlToRevoke = selectedAudioPreviewUrl;

    return () => {
      if (urlToRevoke) {
        URL.revokeObjectURL(urlToRevoke);
      }
    };
  }, [selectedAudioPreviewUrl]);

  function updateFormState<K extends keyof UploadFormState>(
    key: K,
    value: UploadFormState[K],
  ) {
    setFormState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function applySelectedAudioFile(file: File) {
    if (file.size > MAX_AUDIO_UPLOAD_BYTES) {
      setUploadState({
        isUploading: false,
        message: `음성 파일은 ${Math.floor(MAX_AUDIO_UPLOAD_BYTES / 1024 / 1024)}MB 이하만 업로드할 수 있습니다.`,
        tone: "error",
      });
      return undefined;
    }

    if (!isAcceptedAudioFile(file)) {
      setUploadState({
        isUploading: false,
        message: AUDIO_UPLOAD_ERROR_MESSAGE,
        tone: "error",
      });
      return undefined;
    }

    const durationMs = await readAudioDurationMs(file);
    const previewUrl = URL.createObjectURL(file);

    setSelectedAudioFile(file);
    setSelectedAudioDurationMs(durationMs);
    setUploadState({
      isUploading: false,
      message: null,
      tone: "idle",
    });
    setSelectedAudioPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return previewUrl;
    });
    setFormState((current) => ({
      ...current,
      sessionTitle: current.sessionTitle || getDefaultSessionTitle(file),
    }));

    return durationMs;
  }

  async function uploadAudioRecord(params: {
    file: File;
    studentName: string;
    sessionTitle: string;
    counselingType: string;
    durationMs: number | null;
  }) {
    const { file, studentName, sessionTitle, counselingType, durationMs } =
      params;

    const formData = new FormData();
    formData.set("audio", file);
    formData.set("studentName", studentName);
    formData.set("sessionTitle", sessionTitle);
    formData.set("counselingType", counselingType);

    if (durationMs) {
      formData.set("audioDurationMs", String(durationMs));
    }

    const data = await fetchApi(
      "/api/v1/counseling-records",
      {
        method: "POST",
        headers: {
          "X-Client-Request-Id": buildClientRequestId(),
        },
        body: formData,
      },
      counselingRecordDetailResponseSchema.parse,
    );

    onRecordCreated(data.record);

    setUploadState({
      isUploading: false,
      message: null,
      tone: "idle",
    });
    setSaveToast(
      "기록이 저장되었습니다. 이제 백그라운드에서 전사와 분석을 진행합니다.",
    );
    setRecentlySavedId(data.record.id);
    setSelectedAudioFile(null);
    setSelectedAudioDurationMs(null);
    setSelectedAudioPreviewUrl((current) => {
      if (current) {
        URL.revokeObjectURL(current);
      }

      return null;
    });
    setFormState({
      studentName: "",
      sessionTitle: "",
      counselingType: COUNSELING_TYPE_OPTIONS[0],
    });
    setIsAdditionalInfoOpen(false);
    setIsUploadPanelOpen(false);
  }

  async function createRecordFromAudioFile(
    file: File,
    options?: {
      studentName?: string;
      sessionTitle?: string;
      counselingType?: string;
    },
  ) {
    const safeStudentName =
      options?.studentName?.trim() || formState.studentName.trim();
    const safeSessionTitle =
      options?.sessionTitle?.trim() ||
      formState.sessionTitle.trim() ||
      getDefaultSessionTitle(file);
    const safeCounselingType =
      options?.counselingType?.trim() || formState.counselingType.trim();

    const durationMs = await applySelectedAudioFile(file);

    if (durationMs === undefined) {
      return;
    }

    setUploadState({
      isUploading: true,
      message: "녹음을 저장하고 백그라운드 전사·분석 작업을 등록합니다.",
      tone: "idle",
    });

    try {
      await uploadAudioRecord({
        file,
        studentName: safeStudentName,
        sessionTitle: safeSessionTitle,
        counselingType: safeCounselingType,
        durationMs,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "상담 음성 업로드를 처리하지 못했습니다.";

      setFormState((current) => ({
        ...current,
        studentName: current.studentName || safeStudentName,
        sessionTitle: current.sessionTitle || safeSessionTitle,
        counselingType: current.counselingType || safeCounselingType,
      }));
      setUploadState({
        isUploading: false,
        message,
        tone: "error",
      });
      throw error;
    }
  }

  async function handleAudioFileChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const nextFile = event.target.files?.[0];

    if (!nextFile) {
      return;
    }

    await applySelectedAudioFile(nextFile);
    event.target.value = "";
  }

  async function handleUploadSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAudioFile) {
      setUploadState({
        isUploading: false,
        message: "먼저 음성 파일을 선택하거나 녹음을 완료해 주세요.",
        tone: "error",
      });
      return;
    }

    if (!formState.studentName.trim()) {
      setUploadState({
        isUploading: false,
        message: "수강생 이름을 입력해 주세요.",
        tone: "error",
      });
      return;
    }

    if (!formState.sessionTitle.trim()) {
      setUploadState({
        isUploading: false,
        message: "상담 제목을 입력해 주세요.",
        tone: "error",
      });
      return;
    }

    setUploadState({
      isUploading: true,
      message: "원본 음성을 저장하고 백그라운드 전사·분석 작업을 등록합니다.",
      tone: "idle",
    });

    try {
      await uploadAudioRecord({
        file: selectedAudioFile,
        studentName: formState.studentName.trim(),
        sessionTitle: formState.sessionTitle.trim(),
        counselingType: formState.counselingType.trim(),
        durationMs: selectedAudioDurationMs,
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "상담 음성 업로드를 처리하지 못했습니다.";

      setUploadState({
        isUploading: false,
        message,
        tone: "error",
      });
    }
  }

  return {
    isUploadPanelOpen,
    setIsUploadPanelOpen,
    formState,
    uploadState,
    setUploadState,
    selectedAudioFile,
    selectedAudioDurationMs,
    selectedAudioPreviewUrl,
    isAdditionalInfoOpen,
    setIsAdditionalInfoOpen,
    fileInputRef,
    hasAudioReady,
    updateFormState,
    applySelectedAudioFile,
    createRecordFromAudioFile,
    handleAudioFileChange,
    handleUploadSubmit,
  };
}
