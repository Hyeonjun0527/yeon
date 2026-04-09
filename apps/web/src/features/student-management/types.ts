/* ── 학생관리 Feature 전용 타입 ── */

/** 학생 상태 (필드명은 generic, UI 레이블은 constants.ts에서 매핑) */
export type StudentStatus = "enrolled" | "on_leave" | "withdrawn" | "graduated";

export interface Guardian {
  id: string;
  name: string;
  phone: string;
  relation: string;
}

export interface Memo {
  id: string;
  date: string;
  text: string;
  author?: string;
}

export interface CounselingHistoryItem {
  id: string;
  date: string;
  title: string;
  type: string;
  summary: string;
  status: "completed" | "in_progress" | "pending";
}

export interface CourseHistoryItem {
  id: string;
  className: string;
  period: string;
  status: "active" | "completed" | "dropped";
  instructor?: string;
}

export interface Student {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  school?: string;
  grade: string;
  status: StudentStatus;
  registeredAt: string;
  tags: string[];
  classIds: string[];
  guardians: Guardian[];
  memos: Memo[];
  counselingHistory: CounselingHistoryItem[];
  courseHistory: CourseHistoryItem[];
}

export interface ClassRoom {
  id: string;
  name: string;
  subject: string;
  capacity: number;
  studentIds: string[];
  instructor?: string;
  schedule?: string;
  year: number;
}

/** 뷰 모드 */
export type ViewMode = "card" | "table";

/** 탭 ID */
export type DetailTab =
  | "overview"
  | "counseling"
  | "courses"
  | "guardian"
  | "memos"
  | "report";

/** Sheet 모드 */
export type SheetMode = "create" | "edit" | null;

/* ── API 응답 타입 ── */

/** 스페이스 (기존 ClassRoom 대체) */
export interface Space {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 멤버 상태 */
export type MemberStatus = "active" | "withdrawn" | "graduated";

/** 위험도 레벨 */
export type RiskLevel = "low" | "medium" | "high";

/** 수강생 (기존 Student 대체) */
export interface Member {
  id: string;
  spaceId: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
  initialRiskLevel?: string | null;
  counselingRecordId?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 활동 로그 */
export interface ActivityLog {
  id: string;
  memberId: string;
  spaceId: string;
  type: string;
  status?: string | null;
  recordedAt: string;
  source: string;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

/** 구글 시트 연동 */
export interface SheetIntegration {
  id: string;
  spaceId: string;
  sheetUrl: string;
  sheetId: string;
  dataType: string;
  columnMapping?: Record<string, unknown> | null;
  lastSyncedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
