import type { CounselingRecordListItem } from "@yeon/api-contract";

export type RecordFilter = "all" | CounselingRecordListItem["status"];
export type SidebarViewMode = "all" | "student";
export type UploadTone = "idle" | "success" | "error";
export type MessageRole = "assistant" | "user";
export type UploadFormState = {
  studentName: string;
  sessionTitle: string;
  counselingType: string;
};
export type Message = {
  id: string;
  role: MessageRole;
  content: string;
  supportingNote?: string;
  isStreaming?: boolean;
};
export type ApiRequestError = Error & {
  status: number;
};
export type RecordingPhase = "idle" | "recording" | "finalizing";
