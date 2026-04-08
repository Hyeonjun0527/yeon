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
  | "memos";

/** Sheet 모드 */
export type SheetMode = "create" | "edit" | null;
