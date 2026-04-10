import {
  counselingRecordDetailResponseSchema,
  type CounselingRecordDetail,
} from "@yeon/api-contract/counseling-records";
import { useEffect, useRef, useState, type FormEvent } from "react";
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
      return;
    }

    if (!file.type.startsWith("audio/")) {
      setUploadState({
        isUploading: false,
        message: "오디오 파일만 선택할 수 있습니다.",
        tone: "error",
      });
      return;
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
      sessionTitle: current.sessionTitle || file.name.replace(/\.[^/.]+$/, ""),
    }));
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
      message: "원본 음성을 저장하고 한국어 전사를 큐에 등록합니다.",
      tone: "idle",
    });

    const formData = new FormData();
    formData.set("audio", selectedAudioFile);
    formData.set("studentName", formState.studentName.trim());
    formData.set("sessionTitle", formState.sessionTitle.trim());
    formData.set("counselingType", formState.counselingType.trim());

    if (selectedAudioDurationMs) {
      formData.set("audioDurationMs", String(selectedAudioDurationMs));
    }

    try {
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
      setSaveToast("기록이 저장되었습니다. 전사를 시작합니다.");
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
    handleAudioFileChange,
    handleUploadSubmit,
  };
}
