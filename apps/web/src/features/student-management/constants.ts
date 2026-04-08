import type { DetailTab, StudentStatus } from "./types";

/* ── 상태 메타 (generic 필드 → 부트캠프 UI 레이블) ── */
export const STUDENT_STATUS_META: Record<
  StudentStatus,
  { label: string; color: string; bgColor: string }
> = {
  enrolled: { label: "수강중", color: "#34d399", bgColor: "rgba(52, 211, 153, 0.1)" },
  on_leave: { label: "휴원", color: "#fbbf24", bgColor: "rgba(251, 191, 36, 0.1)" },
  withdrawn: { label: "중도포기", color: "#a1a1aa", bgColor: "rgba(161, 161, 170, 0.1)" },
  graduated: { label: "수료", color: "#818cf8", bgColor: "rgba(129, 140, 248, 0.1)" },
} as const;

/* ── 탭 목록 ── */
export const DETAIL_TABS: { id: DetailTab; label: string }[] = [
  { id: "overview", label: "개요" },
  { id: "counseling", label: "상담기록" },
  { id: "courses", label: "수강이력" },
  { id: "guardian", label: "보호자" },
  { id: "memos", label: "메모" },
];

/* ── 아바타 파스텔 팔레트 ── */
export const AVATAR_COLORS = [
  "linear-gradient(135deg, #818cf8, #22d3ee)",
  "linear-gradient(135deg, #f87171, #fb7185)",
  "linear-gradient(135deg, #34d399, #22d3ee)",
  "linear-gradient(135deg, #fbbf24, #f87171)",
  "linear-gradient(135deg, #818cf8, #fb7185)",
  "linear-gradient(135deg, #22d3ee, #34d399)",
  "linear-gradient(135deg, #fb7185, #fbbf24)",
  "linear-gradient(135deg, #34d399, #818cf8)",
  "linear-gradient(135deg, #f87171, #fbbf24)",
  "linear-gradient(135deg, #22d3ee, #818cf8)",
] as const;

/* ── 부트캠프 도메인 레이블 매핑 ── */
export const DOMAIN_LABELS = {
  class: "코호트",
  subject: "트랙",
  instructor: "멘토",
  grade: "기수",
  enrolled: "수강중",
  graduated: "수료",
} as const;
