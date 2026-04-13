import type {
  AnalysisResult,
  CounselingRecordAnalysisStatus,
  CounselingRecordProcessingStage,
  CounselingRecordSource,
  CounselingTranscriptSegment,
} from "@yeon/api-contract/counseling-records";
export type { AnalysisResult };

// 내부 상태 (use-records.ts 전용, 외부 노출 금지)
export type InternalPhase = "idle" | "recording" | "processing";

// 외부에 노출하는 단일 ViewState
export type HomeViewState =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "recording" }
  | { kind: "processing"; step: number }
  | { kind: "ready"; records: RecordItem[] };

export interface AttachedImage {
  id: string;
  name: string;
  url: string;
  loading: boolean;
}

export interface AiMessage {
  role: "assistant" | "user" | "system";
  text: string;
  images?: AttachedImage[];
  createdAt?: string;
}

/** 실제 API CounselingTranscriptSegment와 동일한 형태 */
export type TranscriptSegment = CounselingTranscriptSegment;

export interface RecordItem {
  id: string;
  spaceId: string | null;
  memberId: string | null;
  createdAt: string;
  title: string;
  status: "ready" | "processing" | "error";
  errorMessage: string | null;
  meta: string;
  duration: string;
  durationMs: number;
  studentName: string;
  type: string;
  recordSource: CounselingRecordSource;
  audioUrl: string | null;
  transcript: TranscriptSegment[];
  aiSummary: string;
  aiMessages: AiMessage[];
  aiMessagesLoaded?: boolean;
  analysisResult: AnalysisResult | null;
  processingStage?: CounselingRecordProcessingStage;
  processingProgress?: number;
  processingMessage?: string | null;
  analysisStatus?: CounselingRecordAnalysisStatus;
  analysisProgress?: number;
}
