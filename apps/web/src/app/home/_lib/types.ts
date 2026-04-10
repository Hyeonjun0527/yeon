export type RecordPhase = "empty" | "recording" | "processing" | "ready";

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
}

/** 실제 API CounselingTranscriptSegment와 동일한 형태 */
export interface TranscriptSegment {
  id: string;
  segmentIndex: number;
  startMs: number | null;
  endMs: number | null;
  speakerLabel: string;
  speakerTone: "teacher" | "student" | "unknown";
  text: string;
}

export interface AnalysisResult {
  summary: string;
  member: {
    name: string | null;
    traits: string[];
    emotion: string;
  };
  issues: Array<{
    title: string;
    detail: string;
    timestamp?: string | null;
  }>;
  actions: {
    mentor: string[];
    member: string[];
    nextSession: string[];
  };
  keywords: string[];
}

export interface RecordItem {
  id: string;
  memberId: string | null;
  title: string;
  status: "ready" | "processing" | "error";
  errorMessage: string | null;
  meta: string;
  duration: string;
  durationMs: number;
  studentName: string;
  type: string;
  audioUrl: string | null;
  transcript: TranscriptSegment[];
  aiSummary: string;
  aiMessages: AiMessage[];
  analysisResult: AnalysisResult | null;
}
