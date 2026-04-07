"use client";

import {
  counselingRecordDetailResponseSchema,
  counselingRecordSpeakerToneSchema,
  errorResponseSchema,
  listCounselingRecordsResponseSchema,
  type CounselingRecordDetail,
  type CounselingRecordListItem,
} from "@yeon/api-contract";
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  startTransition,
  type FormEvent,
  type ReactNode,
} from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  ClipboardCopy,
  Download,
  FileAudio,
  FileText,
  Filter,
  List,
  LoaderCircle,
  LogOut,
  Mic,
  RefreshCcw,
  Search,
  SendHorizonal,
  Square,
  Trash2,
  TriangleAlert,
  Upload,
  Users,
  X,
} from "lucide-react";

import styles from "./counseling-record-workspace.module.css";

type RecordFilter = "all" | CounselingRecordListItem["status"];
type SidebarViewMode = "all" | "student";
type UploadTone = "idle" | "success" | "error";
type MessageRole = "assistant" | "user";
type UploadFormState = {
  studentName: string;
  sessionTitle: string;
  counselingType: string;
};
type Message = {
  id: string;
  role: MessageRole;
  content: string;
  supportingNote?: string;
  isStreaming?: boolean;
};
type ApiRequestError = Error & {
  status: number;
};

const MAX_AUDIO_UPLOAD_BYTES = 128 * 1024 * 1024;
const PROCESSING_REFRESH_INTERVAL_MS = 5000;
const COUNSELING_TYPE_OPTIONS = [
  "대면 상담",
  "전화 상담",
  "온라인 상담",
  "보호자 통화",
] as const;

const STATUS_META: Record<
  CounselingRecordListItem["status"],
  {
    label: string;
    className: string;
    detail: string;
    icon: typeof CheckCheck;
  }
> = {
  ready: {
    label: "원문 저장 완료",
    className: styles.statusReady,
    detail: "음성 저장과 한국어 전사가 끝나 원문을 바로 검토할 수 있습니다.",
    icon: CheckCheck,
  },
  processing: {
    label: "전사 처리 중",
    className: styles.statusProcessing,
    detail:
      "원본 음성은 저장되었고 한국어 STT를 처리하고 있습니다. 긴 파일은 서버에서 분할 전사한 뒤 자동으로 상태를 갱신합니다.",
    icon: LoaderCircle,
  },
  error: {
    label: "전사 실패",
    className: styles.statusError,
    detail:
      "원본 음성은 남아 있습니다. 오류를 확인한 뒤 다시 전사할 수 있습니다.",
    icon: TriangleAlert,
  },
};

const FILTER_META: Array<{
  id: RecordFilter;
  label: string;
}> = [
  { id: "all", label: "전체" },
  { id: "ready", label: "원문 준비" },
  { id: "processing", label: "처리 중" },
  { id: "error", label: "오류" },
];

