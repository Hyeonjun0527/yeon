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
  speakerTone: "teacher" | "student" | "guardian" | "unknown";
  text: string;
}

export interface RecordItem {
  id: string;
  title: string;
  status: "ready" | "processing";
  meta: string;
  duration: string;
  studentName: string;
  type: string;
  transcript: TranscriptSegment[];
  aiSummary: string;
  aiMessages: AiMessage[];
}
