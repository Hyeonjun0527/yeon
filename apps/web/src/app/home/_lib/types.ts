import type { TranscriptSegment } from "../../mockdata/app/_data/mock-data";

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
