import { CheckCheck, LoaderCircle, TriangleAlert } from "lucide-react";
import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";
import type { RecordFilter } from "./types";

export const MAX_AUDIO_UPLOAD_BYTES = 128 * 1024 * 1024;
export const PROCESSING_REFRESH_INTERVAL_MS = 5000;
export const COUNSELING_TYPE_OPTIONS = [
  "대면 상담",
  "전화 상담",
  "온라인 상담",
  "외부 미팅",
] as const;

export const FILTER_META: Array<{ id: RecordFilter; label: string }> = [
  { id: "all", label: "전체" },
  { id: "ready", label: "원문 준비" },
  { id: "processing", label: "처리 중" },
  { id: "error", label: "오류" },
];

export const SPEAKER_CYCLE = [
  { label: "멘토", tone: "teacher" },
  { label: "수강생", tone: "student" },
  { label: "기타", tone: "unknown" },
] as const;

export function buildStatusMeta(styles: Record<string, string>): Record<
  CounselingRecordListItem["status"],
  {
    label: string;
    className: string;
    detail: string;
    icon: typeof CheckCheck;
  }
> {
  return {
    ready: {
      label: "원문 저장 완료",
      className: styles.statusReady,
      detail: "음성 저장과 한국어 전사가 끝나 원문을 바로 검토할 수 있습니다.",
      icon: CheckCheck,
    },
    processing: {
      label: "백그라운드 처리 중",
      className: styles.statusProcessing,
      detail:
        "원본 음성은 저장되었고 서버가 전사와 AI 분석을 백그라운드에서 이어서 처리합니다. 화면을 떠났다가 다시 돌아와도 됩니다.",
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
}
