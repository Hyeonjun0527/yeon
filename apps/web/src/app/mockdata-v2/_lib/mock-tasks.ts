/* ── 후속 조치 목데이터 ── */

export type TaskStatus = "pending" | "in-progress" | "done";
export type TaskPriority = "high" | "medium" | "low";

export interface FollowUpTask {
  id: string;
  description: string;
  studentId: string;
  studentName: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  sourceRecordId: string;
  sourceRecordTitle: string;
  createdAt: string;
  isAiGenerated: boolean;
}

export const MOCK_TASKS: FollowUpTask[] = [
  {
    id: "t1",
    description: "팀 프로젝트 API 3개 구현 완료 여부 확인",
    studentId: "kim",
    studentName: "김도윤",
    dueDate: "2026.04.11",
    status: "pending",
    priority: "high",
    sourceRecordId: "rec1",
    sourceRecordTitle: "팀 프로젝트 중간 점검",
    createdAt: "2026.04.08",
    isAiGenerated: true,
  },
  {
    id: "t2",
    description: "Git 워크플로우 미니 세션 진행 (팀 전체)",
    studentId: "kim",
    studentName: "김도윤",
    dueDate: "2026.04.09",
    status: "in-progress",
    priority: "high",
    sourceRecordId: "rec1",
    sourceRecordTitle: "팀 프로젝트 중간 점검",
    createdAt: "2026.04.08",
    isAiGenerated: true,
  },
  {
    id: "t3",
    description: "이력서 초안 재구성 피드백 전달",
    studentId: "lee",
    studentName: "이하은",
    dueDate: "2026.04.10",
    status: "pending",
    priority: "medium",
    sourceRecordId: "rec2",
    sourceRecordTitle: "취업 준비 상담",
    createdAt: "2026.04.07",
    isAiGenerated: true,
  },
  {
    id: "t4",
    description: "모의 면접 일정 잡기 (프론트엔드 포지션)",
    studentId: "lee",
    studentName: "이하은",
    dueDate: "2026.04.14",
    status: "pending",
    priority: "medium",
    sourceRecordId: "rec2",
    sourceRecordTitle: "취업 준비 상담",
    createdAt: "2026.04.07",
    isAiGenerated: true,
  },
  {
    id: "t5",
    description: "통계 기초 보충 자료 및 스터디 그룹 연결",
    studentId: "park",
    studentName: "박시우",
    dueDate: "2026.04.08",
    status: "done",
    priority: "medium",
    sourceRecordId: "",
    sourceRecordTitle: "기초 통계 보강 상담",
    createdAt: "2026.04.06",
    isAiGenerated: true,
  },
  {
    id: "t6",
    description: "UX 리서치 현직자 멘토 매칭",
    studentId: "choi",
    studentName: "최예진",
    dueDate: "2026.04.12",
    status: "pending",
    priority: "medium",
    sourceRecordId: "",
    sourceRecordTitle: "커리어 전환 상담",
    createdAt: "2026.04.05",
    isAiGenerated: true,
  },
  {
    id: "t7",
    description: "주간 학습 플랜 이행 여부 점검",
    studentId: "jung",
    studentName: "정우진",
    dueDate: "2026.04.09",
    status: "pending",
    priority: "high",
    sourceRecordId: "",
    sourceRecordTitle: "학습 스케줄 상담",
    createdAt: "2026.04.06",
    isAiGenerated: true,
  },
  {
    id: "t8",
    description: "Spring Boot 핵심 과제 우선 제출 확인",
    studentId: "jung",
    studentName: "정우진",
    dueDate: "2026.04.13",
    status: "pending",
    priority: "low",
    sourceRecordId: "",
    sourceRecordTitle: "학습 스케줄 상담",
    createdAt: "2026.04.06",
    isAiGenerated: false,
  },
  {
    id: "t9",
    description: "Next.js 공식 문서 학습 전략 1주차 효과 점검",
    studentId: "han",
    studentName: "한소율",
    dueDate: "2026.04.14",
    status: "pending",
    priority: "medium",
    sourceRecordId: "",
    sourceRecordTitle: "프론트엔드 심화 상담",
    createdAt: "2026.04.07",
    isAiGenerated: true,
  },
  {
    id: "t10",
    description: "TDD 실습 과제 피드백",
    studentId: "han",
    studentName: "한소율",
    dueDate: "2026.04.06",
    status: "done",
    priority: "low",
    sourceRecordId: "",
    sourceRecordTitle: "테스트 코드 멘토링",
    createdAt: "2026.04.01",
    isAiGenerated: false,
  },
];

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  high: "긴급",
  medium: "보통",
  low: "낮음",
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "미완료",
  "in-progress": "진행 중",
  done: "완료",
};
