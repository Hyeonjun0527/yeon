import type {
  InstructorRiskLevel,
  LearningSignalEventType,
  StudentCareSegment,
} from "@yeon/api-contract";

import type { StudentManagementBadgeTone } from "@/components/student-management-ui/student-management-ui";

export const studentManagementRiskLabelMap: Record<
  InstructorRiskLevel,
  string
> = {
  high: "위험도 상",
  medium: "위험도 중",
  low: "위험도 하",
};

export const studentManagementSegmentLabelMap: Record<
  StudentCareSegment,
  string
> = {
  "needs-care": "즉시 케어",
  "follow-up": "후속 확인",
  watch: "관찰 유지",
  stable: "안정",
};

export const studentManagementRiskToneMap: Record<
  InstructorRiskLevel,
  StudentManagementBadgeTone
> = {
  high: "danger",
  medium: "warning",
  low: "success",
};

export const studentManagementSegmentToneMap: Record<
  StudentCareSegment,
  StudentManagementBadgeTone
> = {
  "needs-care": "neutral",
  "follow-up": "neutral",
  watch: "ghost",
  stable: "ghost",
};

export const studentManagementSignalToneMap: Record<
  LearningSignalEventType,
  StudentManagementBadgeTone
> = {
  attendance: "info",
  assignment: "warning",
  question: "neutral",
  "coaching-note": "accent",
};