function formatDateTimeLabel(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDurationLabel(value: number | null) {
  if (!value || value <= 0) {
    return "길이 미확인";
  }

  const totalSeconds = Math.max(Math.round(value / 1000), 1);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}시간 ${minutes}분 ${seconds}초`;
  }

  return `${minutes}분 ${seconds}초`;
}

function formatCompactDuration(value: number | null) {
  if (!value || value <= 0) {
    return "미확인";
  }

  const totalSeconds = Math.max(Math.round(value / 1000), 1);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatTranscriptTime(value: number | null) {
  if (value === null || value < 0) {
    return "원문";
  }

  const totalSeconds = Math.floor(value / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function isTranscriptSegmentActive(params: {
  currentTimeMs: number | null;
  startMs: number | null;
  endMs: number | null;
  nextStartMs: number | null;
}) {
  if (params.currentTimeMs === null || params.startMs === null) {
    return false;
  }

  const fallbackEndMs =
    params.nextStartMs ?? params.startMs + 4000;
  const effectiveEndMs = Math.max(
    params.endMs ?? fallbackEndMs,
    params.startMs + 500,
  );

  return (
    params.currentTimeMs >= params.startMs &&
    params.currentTimeMs < effectiveEndMs
  );
}

function formatFileSize(value: number) {
  if (value >= 1024 * 1024) {
    return `${(value / 1024 / 1024).toFixed(1)}MB`;
  }

  if (value >= 1024) {
    return `${Math.round(value / 1024)}KB`;
  }

  return `${value}B`;
}

const SPEAKER_CYCLE = [
  { label: "교사", tone: "teacher" },
  { label: "학생", tone: "student" },
  { label: "보호자", tone: "guardian" },
  { label: "기타", tone: "unknown" },
] as const;

function getNextSpeaker(currentTone: string) {
  const currentIndex = SPEAKER_CYCLE.findIndex((s) => s.tone === currentTone);
  const nextIndex = (currentIndex + 1) % SPEAKER_CYCLE.length;

  return SPEAKER_CYCLE[nextIndex];
}

function getSpeakerToneClass(
  speakerTone: CounselingRecordDetail["transcriptSegments"][number]["speakerTone"],
) {
  const parsedTone = counselingRecordSpeakerToneSchema.parse(speakerTone);

  switch (parsedTone) {
    case "teacher":
      return styles.teacherTone;
    case "student":
      return styles.studentTone;
    case "guardian":
      return styles.guardianTone;
    case "unknown":
    default:
      return styles.unknownTone;
  }
}

function isTranscriptSegmentMatched(
  segment: CounselingRecordDetail["transcriptSegments"][number],
  normalizedQuery: string,
) {
  if (!normalizedQuery) {
    return false;
  }

  return `${segment.speakerLabel} ${segment.text}`
    .toLowerCase()
    .includes(normalizedQuery);
}

function renderHighlightedText(text: string, normalizedQuery: string) {
  if (!normalizedQuery) {
    return text;
  }

  const lowerText = text.toLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    const matchIndex = lowerText.indexOf(normalizedQuery, cursor);

    if (matchIndex === -1) {
      parts.push(text.slice(cursor));
      break;
    }

    if (matchIndex > cursor) {
      parts.push(text.slice(cursor, matchIndex));
    }

    parts.push(
      <mark
        key={`${matchIndex}-${normalizedQuery}`}
        className={styles.highlightText}
      >
        {text.slice(matchIndex, matchIndex + normalizedQuery.length)}
      </mark>,
    );
    cursor = matchIndex + normalizedQuery.length;
  }

  return parts;
}

async function readErrorMessage(response: Response) {
  try {
    const data = await response.json();
    const parsed = errorResponseSchema.safeParse(data);

    if (parsed.success) {
      return parsed.data.message;
    }
  } catch {
    return null;
  }

  return null;
}

async function fetchApi<TSchema>(
  path: string,
  init: RequestInit,
  parse: (input: unknown) => TSchema,
) {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
  });

  if (!response.ok) {
    const error = new Error(
      (await readErrorMessage(response)) ?? "요청을 처리하지 못했습니다.",
    ) as ApiRequestError;
    error.status = response.status;
    throw error;
  }

  const data = await response.json();

  return parse(data);
}

async function readAudioDurationMs(file: File) {
  if (typeof window === "undefined") {
    return null;
  }

  return new Promise<number | null>((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const audioElement = document.createElement("audio");
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      audioElement.removeAttribute("src");
    };

    audioElement.preload = "metadata";
    audioElement.onloadedmetadata = () => {
      const durationSeconds = audioElement.duration;
      cleanup();
      resolve(
        Number.isFinite(durationSeconds) && durationSeconds > 0
          ? Math.round(durationSeconds * 1000)
          : null,
      );
    };
    audioElement.onerror = () => {
      cleanup();
      resolve(null);
    };
    audioElement.src = objectUrl;
  });
}

function buildClientRequestId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `counseling-record-${Date.now()}`;
}

function upsertRecordList(
  current: CounselingRecordListItem[],
  nextRecord: CounselingRecordListItem,
) {
  const filtered = current.filter((record) => record.id !== nextRecord.id);

  return [nextRecord, ...filtered].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

function buildQuickPrompts(record: CounselingRecordListItem) {
  if (record.status === "error") {
    return [
      "전사 실패 원인부터 정리해줘",
      "재전사 전에 확인할 점만 뽑아줘",
      "원본 상태 기준 운영 메모를 써줘",
    ];
  }

  if (record.status === "processing") {
    return [
      "현재 상태를 알려줘",
    ];
  }

  return [
    "이 상담 내용을 분석해줘",
    "보호자 공유 포인트만 정리해줘",
    "다음 상담에서 물어볼 질문을 만들어줘",
  ];
}

function buildInitialAssistantMessages(
  record: CounselingRecordListItem,
): Message[] {
  if (record.status !== "ready") {
    return [
      {
        id: `${record.id}-assistant-status`,
        role: "assistant",
        content: `${record.studentName} 기록은 현재 ${STATUS_META[record.status].label} 상태입니다. 원문이 준비되면 AI 분석을 시작할 수 있습니다.`,
      },
    ];
  }

  return [
    {
      id: `${record.id}-assistant-welcome`,
      role: "assistant",
      content: `${record.studentName} 상담 기록이 준비되었습니다. 원문을 바탕으로 분석, 요약, 후속 조치 제안을 도와드릴게요. 아래 빠른 질문을 눌러보거나 직접 질문해 주세요.`,
    },
  ];
}

export function CounselingRecordWorkspace() {
  const [records, setRecords] = useState<CounselingRecordListItem[]>([]);
  const [recordDetails, setRecordDetails] = useState<
    Record<string, CounselingRecordDetail>
  >({});
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [sidebarViewMode, setSidebarViewMode] =
    useState<SidebarViewMode>("all");
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(
    new Set(),
  );
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(
    null,
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isDetailMetaOpen, setIsDetailMetaOpen] = useState(false);
  const [transcriptQuery, setTranscriptQuery] = useState("");
  const [assistantDraft, setAssistantDraft] = useState("");
  const [assistantMessagesByRecord, setAssistantMessagesByRecord] = useState<
    Record<string, Message[]>
  >({});
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [selectedAudioFile, setSelectedAudioFile] = useState<File | null>(null);
  const [selectedAudioDurationMs, setSelectedAudioDurationMs] = useState<
    number | null
  >(null);
  const [selectedAudioPreviewUrl, setSelectedAudioPreviewUrl] = useState<
    string | null
  >(null);
  const [uploadState, setUploadState] = useState<{
    isUploading: boolean;
    message: string | null;
    tone: UploadTone;
  }>({
    isUploading: false,
    message: null,
    tone: "idle",
  });
  const [retryState, setRetryState] = useState<{
    isSubmitting: boolean;
    message: string | null;
    tone: UploadTone;
  }>({
    isSubmitting: false,
    message: null,
    tone: "idle",
  });
  const [formState, setFormState] = useState<UploadFormState>({
    studentName: "",
    sessionTitle: "",
    counselingType: COUNSELING_TYPE_OPTIONS[0],
  });
  const [isRecording, setIsRecording] = useState(false);
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false);
  const [isAdditionalInfoOpen, setIsAdditionalInfoOpen] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingElapsedMs, setRecordingElapsedMs] = useState(0);
  const [currentAudioTimeMs, setCurrentAudioTimeMs] = useState<number | null>(
    null,
  );
  const [audioLoadError, setAudioLoadError] = useState<string | null>(null);
  const [isAutoScrollEnabled, setIsAutoScrollEnabled] = useState(true);
  // 78차: 추이 분석 상태
  const [trendAnalysis, setTrendAnalysis] = useState<{
    studentName: string;
    content: string;
    isStreaming: boolean;
  } | null>(null);
  const trendAbortControllerRef = useRef<AbortController | null>(null);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [recentlySavedId, setRecentlySavedId] = useState<string | null>(null);
  const [isAiExportOpen, setIsAiExportOpen] = useState(false);
  const [isAiStreaming, setIsAiStreaming] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [editingSegmentText, setEditingSegmentText] = useState("");
  const [editingSegmentSaving, setEditingSegmentSaving] = useState(false);
  const aiAbortControllerRef = useRef<AbortController | null>(null);
  const autoAnalysisTriggeredRef = useRef<Set<string>>(new Set());

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const messageListRef = useRef<HTMLDivElement | null>(null);
  const activeSegmentRef = useRef<HTMLElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();
  const deferredTranscriptQuery = useDeferredValue(transcriptQuery);
  const normalizedTranscriptQuery = deferredTranscriptQuery
    .trim()
    .toLowerCase();

  const filteredRecords = records.filter((record) => {
    if (recordFilter !== "all" && record.status !== recordFilter) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    return [
      record.studentName,
      record.sessionTitle,
      record.preview,
      ...record.tags,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedSearchTerm);
  });

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedRecordId) ??
    records.find((record) => record.id === selectedRecordId) ??
    null;
  const selectedRecordDetail = selectedRecordId
    ? (recordDetails[selectedRecordId] ?? null)
    : null;
  const transcriptMatchCount = selectedRecordDetail
    ? selectedRecordDetail.transcriptSegments.filter((segment) =>
        isTranscriptSegmentMatched(segment, normalizedTranscriptQuery),
      ).length
    : 0;
  // 78차: 학생별 그룹
  const studentGroups = (() => {
    const map = new Map<
      string,
      { records: CounselingRecordListItem[]; lastCounselingAt: string }
    >();

    for (const record of filteredRecords) {
      const group = map.get(record.studentName);

      if (group) {
        group.records.push(record);

        if (record.createdAt > group.lastCounselingAt) {
          group.lastCounselingAt = record.createdAt;
        }
      } else {
        map.set(record.studentName, {
          records: [record],
          lastCounselingAt: record.createdAt,
        });
      }
    }

    return Array.from(map.entries())
      .map(([name, { records: groupRecords, lastCounselingAt }]) => ({
        studentName: name,
        records: groupRecords,
        recordCount: groupRecords.length,
        lastCounselingAt,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastCounselingAt).getTime() -
          new Date(a.lastCounselingAt).getTime(),
      );
  })();

  const quickPrompts = selectedRecord ? buildQuickPrompts(selectedRecord) : [];
  const assistantMessages = selectedRecord
    ? (assistantMessagesByRecord[selectedRecord.id] ?? [])
    : [];

  useEffect(() => {
    const container = messageListRef.current;

    if (!container) {
      return;
    }

    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight < 80;

    if (isNearBottom || isAiStreaming) {
      container.scrollTop = container.scrollHeight;
    }
  }, [assistantMessages, isAiStreaming]);

  // 77차: 내보내기 드롭다운 바깥 클릭 닫기
  useEffect(() => {
    if (!isAiExportOpen) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAiExportOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAiExportOpen]);

  useEffect(() => {
    let ignore = false;

    async function loadList() {
      setIsLoadingList(true);
      setLoadError(null);

      try {
        const data = await fetchApi(
          "/api/v1/counseling-records",
          {
            method: "GET",
          },
          listCounselingRecordsResponseSchema.parse,
        );

        if (ignore) {
          return;
        }

        startTransition(() => {
          setRecords(data.records);
          setSelectedRecordId(
            (current) => current ?? data.records[0]?.id ?? null,
          );

        });
      } catch (error) {
        if (ignore) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "상담 기록 목록을 불러오지 못했습니다.";
        setLoadError(message);
      } finally {
        if (!ignore) {
          setIsLoadingList(false);
        }
      }
    }

    void loadList();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedRecordId || recordDetails[selectedRecordId]) {
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
  }, [recordDetails, selectedRecordId]);

  useEffect(() => {
    if (filteredRecords.length === 0) {
      return;
    }

    const selectedRecordIsVisible = filteredRecords.some(
      (record) => record.id === selectedRecordId,
    );

    if (selectedRecordIsVisible) {
      return;
    }

    startTransition(() => {
      setSelectedRecordId(filteredRecords[0].id);

      setTranscriptQuery("");
      setRetryState((current) => ({
        ...current,
        message: null,
        tone: "idle",
      }));
    });
  }, [filteredRecords, selectedRecordId]);

  // 기록 0건일 때 자동 업로드 패널 열기 제거 — 빈 상태 CTA로 대체

  // 31차: 재생 중 active segment 자동 스크롤
  useEffect(() => {
    if (!isAutoScrollEnabled || !activeSegmentRef.current) {
      return;
    }

    activeSegmentRef.current.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [currentAudioTimeMs, isAutoScrollEnabled]);

  // 32차: 저장 toast 자동 해제
  useEffect(() => {
    if (!saveToast) {
      return;
    }

    const timer = setTimeout(() => setSaveToast(null), 3000);

    return () => clearTimeout(timer);
  }, [saveToast]);

  // 32차: 최근 저장 하이라이트 자동 해제
  useEffect(() => {
    if (!recentlySavedId) {
      return;
    }

    const timer = setTimeout(() => setRecentlySavedId(null), 2000);

    return () => clearTimeout(timer);
  }, [recentlySavedId]);

  // 42차: 키보드 내비게이션
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.tagName === "SELECT";

      if (isInput) {
        return;
      }

      if (event.key === " " && audioPlayerRef.current) {
        event.preventDefault();
        if (audioPlayerRef.current.paused) {
          audioPlayerRef.current.play();
        } else {
          audioPlayerRef.current.pause();
        }
      }

    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!selectedRecord) {
      return;
    }
    setAssistantDraft("");
    setAssistantMessagesByRecord((current) => {
      const existingMessages = current[selectedRecord.id];
      const nextMessages = buildInitialAssistantMessages(selectedRecord);

      if (!existingMessages) {
        return {
          ...current,
          [selectedRecord.id]: nextMessages,
        };
      }

      if (existingMessages.some((message) => message.role === "user")) {
        return current;
      }

      const existingSignature = existingMessages
        .map(
          (message) =>
            `${message.role}:${message.content}:${message.supportingNote ?? ""}`,
        )
        .join("|");
      const nextSignature = nextMessages
        .map(
          (message) =>
            `${message.role}:${message.content}:${message.supportingNote ?? ""}`,
        )
        .join("|");

      if (existingSignature === nextSignature) {
        return current;
      }

      return {
        ...current,
        [selectedRecord.id]: nextMessages,
      };
    });
  }, [selectedRecord, selectedRecordDetail]);

  useEffect(() => {
    if (
      !selectedRecord ||
      selectedRecord.status !== "ready" ||
      !selectedRecordDetail?.transcriptSegments.length ||
      isAiStreaming
    ) {
      return;
    }

    if (autoAnalysisTriggeredRef.current.has(selectedRecord.id)) {
      return;
    }

    const existingMessages = assistantMessagesByRecord[selectedRecord.id];

    if (existingMessages?.some((m) => m.role === "user")) {
      return;
    }

    autoAnalysisTriggeredRef.current.add(selectedRecord.id);

    const analysisPrompt = "이 상담 내용을 분석해줘";
    const welcomeMessages = buildInitialAssistantMessages(selectedRecord);
    const userMessage: Message = {
      id: `${selectedRecord.id}-user-auto-${Date.now()}`,
      role: "user",
      content: analysisPrompt,
    };
    const allMessages = [...welcomeMessages, userMessage];

    setAssistantMessagesByRecord((current) => ({
      ...current,
      [selectedRecord.id]: allMessages,
    }));

    streamAssistantResponse(selectedRecord.id, allMessages);
  }, [selectedRecord, selectedRecordDetail, isAiStreaming, assistantMessagesByRecord]);

  useEffect(() => {
    setCurrentAudioTimeMs(null);
    setAudioLoadError(null);

    return () => {
      audioPlayerRef.current?.pause();
    };
  }, [selectedRecordId, selectedRecordDetail?.audioUrl]);

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

  useEffect(() => {
    if (!isRecording) {
      return;
    }

    const timer = window.setInterval(() => {
      if (!recordingStartedAtRef.current) {
        return;
      }

      setRecordingElapsedMs(Date.now() - recordingStartedAtRef.current);
    }, 250);

    return () => {
      window.clearInterval(timer);
    };
  }, [isRecording]);

  useEffect(() => {
    return () => {
      if (selectedAudioPreviewUrl) {
        URL.revokeObjectURL(selectedAudioPreviewUrl);
      }

      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
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
    setRetryState((current) => ({
      ...current,
      message: null,
      tone: "idle",
    }));
    setRecordingError(null);
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

  async function startRecording() {
    if (typeof window === "undefined") {
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      setRecordingError(
        "이 브라우저에서는 음성 녹음을 지원하지 않습니다. 파일 업로드를 사용해 주세요.",
      );
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError(
        "브라우저 마이크 권한을 사용할 수 없습니다. 파일 업로드를 사용해 주세요.",
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ].find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
      const recorder = mimeType
        ? new MediaRecorder(stream, {
            mimeType,
            audioBitsPerSecond: 64000,
          })
        : new MediaRecorder(stream, {
            audioBitsPerSecond: 64000,
          });

      recordedChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();
      setRecordingElapsedMs(0);
      setRecordingError(null);
      setUploadState({
        isUploading: false,
        message: null,
        tone: "idle",
      });

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      });

      recorder.addEventListener("stop", async () => {
        const activeType = recorder.mimeType || mimeType || "audio/webm";
        const extension = activeType.includes("webm")
          ? ".webm"
          : activeType.includes("ogg")
            ? ".ogg"
            : activeType.includes("mp4")
              ? ".m4a"
              : ".wav";
        const chunks = recordedChunksRef.current;

        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
        mediaRecorderRef.current = null;
        recordedChunksRef.current = [];
        recordingStartedAtRef.current = null;
        setIsRecording(false);
        setIsFinalizingRecording(true);

        if (chunks.length === 0) {
          setIsFinalizingRecording(false);
          setRecordingError("녹음 데이터가 비어 있어 저장하지 못했습니다.");
          return;
        }

        const now = new Date();
        const readableTitle = `브라우저 녹음 ${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
        const file = new File(
          chunks,
          `${readableTitle}${extension}`,
          {
            type: activeType,
          },
        );

        await applySelectedAudioFile(file);
        setIsFinalizingRecording(false);
      });

      recorder.start(1000);
      setIsRecording(true);
    } catch (error) {
      console.error(error);
      setRecordingError(
        "마이크 권한을 얻지 못했습니다. 브라우저 권한을 확인해 주세요.",
      );
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      recordedChunksRef.current = [];
      recordingStartedAtRef.current = null;
      setIsRecording(false);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
  }

  function handleSelectRecord(recordId: string) {
    startTransition(() => {
      setSelectedRecordId(recordId);

      setTranscriptQuery("");
      setRetryState((current) => ({
        ...current,
        message: null,
        tone: "idle",
      }));
    });
  }

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
        message: "학생 이름을 입력해 주세요.",
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

      startTransition(() => {
        setRecordDetails((current) => ({
          ...current,
          [data.record.id]: data.record,
        }));
        setRecords((current) => upsertRecordList(current, data.record));
        setSelectedRecordId(data.record.id);
  
        setSearchTerm("");
        setRecordFilter("all");
        setTranscriptQuery("");
      });

      setUploadState({
        isUploading: false,
        message: null,
        tone: "idle",
      });
      setSaveToast("기록이 저장되었습니다. 전사를 시작합니다.");
      setRecentlySavedId(data.record.id);
      setRetryState({
        isSubmitting: false,
        message: null,
        tone: "idle",
      });
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

  async function streamAssistantResponse(
    recordId: string,
    allMessages: Message[],
  ) {
    const abortController = new AbortController();

    aiAbortControllerRef.current = abortController;
    setIsAiStreaming(true);

    const assistantId = `${recordId}-assistant-${Date.now()}`;
    const streamingMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
      isStreaming: true,
    };

    setAssistantMessagesByRecord((current) => ({
      ...current,
      [recordId]: [...(current[recordId] ?? []), streamingMessage],
    }));

    try {
      const MAX_CONTEXT_MESSAGES = 20;
      const relevantMessages = allMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .filter((m) => m.content.trim());
      const apiMessages = relevantMessages
        .slice(-MAX_CONTEXT_MESSAGES)
        .map((m) => ({ role: m.role, content: m.content }));

      const response = await fetch(
        `/api/v1/counseling-records/${recordId}/chat`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: apiMessages }),
          signal: abortController.signal,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "AI 도우미가 응답하지 못했습니다.";

        try {
          const parsed = JSON.parse(errorText) as { message?: string };

          if (parsed.message) {
            errorMessage = parsed.message;
          }
        } catch {
          // 파싱 실패 시 기본 메시지
        }

        setAssistantMessagesByRecord((current) => ({
          ...current,
          [recordId]: (current[recordId] ?? []).map((m) =>
            m.id === assistantId
              ? { ...m, content: `⚠️ ${errorMessage}`, isStreaming: false }
              : m,
          ),
        }));
        return;
      }

      const reader = response.body?.getReader();

      if (!reader) {
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed.startsWith("data: ")) {
            continue;
          }

          const payload = trimmed.slice(6);

          if (payload === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(payload) as { content?: string };

            if (parsed.content) {
              accumulated += parsed.content;
              const snapshot = accumulated;

              setAssistantMessagesByRecord((current) => ({
                ...current,
                [recordId]: (current[recordId] ?? []).map((m) =>
                  m.id === assistantId
                    ? { ...m, content: snapshot }
                    : m,
                ),
              }));
            }
          } catch {
            // 파싱 불가능한 줄 무시
          }
        }
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        // 사용자가 중단함
      } else {
        setAssistantMessagesByRecord((current) => ({
          ...current,
          [recordId]: (current[recordId] ?? []).map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || "⚠️ 응답 중 오류가 발생했습니다.", isStreaming: false }
              : m,
          ),
        }));
      }
    } finally {
      setAssistantMessagesByRecord((current) => ({
        ...current,
        [recordId]: (current[recordId] ?? []).map((m) =>
          m.id === assistantId ? { ...m, isStreaming: false } : m,
        ),
      }));
      setIsAiStreaming(false);
      aiAbortControllerRef.current = null;
    }
  }

  function appendAssistantExchange(prompt: string) {
    if (!selectedRecord || isAiStreaming) {
      return;
    }

    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    const userMessage: Message = {
      id: `${selectedRecord.id}-user-${Date.now()}`,
      role: "user",
      content: trimmedPrompt,
    };

    const currentMessages =
      assistantMessagesByRecord[selectedRecord.id] ?? [];

    const updatedMessages = [...currentMessages, userMessage];

    setAssistantMessagesByRecord((current) => ({
      ...current,
      [selectedRecord.id]: updatedMessages,
    }));
    setAssistantDraft("");

    streamAssistantResponse(selectedRecord.id, updatedMessages);
  }

  function handleStopStreaming() {
    aiAbortControllerRef.current?.abort();
  }

  function handleAudioTimeUpdate() {
    const player = audioPlayerRef.current;

    if (!player) {
      return;
    }

    setCurrentAudioTimeMs(Math.max(Math.round(player.currentTime * 1000), 0));
  }

  // 41차: 클립보드 내보내기
  async function handleExportClipboard() {
    if (!selectedRecordDetail || !selectedRecord) {
      return;
    }

    const lines = selectedRecordDetail.transcriptSegments.map(
      (segment) =>
        `[${formatTranscriptTime(segment.startMs)}] ${segment.speakerLabel}: ${segment.text}`,
    );
    const text = `${selectedRecord.studentName} — ${selectedRecord.sessionTitle}\n\n${lines.join("\n")}`;

    try {
      await navigator.clipboard.writeText(text);
      setSaveToast("원문이 클립보드에 복사되었습니다.");
    } catch {
      setSaveToast("클립보드 복사에 실패했습니다.");
    }
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
        const data = await response.json().catch(() => ({})) as { message?: string };

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
                ? { ...s, speakerLabel: newLabel, speakerTone: newTone as typeof s.speakerTone }
                : s,
            ),
          },
        };
      });
    } catch {
      // 실패 시 무시 (이미 서버에 반영 안 됨)
    }
  }

  // 77차: AI 분석 내보내기 텍스트 빌더
  function buildAiExportText() {
    if (!selectedRecord) {
      return "";
    }

    const messages = assistantMessagesByRecord[selectedRecord.id] ?? [];
    const aiMessages = messages
      .filter((m) => m.role === "assistant" && !m.isStreaming)
      .map((m) => m.content);

    if (aiMessages.length === 0) {
      return "";
    }

    const header = [
      "[상담 분석 보고서]",
      `학생: ${selectedRecord.studentName}`,
      `상담 제목: ${selectedRecord.sessionTitle}`,
      `일시: ${formatDateTimeLabel(selectedRecord.createdAt)}`,
    ].join("\n");

    const aiSection = `--- AI 분석 ---\n${aiMessages.join("\n\n")}`;

    const segmentCount = selectedRecordDetail?.transcriptSegments.length ?? 0;
    const textLength = selectedRecordDetail?.transcriptText.length ?? 0;
    const summary = `--- 원문 요약 ---\n세그먼트 ${segmentCount}개 · ${textLength}자`;

    return `${header}\n\n${aiSection}\n\n${summary}`;
  }

  // 77차: 종합 보고서 마크다운 빌더
  function buildComprehensiveReportMarkdown() {
    if (!selectedRecord || !selectedRecordDetail) {
      return "";
    }

    const messages = assistantMessagesByRecord[selectedRecord.id] ?? [];
    const aiContent = messages
      .filter((m) => m.role === "assistant" && !m.isStreaming)
      .map((m) => m.content)
      .join("\n\n");

    const transcriptLines = selectedRecordDetail.transcriptSegments.map(
      (segment) =>
        `[${formatTranscriptTime(segment.startMs)}] ${segment.speakerLabel}: ${segment.text}`,
    );

    return [
      "# 상담 기록 종합 보고서",
      "",
      "## 기본 정보",
      `- **학생**: ${selectedRecord.studentName}`,
      `- **상담 유형**: ${selectedRecord.counselingType}`,
      `- **상담 제목**: ${selectedRecord.sessionTitle}`,
      `- **일시**: ${formatDateTimeLabel(selectedRecord.createdAt)}`,
      "",
      "## AI 분석",
      aiContent || "(AI 분석 내용이 없습니다)",
      "",
      "## 상담 원문",
      ...transcriptLines,
    ].join("\n");
  }

  async function handleAiExportClipboard() {
    const text = buildAiExportText();

    if (!text) {
      setSaveToast("내보낼 AI 분석이 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setSaveToast("AI 분석이 클립보드에 복사되었습니다.");
    } catch {
      setSaveToast("클립보드 복사에 실패했습니다.");
    }

    setIsAiExportOpen(false);
  }

  function handleAiExportTextFile() {
    const text = buildAiExportText();

    if (!text) {
      setSaveToast("내보낼 AI 분석이 없습니다.");
      return;
    }

    const fileName = `상담분석_${selectedRecord?.studentName ?? "분석"}_${new Date().toISOString().slice(0, 10)}.txt`;
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setSaveToast("텍스트 파일을 다운로드했습니다.");
    setIsAiExportOpen(false);
  }

  async function handleComprehensiveReportClipboard() {
    const text = buildComprehensiveReportMarkdown();

    if (!text) {
      setSaveToast("내보낼 내용이 없습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setSaveToast("종합 보고서가 클립보드에 복사되었습니다.");
    } catch {
      setSaveToast("클립보드 복사에 실패했습니다.");
    }

    setIsAiExportOpen(false);
  }

  function handleComprehensiveReportTextFile() {
    const text = buildComprehensiveReportMarkdown();

    if (!text) {
      setSaveToast("내보낼 내용이 없습니다.");
      return;
    }

    const fileName = `종합보고서_${selectedRecord?.studentName ?? "보고서"}_${new Date().toISOString().slice(0, 10)}.md`;
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setSaveToast("종합 보고서를 다운로드했습니다.");
    setIsAiExportOpen(false);
  }

  // 78차: 추이 분석 시작
  async function handleStartTrendAnalysis(
    studentName: string,
    recordIds: string[],
  ) {
    trendAbortControllerRef.current?.abort();

    const controller = new AbortController();
    trendAbortControllerRef.current = controller;

    setTrendAnalysis({ studentName, content: "", isStreaming: true });
    setSelectedRecordId(null);

    try {
      const response = await fetch(
        "/api/v1/counseling-records/analyze-trend",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recordIds }),
          signal: controller.signal,
        },
      );

      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "추이 분석 요청에 실패했습니다.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) {
            continue;
          }

          const payload = line.slice(6);

          if (payload === "[DONE]") {
            break;
          }

          try {
            const parsed = JSON.parse(payload);
            const token = parsed.content ?? "";

            if (token) {
              setTrendAnalysis((prev) =>
                prev
                  ? { ...prev, content: prev.content + token }
                  : null,
              );
            }
          } catch {
            // SSE 파싱 실패 무시
          }
        }
      }
    } catch (error) {
      if ((error as Error).name !== "AbortError") {
        setSaveToast(
          (error as Error).message || "추이 분석 중 오류가 발생했습니다.",
        );
      }
    } finally {
      setTrendAnalysis((prev) =>
        prev ? { ...prev, isStreaming: false } : null,
      );
      trendAbortControllerRef.current = null;
    }
  }

  function handleStopTrendAnalysis() {
    trendAbortControllerRef.current?.abort();
  }

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
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.message ?? "상담 기록 삭제에 실패했습니다.",
        );
      }

      setRecords((current) =>
        current.filter((record) => record.id !== selectedRecord.id),
      );
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

  function seekAudioToTime(startMs: number | null) {
    const player = audioPlayerRef.current;

    if (!player || startMs === null) {
      return;
    }

    player.currentTime = Math.max(startMs, 0) / 1000;
    setCurrentAudioTimeMs(Math.max(startMs, 0));
  }

  const recordingPhase: "idle" | "recording" | "finalizing" =
    isRecording ? "recording" : isFinalizingRecording ? "finalizing" : "idle";

  const hasAudioReady = Boolean(selectedAudioFile) && recordingPhase === "idle";

  return (
    <main className={styles.page}>
      {/* 32차: 저장 toast */}
      {saveToast ? (
        <div className={styles.toastBar} role="status">
          <CheckCheck size={16} strokeWidth={2.2} />
          {saveToast}
        </div>
      ) : null}

      <div className={styles.shell}>
        {/* ── 슬림 헤더 ── */}
        <header className={styles.topbar}>
          <div className={styles.topbarCopy}>
            <p className={styles.topbarLabel}>YEON</p>
            <h1 className={styles.pageTitle}>상담 기록 워크스페이스</h1>
            <p className={styles.pageDescription}>
              업로드부터 원문 확인까지 한 화면에서 정리합니다.
            </p>
          </div>

          <form
            action="/api/auth/logout"
            method="post"
            className={styles.topbarActions}
          >
            <button type="submit" className={styles.topbarGhostButton}>
              <LogOut size={15} strokeWidth={2.1} />
              로그아웃
            </button>
          </form>
        </header>

        {/* 기록 0건: 풀스크린 빈 상태 */}
        {!isLoadingList && records.length === 0 ? (
          <div className={styles.emptyLanding}>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className={styles.hiddenFileInput}
              onChange={handleAudioFileChange}
            />

            <div className={styles.emptyLandingCta}>
              <div className={styles.emptyLandingIcon}>
                <Mic size={32} strokeWidth={1.5} />
              </div>
              <h2 className={styles.emptyLandingTitle}>
                첫 상담 기록을 만들어 보세요
              </h2>
              <p className={styles.emptyLandingDescription}>
                음성 파일을 업로드하거나 브라우저에서 바로 녹음할 수 있습니다.
              </p>
              <div className={styles.emptyLandingActions}>
                <button
                  type="button"
                  className={styles.emptyLandingButton}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={16} strokeWidth={2.2} />
                  파일 업로드
                </button>
                <button
                  type="button"
                  className={styles.emptyLandingButtonSecondary}
                  onClick={startRecording}
                >
                  <Mic size={16} strokeWidth={2.2} />
                  브라우저 녹음
                </button>
              </div>
            </div>
          </div>
        ) : (
        <div className={styles.workspace}>
          {/* ── 좌측: 생성 + 탐색 ── */}
          <aside className={styles.sidebar}>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className={styles.hiddenFileInput}
              onChange={handleAudioFileChange}
            />

            <button
              type="button"
              className={styles.newRecordButton}
              onClick={() => {
                setSelectedRecordId(null);
                setIsUploadPanelOpen(true);
              }}
            >
              <Upload size={14} strokeWidth={2.2} />
              새 기록
            </button>

            {/* 탐색 섹션 (기록이 있을 때만) */}
            {records.length > 0 || isLoadingList || loadError ? (
              <section className={styles.browseSection}>
                <div className={styles.browseSectionHeader}>
                  <h2 className={styles.sidebarSectionTitle}>기록 찾기</h2>
                  {!isLoadingList && !loadError ? (
                    <p className={styles.browseCount}>
                      기록 {records.length}건
                    </p>
                  ) : null}
                </div>

                {/* 78차: 전체/학생별 뷰 전환 */}
                {!isLoadingList && !loadError && records.length > 0 ? (
                  <div className={styles.viewModeToggle}>
                    <button
                      type="button"
                      className={`${styles.viewModeButton} ${sidebarViewMode === "all" ? styles.viewModeButtonActive : ""}`}
                      onClick={() => setSidebarViewMode("all")}
                    >
                      <List size={13} strokeWidth={2.2} />
                      전체
                    </button>
                    <button
                      type="button"
                      className={`${styles.viewModeButton} ${sidebarViewMode === "student" ? styles.viewModeButtonActive : ""}`}
                      onClick={() => setSidebarViewMode("student")}
                    >
                      <Users size={13} strokeWidth={2.2} />
                      학생별
                    </button>
                  </div>
                ) : null}

                {/* 14차: 5건 초과일 때만 검색/필터 노출 */}
                {records.length > 5 ? (
                  <div className={styles.browseTools}>
                    <label className={styles.searchField}>
                      <Search
                        size={16}
                        strokeWidth={2.1}
                        className={styles.searchIcon}
                      />
                      <input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        className={styles.searchInput}
                        placeholder="학생명, 상담 주제, 태그 검색"
                        aria-label="상담 기록 검색"
                      />
                    </label>

                    {/* 14차: 필터 기본 접힘 토글 */}
                    <div className={styles.filterToggleRow}>
                      <button
                        type="button"
                        className={styles.filterToggleButton}
                        onClick={() => setIsFilterOpen((prev) => !prev)}
                        aria-expanded={isFilterOpen}
                        aria-controls="browse-filter-chips"
                      >
                        <Filter size={14} strokeWidth={2.2} />
                        {recordFilter !== "all" ? (
                          <span className={styles.activeFilterLabel}>
                            {FILTER_META.find((f) => f.id === recordFilter)
                              ?.label ?? "전체"}
                          </span>
                        ) : (
                          <span>필터</span>
                        )}
                        <ChevronDown
                          size={14}
                          strokeWidth={2.2}
                          className={`${styles.filterToggleChevron} ${isFilterOpen ? styles.filterToggleChevronOpen : ""}`}
                        />
                      </button>
                    </div>

                    {isFilterOpen ? (
                      <div
                        id="browse-filter-chips"
                        className={styles.filterRow}
                      >
                        {FILTER_META.map((filter) => {
                          const count = records.filter((record) =>
                            filter.id === "all"
                              ? true
                              : record.status === filter.id,
                          ).length;

                          return (
                            <button
                              key={filter.id}
                              type="button"
                              className={`${styles.filterChip} ${
                                recordFilter === filter.id
                                  ? styles.filterChipActive
                                  : ""
                              }`}
                              onClick={() => setRecordFilter(filter.id)}
                            >
                              <span className={styles.filterChipLabel}>
                                {filter.label}
                              </span>
                              <span className={styles.filterChipCount}>
                                {count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className={styles.recordList}>
                  {isLoadingList ? (
                    <div className={styles.skeletonList}>
                      {Array.from({ length: 3 }, (_, i) => (
                        <div key={i} className={styles.skeletonCard}>
                          <div className={styles.skeletonLine} style={{ width: "60%" }} />
                          <div className={styles.skeletonLine} style={{ width: "80%" }} />
                          <div className={styles.skeletonLine} style={{ width: "40%" }} />
                        </div>
                      ))}
                    </div>
                  ) : loadError ? (
                    <div className={styles.emptyListState}>
                      <p className={styles.emptyStateTitle}>
                        목록을 불러오지 못했습니다.
                      </p>
                      <p className={styles.emptyStateDescription}>
                        {loadError}
                      </p>
                    </div>
                  ) : sidebarViewMode === "student" ? (
                    /* 78차: 학생별 그룹 뷰 */
                    studentGroups.length > 0 ? (
                      studentGroups.map((group) => {
                        const isExpanded = expandedStudents.has(
                          group.studentName,
                        );

                        return (
                          <div
                            key={group.studentName}
                            className={styles.studentGroup}
                          >
                            <button
                              type="button"
                              className={`${styles.studentGroupHeader} ${selectedStudentName === group.studentName ? styles.studentGroupHeaderActive : ""}`}
                              onClick={() => {
                                setExpandedStudents((prev) => {
                                  const next = new Set(prev);

                                  if (next.has(group.studentName)) {
                                    next.delete(group.studentName);
                                  } else {
                                    next.add(group.studentName);
                                  }

                                  return next;
                                });
                                setSelectedStudentName(group.studentName);
                              }}
                            >
                              <ChevronDown
                                size={14}
                                strokeWidth={2.2}
                                className={`${styles.studentGroupChevron} ${isExpanded ? styles.studentGroupChevronOpen : ""}`}
                              />
                              <span className={styles.studentGroupName}>
                                {group.studentName}
                              </span>
                              <span className={styles.studentGroupCount}>
                                {group.recordCount}건
                              </span>
                            </button>
                            {isExpanded
                              ? group.records.map((record) => {
                                  const status = STATUS_META[record.status];
                                  const StatusIcon = status.icon;
                                  const isSelected =
                                    record.id === selectedRecord?.id;

                                  return (
                                    <button
                                      key={record.id}
                                      type="button"
                                      className={`${styles.recordItem} ${styles.recordItemIndented} ${
                                        isSelected
                                          ? styles.recordItemSelected
                                          : ""
                                      } ${recentlySavedId === record.id ? styles.recordItemSaved : ""}`}
                                      onClick={() =>
                                        handleSelectRecord(record.id)
                                      }
                                    >
                                      {isSelected ? (
                                        <span
                                          className={styles.recordAccentBar}
                                          aria-hidden
                                        />
                                      ) : null}
                                      <div className={styles.recordItemBody}>
                                        <div
                                          className={styles.recordItemHeader}
                                        >
                                          <div className={styles.recordMain}>
                                            <span
                                              className={
                                                styles.recordSessionTitle
                                              }
                                            >
                                              {record.sessionTitle}
                                            </span>
                                          </div>
                                          <div className={styles.recordMetaRow}>
                                            <span>
                                              {formatDateTimeLabel(
                                                record.createdAt,
                                              )}
                                            </span>
                                            <span
                                              className={`${styles.statusBadge} ${status.className}`}
                                            >
                                              <StatusIcon
                                                size={10}
                                                strokeWidth={2.2}
                                              />
                                              {status.label}
                                            </span>
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })
                              : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className={styles.emptyListState}>
                        <p className={styles.emptyStateTitle}>
                          표시할 상담 기록이 없습니다.
                        </p>
                      </div>
                    )
                  ) : filteredRecords.length > 0 ? (
                    filteredRecords.map((record) => {
                      const status = STATUS_META[record.status];
                      const StatusIcon = status.icon;
                      const isSelected = record.id === selectedRecord?.id;

                      return (
                        <button
                          key={record.id}
                          type="button"
                          className={`${styles.recordItem} ${
                            isSelected ? styles.recordItemSelected : ""
                          } ${recentlySavedId === record.id ? styles.recordItemSaved : ""}`}
                          onClick={() => handleSelectRecord(record.id)}
                        >
                          {/* 15차: 선택 accent bar */}
                          {isSelected ? (
                            <span
                              className={styles.recordAccentBar}
                              aria-hidden
                            />
                          ) : null}

                          <div className={styles.recordItemBody}>
                            <div className={styles.recordItemHeader}>
                              <div className={styles.recordMain}>
                                <span className={styles.recordName}>
                                  {record.studentName}
                                </span>
                                <span className={styles.recordSessionTitle}>
                                  {record.sessionTitle}
                                </span>
                              </div>

                              <div className={styles.recordMetaRow}>
                                <span>
                                  {formatDateTimeLabel(record.createdAt)}
                                </span>
                                <span
                                  className={`${styles.statusBadge} ${status.className}`}
                                >
                                  <StatusIcon size={10} strokeWidth={2.2} />
                                  {status.label}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className={styles.emptyListState}>
                      <p className={styles.emptyStateTitle}>
                        표시할 상담 기록이 없습니다.
                      </p>
                    </div>
                  )}
                </div>
              </section>
            ) : null}
          </aside>

          {/* ── 중앙 + 우측 ── */}
          {selectedRecord ? (
            <>
              <section className={styles.centerColumn}>
                {/* 17차: 상세 헤더 — 식별 스트립 */}
                <header className={styles.detailHeader}>
                  <div className={styles.detailHeaderTop}>
                    <div className={styles.detailHeaderCopy}>
                      <h2 className={styles.detailTitle}>
                        {selectedRecord.studentName}
                      </h2>
                      <p className={styles.detailSessionTitle}>
                        {selectedRecord.sessionTitle}
                      </p>
                    </div>
                    <div className={styles.detailHeaderActions}>
                      <span
                        className={`${styles.statusBadge} ${
                          STATUS_META[selectedRecord.status].className
                        }`}
                      >
                        {(() => {
                          const StatusIcon =
                            STATUS_META[selectedRecord.status].icon;
                          return <StatusIcon size={12} strokeWidth={2.2} />;
                        })()}
                        {STATUS_META[selectedRecord.status].label}
                      </span>
                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => setIsDeleteConfirmOpen(true)}
                        title="기록 삭제"
                      >
                        <Trash2 size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  {isDeleteConfirmOpen ? (
                    <div className={styles.deleteConfirm}>
                      <p className={styles.deleteConfirmText}>
                        이 기록을 삭제하시겠습니까? 음성 파일도 함께 삭제됩니다.
                      </p>
                      <div className={styles.deleteConfirmActions}>
                        <button
                          type="button"
                          className={styles.topbarGhostButton}
                          onClick={() => setIsDeleteConfirmOpen(false)}
                          disabled={isDeleting}
                        >
                          취소
                        </button>
                        <button
                          type="button"
                          className={styles.deleteConfirmButton}
                          onClick={handleDeleteRecord}
                          disabled={isDeleting}
                        >
                          {isDeleting ? (
                            <>
                              <LoaderCircle
                                size={14}
                                strokeWidth={2.1}
                                className={styles.spinningIcon}
                              />
                              삭제 중
                            </>
                          ) : (
                            "삭제"
                          )}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* 17차: 핵심 3개 메타만 인라인 */}
                  <div className={styles.metaChips}>
                    <span className={styles.metaChip}>
                      {formatDateTimeLabel(selectedRecord.createdAt)}
                    </span>
                    <span className={styles.metaChip}>
                      {formatDurationLabel(selectedRecord.audioDurationMs)}
                    </span>
                    <span className={styles.metaChip}>
                      {selectedRecord.counselingType}
                    </span>

                    {/* 17차: 나머지는 접힌 상세 정보 토글 */}
                    <button
                      type="button"
                      className={styles.metaExpandButton}
                      onClick={() => setIsDetailMetaOpen((prev) => !prev)}
                      aria-expanded={isDetailMetaOpen}
                      aria-controls="detail-extra-meta"
                    >
                      상세
                      <ChevronDown
                        size={12}
                        strokeWidth={2.4}
                        className={`${styles.filterToggleChevron} ${isDetailMetaOpen ? styles.filterToggleChevronOpen : ""}`}
                      />
                    </button>
                  </div>

                  {isDetailMetaOpen ? (
                    <div
                      id="detail-extra-meta"
                      className={styles.metaChips}
                    >
                      <span className={styles.metaChip}>
                        세그먼트 {selectedRecord.transcriptSegmentCount}개
                      </span>
                      <span className={styles.metaChip}>
                        원문{" "}
                        {selectedRecord.transcriptTextLength.toLocaleString(
                          "ko-KR",
                        )}
                        자
                      </span>
                      {selectedRecord.sttModel ? (
                        <span className={styles.metaChip}>
                          {selectedRecord.sttModel}
                        </span>
                      ) : null}
                    </div>
                  ) : null}

                  {/* 18차: 오디오 플레이어 슬림 — 1줄 메타 + 플레이어만 */}
                  <section className={styles.audioPanel}>
                    <p className={styles.audioMeta}>
                      {selectedRecord.audioOriginalName}
                      <span className={styles.audioMetaSeparator}>·</span>
                      {formatFileSize(selectedRecord.audioByteSize)}
                    </p>

                    {selectedRecordDetail?.audioUrl ? (
                      <audio
                        ref={audioPlayerRef}
                        className={styles.audioPlayer}
                        controls
                        preload="metadata"
                        src={selectedRecordDetail.audioUrl}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onLoadedMetadata={handleAudioTimeUpdate}
                        onError={() =>
                          setAudioLoadError(
                            "원본 음성을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.",
                          )
                        }
                      />
                    ) : (
                      <p className={styles.audioPanelHint}>
                        원본 음성을 불러오는 중입니다.
                      </p>
                    )}

                    {audioLoadError ? (
                      <p
                        className={`${styles.inlineMessage} ${styles.inlineError}`}
                      >
                        {audioLoadError}
                      </p>
                    ) : null}
                  </section>

                  {retryState.message ? (
                    <p
                      className={`${styles.inlineMessage} ${
                        retryState.tone === "error"
                          ? styles.inlineError
                          : retryState.tone === "success"
                            ? styles.inlineSuccess
                            : styles.inlineNeutral
                      }`}
                    >
                      {retryState.message}
                    </p>
                  ) : null}

                  {/* 19차: 상태에 맞는 액션만 노출 */}
                  {selectedRecord.status === "processing" ||
                  selectedRecord.status === "error" ? (
                    <div className={styles.panelActionRow}>
                      {selectedRecord.status === "processing" ? (
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() =>
                            refreshRecordDetail(selectedRecord.id)
                          }
                          disabled={retryState.isSubmitting}
                        >
                          {retryState.isSubmitting ? (
                            <LoaderCircle
                              size={16}
                              strokeWidth={2.1}
                              className={styles.spinningIcon}
                            />
                          ) : (
                            <RefreshCcw size={16} strokeWidth={2.1} />
                          )}
                          최신 상태 확인
                        </button>
                      ) : null}

                      {selectedRecord.status === "error" ? (
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() =>
                            retryTranscription(selectedRecord.id)
                          }
                          disabled={retryState.isSubmitting}
                        >
                          {retryState.isSubmitting ? (
                            <>
                              <LoaderCircle
                                size={16}
                                strokeWidth={2.1}
                                className={styles.spinningIcon}
                              />
                              재전사 요청 중
                            </>
                          ) : (
                            <>
                              <RefreshCcw size={16} strokeWidth={2.1} />
                              전사 다시 시도
                            </>
                          )}
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </header>

                <section className={styles.viewerPanel}>
                  <div className={styles.viewerToolbar}>
                    <div className={styles.viewerTools}>
                      <span className={styles.viewerMeta}>
                        {`구간 ${selectedRecordDetail ? selectedRecordDetail.transcriptSegments.length : selectedRecord.transcriptSegmentCount}개${normalizedTranscriptQuery ? ` · 일치 ${transcriptMatchCount}개` : ""}`}
                      </span>

                      <label className={styles.transcriptSearchField}>
                        <Search
                          size={15}
                          strokeWidth={2.1}
                          className={styles.transcriptSearchIcon}
                        />
                        <input
                          value={transcriptQuery}
                          onChange={(event) =>
                            setTranscriptQuery(event.target.value)
                          }
                          className={styles.transcriptSearchInput}
                          placeholder="원문 검색"
                          aria-label="원문 내 단어 검색"
                        />
                      </label>
                      <button
                        type="button"
                        className={`${styles.autoScrollToggle} ${isAutoScrollEnabled ? styles.autoScrollToggleActive : ""}`}
                        onClick={() =>
                          setIsAutoScrollEnabled((prev) => !prev)
                        }
                        aria-pressed={isAutoScrollEnabled}
                        title="재생 시 자동 스크롤"
                      >
                        따라가기
                      </button>
                      <button
                        type="button"
                        className={styles.autoScrollToggle}
                        onClick={handleExportClipboard}
                        title="원문 클립보드 복사"
                      >
                        <ClipboardCopy size={14} strokeWidth={2} />
                      </button>
                    </div>
                  </div>

                  <div className={styles.transcriptViewport}>
                      {isLoadingDetail && !selectedRecordDetail ? (
                        <div className={styles.skeletonTranscript}>
                          {Array.from({ length: 5 }, (_, i) => (
                            <div key={i} className={styles.skeletonSegment}>
                              <div className={styles.skeletonLine} style={{ width: "50px" }} />
                              <div className={styles.skeletonLine} style={{ width: "60px" }} />
                              <div className={styles.skeletonLine} style={{ width: `${60 + (i % 3) * 15}%` }} />
                            </div>
                          ))}
                        </div>
                      ) : selectedRecordDetail &&
                        selectedRecordDetail.transcriptSegments.length > 0 ? (
                        selectedRecordDetail.transcriptSegments.map(
                          (segment, index, segments) => {
                            const isMatched = isTranscriptSegmentMatched(
                              segment,
                              normalizedTranscriptQuery,
                            );
                            const isActive = isTranscriptSegmentActive({
                              currentTimeMs: currentAudioTimeMs,
                              startMs: segment.startMs,
                              endMs: segment.endMs,
                              nextStartMs: segments[index + 1]?.startMs ?? null,
                            });
                            const isSeekable =
                              Boolean(selectedRecordDetail.audioUrl) &&
                              segment.startMs !== null;
                            const segmentClassName = `${styles.segmentRow} ${
                              isMatched ? styles.segmentMatched : ""
                            } ${isActive ? styles.segmentActive : ""} ${
                              isSeekable
                                ? styles.segmentSeekable
                                : styles.segmentStatic
                            }`;
                            const isEditing = editingSegmentId === segment.id;
                            const segmentContent = isEditing ? (
                              <>
                                <div className={styles.segmentTime}>
                                  {formatTranscriptTime(segment.startMs)}
                                </div>
                                <div className={`${styles.segmentSpeaker} ${getSpeakerToneClass(segment.speakerTone)}`}>
                                  {segment.speakerLabel}
                                </div>
                                <div className={styles.segmentEditArea}>
                                  <textarea
                                    className={styles.segmentEditInput}
                                    value={editingSegmentText}
                                    onChange={(e) => setEditingSegmentText(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveEditingSegment(); }
                                      if (e.key === "Escape") { cancelEditingSegment(); }
                                    }}
                                    rows={2}
                                    autoFocus
                                    disabled={editingSegmentSaving}
                                  />
                                  <div className={styles.segmentEditActions}>
                                    <button type="button" className={styles.segmentEditSave} onClick={(e) => { e.stopPropagation(); saveEditingSegment(); }} disabled={editingSegmentSaving} aria-label="저장">
                                      <Check size={14} strokeWidth={2.5} />
                                    </button>
                                    <button type="button" className={styles.segmentEditCancel} onClick={(e) => { e.stopPropagation(); cancelEditingSegment(); }} disabled={editingSegmentSaving} aria-label="취소">
                                      <X size={14} strokeWidth={2.5} />
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className={styles.segmentTime}>
                                  {formatTranscriptTime(segment.startMs)}
                                </div>
                                <div
                                  className={`${styles.segmentSpeaker} ${styles.segmentSpeakerClickable} ${getSpeakerToneClass(segment.speakerTone)}`}
                                  role="button"
                                  tabIndex={0}
                                  onClick={(e) => { e.stopPropagation(); const next = getNextSpeaker(segment.speakerTone); handleSpeakerLabelChange(segment.id, next.label, next.tone); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); const next = getNextSpeaker(segment.speakerTone); handleSpeakerLabelChange(segment.id, next.label, next.tone); } }}
                                  title="클릭하여 화자 변경"
                                >
                                  {segment.speakerLabel}
                                </div>
                                <p className={styles.segmentText} onDoubleClick={(e) => { e.stopPropagation(); startEditingSegment(segment.id, segment.text); }}>
                                  {renderHighlightedText(segment.text, normalizedTranscriptQuery)}
                                </p>
                              </>
                            );

                            if (isSeekable && !isEditing) {
                              return (
                                <button
                                  key={segment.id}
                                  ref={isActive ? activeSegmentRef as React.RefObject<HTMLButtonElement> : undefined}
                                  type="button"
                                  className={segmentClassName}
                                  onClick={() =>
                                    seekAudioToTime(segment.startMs)
                                  }
                                >
                                  {segmentContent}
                                </button>
                              );
                            }

                            return (
                              <article
                                key={segment.id}
                                ref={isActive ? activeSegmentRef as React.RefObject<HTMLElement> : undefined}
                                className={segmentClassName}
                              >
                                {segmentContent}
                              </article>
                            );
                          },
                        )
                      ) : selectedRecord.status === "processing" ? (
                        <div className={styles.viewerEmptyState}>
                          <p className={styles.emptyPanelTitle}>
                            한국어 전사를 처리하고 있습니다.
                          </p>
                          <p className={styles.emptyPanelDescription}>
                            길이가 긴 상담은 서버에서 분할 전사한 뒤 자동으로
                            갱신합니다.
                          </p>
                        </div>
                      ) : selectedRecord.status === "error" ? (
                        <div className={styles.viewerEmptyState}>
                          <p className={styles.emptyPanelTitle}>
                            원문 저장에 실패했습니다.
                          </p>
                          <p className={styles.emptyPanelDescription}>
                            {selectedRecord.errorMessage ??
                              "원본 음성은 남아 있으므로 전사를 다시 시도할 수 있습니다."}
                          </p>
                          <ul className={styles.errorGuideList}>
                            <li>파일이 손상된 경우 → 다른 파일로 교체 후 재시도</li>
                            <li>서버 시간초과 → 잠시 후 전사 다시 시도</li>
                            <li>형식 미지원 → mp3, wav, m4a 등 일반 형식 사용</li>
                          </ul>
                        </div>
                      ) : (
                        <div className={styles.viewerEmptyState}>
                          <p className={styles.emptyPanelTitle}>
                            표시할 원문 세그먼트가 없습니다.
                          </p>
                        </div>
                      )}
                    </div>
                </section>
              </section>

              {/* 23~26차: AI 패널 재설계 */}
              <aside className={styles.assistantPanel}>
                {/* 23차: 슬림 헤더 */}
                <div className={styles.assistantHeader}>
                  <div className={styles.assistantTitleRow}>
                    <div className={styles.assistantIcon}>
                      <Bot size={16} strokeWidth={2} />
                    </div>
                    <h2 className={styles.assistantTitle}>AI 도우미</h2>
                  </div>
                  {/* 77차: 내보내기 드롭다운 */}
                  <div ref={exportDropdownRef} className={styles.exportDropdownWrapper}>
                    <button
                      type="button"
                      className={styles.exportTrigger}
                      onClick={() => setIsAiExportOpen((prev) => !prev)}
                      title="AI 분석 내보내기"
                    >
                      <Download size={14} strokeWidth={2} />
                    </button>
                    {isAiExportOpen ? (
                      <div className={styles.exportDropdown}>
                        <p className={styles.exportGroupLabel}>AI 분석</p>
                        <button
                          type="button"
                          className={styles.exportOption}
                          onClick={handleAiExportClipboard}
                        >
                          <ClipboardCopy size={13} strokeWidth={2} />
                          클립보드 복사
                        </button>
                        <button
                          type="button"
                          className={styles.exportOption}
                          onClick={handleAiExportTextFile}
                        >
                          <FileText size={13} strokeWidth={2} />
                          텍스트 파일 다운로드
                        </button>
                        <div className={styles.exportDivider} />
                        <p className={styles.exportGroupLabel}>종합 보고서</p>
                        <button
                          type="button"
                          className={styles.exportOption}
                          onClick={handleComprehensiveReportClipboard}
                        >
                          <ClipboardCopy size={13} strokeWidth={2} />
                          마크다운 복사
                        </button>
                        <button
                          type="button"
                          className={styles.exportOption}
                          onClick={handleComprehensiveReportTextFile}
                        >
                          <Download size={13} strokeWidth={2} />
                          마크다운 파일 다운로드
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* 23차: 문맥 1줄 요약 */}
                <div className={styles.assistantContext}>
                  <p className={styles.contextLabel}>문맥</p>
                  <div className={styles.contextMeta}>
                    <span>{selectedRecord.studentName}</span>
                    <span>{selectedRecord.sessionTitle}</span>
                    <span>{STATUS_META[selectedRecord.status].label}</span>
                  </div>
                </div>

                {/* 25차: 메시지 리스트 — 좌/우 정렬 */}
                <div ref={messageListRef} className={styles.messageList}>
                  {assistantMessages.map((message) => (
                    <article
                      key={message.id}
                      className={`${styles.messageItem} ${
                        message.role === "assistant"
                          ? styles.messageAssistant
                          : styles.messageUser
                      }`}
                    >
                      <p className={styles.messageBadge}>
                        {message.role === "assistant" ? "AI" : "나"}
                      </p>
                      <div className={styles.messageContent}>
                        {message.role === "assistant" ? (
                          <Markdown remarkPlugins={[remarkGfm]}>
                            {message.content}
                          </Markdown>
                        ) : (
                          <p>{message.content}</p>
                        )}
                        {message.isStreaming ? (
                          <span className={styles.streamingCursor} />
                        ) : null}
                      </div>
                      {message.supportingNote ? (
                        <p className={styles.messageNote}>
                          {message.supportingNote}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>

                {/* 24차: 프롬프트 칩 — 컴포저 위 */}
                {!isAiStreaming ? (
                  <div className={styles.promptList}>
                    {quickPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className={styles.promptChip}
                        onClick={() => appendAssistantExchange(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}

                {/* 26차: 컴포저 — 인라인 전송 */}
                <form
                  className={styles.composer}
                  onSubmit={(event) => {
                    event.preventDefault();

                    if (isAiStreaming) {
                      handleStopStreaming();
                    } else {
                      appendAssistantExchange(assistantDraft);
                    }
                  }}
                >
                  <label className={styles.composerField}>
                    <textarea
                      value={assistantDraft}
                      onChange={(event) =>
                        setAssistantDraft(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !isAiStreaming &&
                          assistantDraft.trim()
                        ) {
                          event.preventDefault();
                          appendAssistantExchange(assistantDraft);
                        }
                      }}
                      className={styles.composerTextarea}
                      rows={2}
                      placeholder={isAiStreaming ? "응답 중..." : "질문을 입력하세요"}
                      disabled={isAiStreaming}
                    />
                    {isAiStreaming ? (
                      <button
                        type="button"
                        className={styles.composerStopButton}
                        onClick={handleStopStreaming}
                        aria-label="응답 중지"
                      >
                        <Square size={14} strokeWidth={2.5} />
                      </button>
                    ) : (
                      <button
                        type="submit"
                        className={styles.composerSendButton}
                        disabled={!assistantDraft.trim()}
                        aria-label="질문 보내기"
                      >
                        <SendHorizonal size={16} strokeWidth={2.1} />
                      </button>
                    )}
                  </label>
                </form>
              </aside>
            </>
          ) : (
            <section className={`${styles.centerColumn} ${styles.centerColumnFull}`}>
              {isUploadPanelOpen ? (
                <div className={styles.centerUploadPanel}>
                  <form
                    className={styles.createRecordForm}
                    onSubmit={handleUploadSubmit}
                  >
                    <header className={styles.createRecordHeader}>
                      <div>
                        <h2 className={styles.centerUploadTitle}>
                          새 기록 만들기
                        </h2>
                        <p className={styles.centerUploadDescription}>
                          {hasAudioReady
                            ? "선택한 오디오를 확인한 뒤 저장합니다."
                            : recordingPhase !== "idle"
                              ? "녹음을 마치면 바로 저장할 수 있습니다."
                              : "파일을 올리거나 바로 녹음해 시작합니다."}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.topbarGhostButton}
                        onClick={() => setIsUploadPanelOpen(false)}
                      >
                        닫기
                      </button>
                    </header>

                    {!selectedAudioFile && recordingPhase === "idle" ? (
                      <div className={styles.primaryCtaStack}>
                        <button
                          type="button"
                          className={styles.primaryCtaTile}
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadState.isUploading}
                        >
                          <Upload size={20} strokeWidth={2} />
                          <div>
                            <span className={styles.primaryCtaTileTitle}>
                              파일 업로드
                            </span>
                            <span className={styles.primaryCtaTileDescription}>
                              오디오 파일에서 시작
                            </span>
                          </div>
                        </button>
                        <button
                          type="button"
                          className={styles.primaryCtaTile}
                          onClick={startRecording}
                          disabled={uploadState.isUploading}
                        >
                          <Mic size={20} strokeWidth={2} />
                          <div>
                            <span className={styles.primaryCtaTileTitle}>
                              브라우저 녹음
                            </span>
                            <span className={styles.primaryCtaTileDescription}>
                              지금 바로 녹음 시작
                            </span>
                          </div>
                        </button>
                      </div>
                    ) : null}

                    {recordingPhase !== "idle" ? (
                      <div className={styles.recordingStateBlock}>
                        <button
                          type="button"
                          className={styles.recordingActionButton}
                          onClick={
                            recordingPhase === "recording"
                              ? stopRecording
                              : undefined
                          }
                          disabled={recordingPhase === "finalizing"}
                        >
                          <Mic size={16} strokeWidth={2.1} />
                          {recordingPhase === "recording"
                            ? "녹음 중지"
                            : "녹음 정리 중"}
                        </button>
                        <div className={styles.recordingStatusRow}>
                          <p className={styles.recordingStatusTitle}>
                            {recordingPhase === "recording"
                              ? "현재 녹음 중"
                              : "녹음 정리 중"}
                          </p>
                          <p className={styles.recordingStatusMeta}>
                            {recordingPhase === "recording"
                              ? `${formatCompactDuration(recordingElapsedMs)} 경과 · 중지 후 저장 준비`
                              : "저장 전 확인을 준비하고 있습니다"}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {hasAudioReady && selectedAudioFile ? (
                      <>
                        <div className={styles.selectedAudioCard}>
                          <p className={styles.selectedAudioLabel}>
                            선택한 오디오
                          </p>
                          <p className={styles.selectedAudioTitle}>
                            {selectedAudioFile.name}
                          </p>
                          <p className={styles.selectedAudioMeta}>
                            {formatFileSize(selectedAudioFile.size)} ·{" "}
                            {formatDurationLabel(selectedAudioDurationMs)} · 저장
                            준비
                          </p>
                          {selectedAudioPreviewUrl ? (
                            <audio
                              className={styles.audioPreview}
                              controls
                              src={selectedAudioPreviewUrl}
                            />
                          ) : null}
                        </div>

                        <label className={styles.minimalField}>
                          <span>학생 이름</span>
                          <input
                            value={formState.studentName}
                            onChange={(event) =>
                              updateFormState("studentName", event.target.value)
                            }
                            className={styles.formInput}
                            placeholder="예: 김민수"
                          />
                        </label>

                        <div className={styles.additionalInfoSection}>
                          <button
                            type="button"
                            className={styles.additionalInfoToggle}
                            aria-expanded={isAdditionalInfoOpen}
                            aria-controls="create-record-additional-fields"
                            onClick={() =>
                              setIsAdditionalInfoOpen((current) => !current)
                            }
                          >
                            <span className={styles.additionalInfoLabel}>
                              추가 정보
                            </span>
                            <span className={styles.additionalInfoSummary}>
                              제목, 상담 유형
                            </span>
                          </button>

                          {isAdditionalInfoOpen ? (
                            <div
                              id="create-record-additional-fields"
                              className={styles.additionalInfoBody}
                            >
                              <label className={styles.fieldLabel}>
                                <span>상담 제목</span>
                                <input
                                  value={formState.sessionTitle}
                                  onChange={(event) =>
                                    updateFormState(
                                      "sessionTitle",
                                      event.target.value,
                                    )
                                  }
                                  className={styles.formInput}
                                  placeholder="자동으로 채워집니다"
                                />
                              </label>
                              <div className={styles.additionalInfoGrid}>
                                <label className={styles.fieldLabel}>
                                  <span>상담 유형</span>
                                  <select
                                    value={formState.counselingType}
                                    onChange={(event) =>
                                      updateFormState(
                                        "counselingType",
                                        event.target.value,
                                      )
                                    }
                                    className={styles.formSelect}
                                  >
                                    {COUNSELING_TYPE_OPTIONS.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className={styles.supportActionRow}>
                          <button
                            type="button"
                            className={styles.topbarGhostButton}
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadState.isUploading}
                          >
                            다른 파일 선택
                          </button>
                          <button
                            type="button"
                            className={styles.topbarGhostButton}
                            onClick={startRecording}
                            disabled={uploadState.isUploading}
                          >
                            브라우저 녹음
                          </button>
                        </div>
                      </>
                    ) : null}

                    {recordingError ? (
                      <p
                        className={`${styles.inlineMessage} ${styles.inlineError}`}
                      >
                        {recordingError}
                      </p>
                    ) : null}

                    {uploadState.message ? (
                      <p
                        className={`${styles.inlineMessage} ${
                          uploadState.tone === "error"
                            ? styles.inlineError
                            : uploadState.tone === "success"
                              ? styles.inlineSuccess
                              : styles.inlineNeutral
                        }`}
                      >
                        {uploadState.message}
                      </p>
                    ) : null}

                    {hasAudioReady ? (
                      <button
                        type="submit"
                        className={styles.primaryButton}
                        disabled={uploadState.isUploading}
                      >
                        {uploadState.isUploading ? (
                          <>
                            <LoaderCircle
                              size={16}
                              strokeWidth={2.1}
                              className={styles.spinningIcon}
                            />
                            저장 후 전사 큐 등록 중
                          </>
                        ) : (
                          "기록 저장"
                        )}
                      </button>
                    ) : null}
                  </form>
                </div>
              ) : sidebarViewMode === "student" && selectedStudentName ? (
                /* 78차: 학생 타임라인 뷰 */
                (() => {
                  const studentRecords = filteredRecords
                    .filter((r) => r.studentName === selectedStudentName)
                    .sort(
                      (a, b) =>
                        new Date(a.createdAt).getTime() -
                        new Date(b.createdAt).getTime(),
                    );

                  return (
                    <div className={styles.studentTimeline}>
                      <div className={styles.timelineHeader}>
                        <Users size={20} strokeWidth={1.8} />
                        <h2 className={styles.timelineTitle}>
                          {selectedStudentName}
                        </h2>
                        <span className={styles.timelineCount}>
                          상담 {studentRecords.length}건
                        </span>
                      </div>

                      {studentRecords.length === 0 ? (
                        <p className={styles.timelineEmptyText}>
                          해당 학생의 상담 기록이 없습니다.
                        </p>
                      ) : (
                        <div className={styles.timelineList}>
                          {studentRecords.map((record, index) => {
                            const status = STATUS_META[record.status];
                            const StatusIcon = status.icon;

                            return (
                              <div
                                key={record.id}
                                className={styles.timelineItem}
                              >
                                <div className={styles.timelineTrack}>
                                  <div className={styles.timelineDot} />
                                  {index < studentRecords.length - 1 ? (
                                    <div className={styles.timelineLine} />
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  className={styles.timelineCard}
                                  onClick={() =>
                                    handleSelectRecord(record.id)
                                  }
                                >
                                  <div className={styles.timelineCardHeader}>
                                    <span className={styles.timelineDate}>
                                      {formatDateTimeLabel(record.createdAt)}
                                    </span>
                                    <span
                                      className={`${styles.statusBadge} ${status.className}`}
                                    >
                                      <StatusIcon
                                        size={10}
                                        strokeWidth={2.2}
                                      />
                                      {status.label}
                                    </span>
                                  </div>
                                  <p className={styles.timelineCardTitle}>
                                    {record.sessionTitle}
                                  </p>
                                  <div className={styles.timelineCardMeta}>
                                    <span>{record.counselingType}</span>
                                    {record.preview ? (
                                      <span className={styles.timelinePreview}>
                                        {record.preview}
                                      </span>
                                    ) : null}
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {studentRecords.length >= 3 ? (
                        <button
                          type="button"
                          className={styles.trendAnalysisButton}
                          disabled={
                            trendAnalysis?.isStreaming &&
                            trendAnalysis.studentName === selectedStudentName
                          }
                          onClick={() => {
                            handleStartTrendAnalysis(
                              selectedStudentName,
                              studentRecords.map((r) => r.id),
                            );
                          }}
                        >
                          {trendAnalysis?.isStreaming &&
                          trendAnalysis.studentName === selectedStudentName ? (
                            <>
                              <LoaderCircle
                                size={16}
                                strokeWidth={2}
                                className={styles.spinnerIcon}
                              />
                              분석 중...
                            </>
                          ) : (
                            <>
                              <Bot size={16} strokeWidth={2} />
                              AI 추이 분석
                            </>
                          )}
                        </button>
                      ) : null}

                      {/* 78차: 추이 분석 결과 패널 */}
                      {trendAnalysis &&
                      trendAnalysis.studentName === selectedStudentName ? (
                        <div className={styles.trendResultPanel}>
                          <div className={styles.trendResultHeader}>
                            <Bot size={14} strokeWidth={2} />
                            <span className={styles.trendResultTitle}>
                              추이 분석 결과
                            </span>
                            {trendAnalysis.isStreaming ? (
                              <button
                                type="button"
                                className={styles.trendStopButton}
                                onClick={handleStopTrendAnalysis}
                              >
                                <Square size={12} strokeWidth={2.5} />
                                중지
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={styles.trendExportButton}
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(
                                      trendAnalysis.content,
                                    );
                                    setSaveToast(
                                      "추이 분석이 클립보드에 복사되었습니다.",
                                    );
                                  } catch {
                                    setSaveToast(
                                      "클립보드 복사에 실패했습니다.",
                                    );
                                  }
                                }}
                              >
                                <ClipboardCopy size={12} strokeWidth={2} />
                                복사
                              </button>
                            )}
                          </div>
                          <div className={styles.trendResultContent}>
                            <Markdown remarkPlugins={[remarkGfm]}>
                              {trendAnalysis.content}
                            </Markdown>
                            {trendAnalysis.isStreaming ? (
                              <span className={styles.streamingCursor} />
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })()
              ) : (
                <div className={styles.preSelectionEmpty}>
                  <div className={styles.preSelectionIcon}>
                    <FileAudio size={32} strokeWidth={1.5} />
                  </div>
                  <h2 className={styles.preSelectionTitle}>
                    {records.length === 0
                      ? "첫 기록을 만들어 보세요"
                      : "기록을 선택하세요"}
                  </h2>
                  <p className={styles.preSelectionDescription}>
                    {records.length === 0
                      ? "왼쪽 상단의 새 기록 버튼으로 시작합니다."
                      : "왼쪽 목록에서 기록을 선택하면 원문을 바로 열 수 있습니다."}
                  </p>
                </div>
              )}
            </section>
          )}
        </div>
        )}
      </div>
    </main>
  );
}
