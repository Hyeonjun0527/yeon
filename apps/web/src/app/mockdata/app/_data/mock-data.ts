/* ── YEON 목 서비스 — 전체 목데이터 ── */

export interface StudentMemo {
  id: string;
  date: string;
  text: string;
}

export interface CounselingHistory {
  date: string;
  title: string;
  type: string;
  summary: string;
}

export interface Student {
  id: string;
  name: string;
  initial: string;
  gradient: string;
  tags: { label: string; cls: "tagMath" | "tagEng" | "tagKor" | "tagSci" }[];
  grade: string;
  registered: string;
  counseling: number;
  thisMonth: number;
  lastDate: string;
  memos: StudentMemo[];
  mainIssue: string;
  history: CounselingHistory[];
  aiReport: string;
  phone?: string;
  parentPhone?: string;
  school?: string;
}

export interface SidebarRecord {
  id: string;
  title: string;
  status: "ready" | "processing";
  meta: string;
  duration: string;
  studentName: string;
  type: string;
}

export interface TranscriptSegment {
  time: string;
  speaker: "teacher" | "student" | "guardian";
  label: string;
  name: string;
  text: string;
}

export interface Notification {
  id: string;
  title: string;
  time: string;
  unread: boolean;
}

/* ── 수강생 데이터 ── */

export const STUDENTS: Student[] = [
  {
    id: "kim",
    name: "김도윤",
    initial: "도",
    gradient: "linear-gradient(135deg, #60a5fa, #818cf8)",
    tags: [
      { label: "백엔드", cls: "tagMath" },
      { label: "Python", cls: "tagSci" },
    ],
    grade: "5기",
    registered: "2026.03",
    counseling: 12,
    thisMonth: 3,
    lastDate: "4.8",
    mainIssue: "프로젝트 진도 지연",
    phone: "010-1234-5678",
    school: "풀스택 부트캠프",
    memos: [
      { id: "m1", date: "2026.04.08", text: "팀 프로젝트 백엔드 API 설계 지연. 2주 내 MVP 완성 목표 재설정." },
      { id: "m2", date: "2026.04.01", text: "Django REST 과제 피드백 완료. ORM 쿼리 최적화 추가 학습 필요." },
      { id: "m3", date: "2026.03.20", text: "Git 브랜치 전략 미숙. 협업 워크플로우 추가 세션 진행." },
    ],
    history: [
      { date: "2026.04.08", title: "팀 프로젝트 중간 점검", type: "대면", summary: "백엔드 API 설계 지연, MVP 스코프 조정 합의" },
      { date: "2026.04.05", title: "주간 학습 점검", type: "대면", summary: "Django ORM 심화 학습 계획 수립, 주 3회 코드 리뷰 참여 권장" },
      { date: "2026.03.28", title: "커리어 상담", type: "화상", summary: "백엔드 vs 풀스택 진로 고민, 포트폴리오 방향 논의" },
      { date: "2026.03.20", title: "Git 워크플로우 멘토링", type: "대면", summary: "브랜치 전략, PR 리뷰 프로세스 실습" },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 개념 이해는 빠르나 실제 구현 속도가 느림. 설계 단계에서 과도한 시간 소요.<br/><br/><strong>개선 추이:</strong> 3월 대비 과제 완수율 향상 (60% → 80%). Git 협업 역량 눈에 띄게 개선.<br/><br/><strong>권장 조치:</strong><br/>• MVP 먼저 구현 후 리팩토링하는 습관 코칭<br/>• 주간 1:1 코드 리뷰 유지<br/>• 팀 프로젝트 데드라인 관리 지원",
  },
  {
    id: "lee",
    name: "이하은",
    initial: "하",
    gradient: "linear-gradient(135deg, #34d399, #22d3ee)",
    tags: [
      { label: "프론트엔드", cls: "tagEng" },
      { label: "React", cls: "tagKor" },
    ],
    grade: "5기",
    registered: "2026.03",
    counseling: 8,
    thisMonth: 2,
    lastDate: "4.7",
    mainIssue: "취업 준비 병행",
    phone: "010-2345-6789",
    school: "풀스택 부트캠프",
    memos: [
      { id: "m4", date: "2026.04.07", text: "이력서 초안 검토. 프로젝트 경험 위주로 재구성 권유." },
    ],
    history: [
      { date: "2026.04.07", title: "취업 준비 상담", type: "대면", summary: "이력서 구조 피드백, 포트폴리오 사이트 구축 계획" },
      { date: "2026.03.30", title: "학습 동기 부여", type: "대면", summary: "React 심화 과정 진입 전 자신감 저하, 단기 목표 설정" },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 취업 준비와 학습 병행으로 시간 분배에 어려움. UI/UX 감각은 우수.<br/><br/><strong>권장 조치:</strong><br/>• 주 1회 모의 면접 참여 권장<br/>• 포트폴리오 프로젝트 마감일 설정",
  },
  {
    id: "park",
    name: "박시우",
    initial: "시",
    gradient: "linear-gradient(135deg, #fbbf24, #fb923c)",
    tags: [
      { label: "데이터", cls: "tagSci" },
      { label: "SQL", cls: "tagMath" },
    ],
    grade: "4기",
    registered: "2026.01",
    counseling: 5,
    thisMonth: 1,
    lastDate: "4.6",
    mainIssue: "기초 통계 보강",
    phone: "010-3456-7890",
    school: "데이터 분석 과정",
    memos: [],
    history: [
      { date: "2026.04.06", title: "기초 통계 보강 상담", type: "대면", summary: "확률·통계 기초 부족, 보충 자료 제공 및 스터디 그룹 연결" },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 비전공자로 수학적 기초가 불안정. 실습 의지는 높음.<br/><br/><strong>권장 조치:</strong><br/>• 주 2회 통계 기초 보충 스터디<br/>• 실데이터 기반 프로젝트로 동기 유지",
  },
  {
    id: "choi",
    name: "최예진",
    initial: "예",
    gradient: "linear-gradient(135deg, #fb7185, #c084fc)",
    tags: [{ label: "UX/UI", cls: "tagEng" }],
    grade: "5기",
    registered: "2026.03",
    counseling: 3,
    thisMonth: 1,
    lastDate: "4.5",
    mainIssue: "커리어 전환",
    phone: "010-4567-8901",
    school: "UX 디자인 과정",
    memos: [
      { id: "m5", date: "2026.04.05", text: "전직 마케터. UX 리서치 vs UI 디자인 트랙 고민 중." },
      { id: "m6", date: "2026.03.15", text: "Figma 숙련도 양호. 사용자 인터뷰 실습 추가 필요." },
    ],
    history: [
      { date: "2026.04.05", title: "커리어 전환 상담", type: "대면", summary: "UX 리서치 vs UI 디자인 트랙 선택 고민, 업계 멘토 연결 예정" },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 마케팅 경력이 UX 리서치에 강점으로 작용. 트랙 선택 미결정.<br/><br/><strong>권장 조치:</strong><br/>• 업계 현직자 멘토링 1회<br/>• 미니 프로젝트로 양쪽 트랙 체험",
  },
  {
    id: "jung",
    name: "정우진",
    initial: "우",
    gradient: "linear-gradient(135deg, #818cf8, #60a5fa)",
    tags: [
      { label: "백엔드", cls: "tagMath" },
      { label: "Java", cls: "tagKor" },
    ],
    grade: "5기",
    registered: "2026.03",
    counseling: 7,
    thisMonth: 2,
    lastDate: "4.6",
    mainIssue: "시간 관리",
    phone: "010-5678-9012",
    school: "풀스택 부트캠프",
    memos: [
      { id: "m7", date: "2026.04.06", text: "파트타임 병행으로 과제 지연 빈번. 학습 스케줄 재조정." },
    ],
    history: [
      { date: "2026.04.06", title: "학습 스케줄 상담", type: "대면", summary: "파트타임 근무와 학습 시간 충돌, 주간 플랜 재설계" },
      { date: "2026.03.25", title: "중간 점검", type: "대면", summary: "Spring Boot 과제 밀림, 핵심 과제 우선순위 정리" },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 파트타임 병행으로 학습 시간 절대적 부족. 집중 시 이해도 높음.<br/><br/><strong>권장 조치:</strong><br/>• 주간 학습 플랜 작성 및 점검<br/>• 핵심 과제 우선 처리 전략",
  },
  {
    id: "han",
    name: "한소율",
    initial: "소",
    gradient: "linear-gradient(135deg, #22d3ee, #818cf8)",
    tags: [
      { label: "프론트엔드", cls: "tagEng" },
      { label: "TypeScript", cls: "tagSci" },
    ],
    grade: "4기",
    registered: "2025.11",
    counseling: 10,
    thisMonth: 2,
    lastDate: "4.7",
    mainIssue: "학습 전략",
    phone: "010-6789-0123",
    school: "풀스택 부트캠프",
    memos: [
      { id: "m8", date: "2026.04.07", text: "Next.js App Router 학습 전략 변경. 공식 문서 + 미니 프로젝트 병행." },
      { id: "m9", date: "2026.04.01", text: "테스트 코드 작성 습관화. Jest + React Testing Library 도입." },
      { id: "m10", date: "2026.03.20", text: "TypeScript 제네릭 이해 부족. 타입 챌린지 풀이로 보강." },
      { id: "m11", date: "2026.03.10", text: "학습 의지 높으나 공식 문서보다 유튜브에 의존하는 습관." },
    ],
    history: [
      { date: "2026.04.07", title: "프론트엔드 심화 상담", type: "대면", summary: "Next.js 학습 전략 점검, 공식 문서 읽기 습관화" },
      { date: "2026.04.01", title: "테스트 코드 멘토링", type: "대면", summary: "TDD 접근법 소개, 테스트 작성 실습" },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 학습 의지 높으나 비효율적 학습 경로 선택 경향.<br/><br/><strong>권장 조치:</strong><br/>• 공식 문서 기반 학습 루틴 정착<br/>• 주간 미니 프로젝트로 실습 강화",
  },
];

/* ── 전사 세그먼트 ── */

export const TRANSCRIPT: TranscriptSegment[] = [
  { time: "00:00", speaker: "teacher", label: "멘토", name: "최현준", text: "도윤님, 이번 주 팀 프로젝트 진행 상황 좀 이야기해볼까요?" },
  { time: "00:08", speaker: "student", label: "수강생", name: "김도윤", text: "네, 사실 백엔드 API 설계가 생각보다 오래 걸리고 있어요." },
  { time: "00:15", speaker: "teacher", label: "멘토", name: "최현준", text: "어떤 부분에서 막히고 있어요? 데이터 모델링? 아니면 엔드포인트 설계?" },
  { time: "00:22", speaker: "student", label: "수강생", name: "김도윤", text: "인증 쪽이요. JWT랑 세션 방식 중 뭘 쓸지 결정을 못 하겠어서 계속 리서치만 하고 있었어요." },
  { time: "00:30", speaker: "teacher", label: "멘토", name: "최현준", text: "아, 그러면 일단 JWT로 가보죠. MVP 단계에서는 빠르게 구현하고, 나중에 필요하면 바꾸면 돼요. 완벽한 설계보다 동작하는 코드가 먼저예요." },
  { time: "00:42", speaker: "student", label: "수강생", name: "김도윤", text: "그렇죠. 너무 설계에만 시간을 쓴 것 같아요. 이번 주 안에 API 3개는 완성해볼게요." },
  { time: "01:02", speaker: "teacher", label: "멘토", name: "최현준", text: "좋아요. 그러면 이번 주 금요일에 중간 점검하고, 다음 주에 프론트엔드 연동까지 갈 수 있을지 보죠. 다른 어려운 점은요?" },
  { time: "01:15", speaker: "student", label: "수강생", name: "김도윤", text: "Git에서 팀원이랑 충돌이 자주 나는데, 어떻게 하면 좋을까요?" },
  { time: "01:22", speaker: "teacher", label: "멘토", name: "최현준", text: "브랜치 전략을 정하면 많이 줄어요. feature 브랜치 따서 작업하고, PR로 머지하는 흐름 잡아볼까요?" },
  { time: "01:30", speaker: "student", label: "수강생", name: "김도윤", text: "네, 팀원들이랑 같이 정해보겠습니다." },
  { time: "01:42", speaker: "teacher", label: "멘토", name: "최현준", text: "내일 오후에 Git 워크플로우 미니 세션 하나 열 테니 팀원들도 같이 오세요." },
  { time: "01:55", speaker: "student", label: "수강생", name: "김도윤", text: "감사합니다. 멘토님 덕분에 방향이 잡혔어요." },
];

/* ── 사이드바 기록 목록 ── */

export const SIDEBAR_RECORDS: SidebarRecord[] = [
  { id: "rec1", title: "팀 프로젝트 중간 점검", status: "ready", meta: "김도윤 · 4.8", duration: "2분 34초", studentName: "김도윤", type: "1:1 멘토링" },
  { id: "rec2", title: "취업 준비 상담", status: "ready", meta: "이하은 · 4.7", duration: "5분 12초", studentName: "이하은", type: "커리어 상담" },
  { id: "rec3", title: "녹음 2026.04.08 10:30", status: "processing", meta: "", duration: "3분 08초", studentName: "", type: "" },
];

/* ── Processing 단계 ── */

export const PROCESSING_STEPS = [
  { label: "파일 업로드", completeAt: 800 },
  { label: "화자 분리", completeAt: 1500 },
  { label: "AI 전사", completeAt: 2500 },
  { label: "화자 식별", completeAt: 3400 },
  { label: "상담 분석", completeAt: 4200 },
] as const;

/* ── 알림 ── */

export const NOTIFICATIONS: Notification[] = [
  { id: "n1", title: "김도윤 수강생 전사가 완료되었습니다", time: "방금 전", unread: true },
  { id: "n2", title: "이하은 수강생 AI 요약이 생성되었습니다", time: "5분 전", unread: true },
  { id: "n3", title: "박시우 수강생 1:1 멘토링 예정 (내일)", time: "1시간 전", unread: false },
  { id: "n4", title: "주간 멘토링 리포트가 준비되었습니다", time: "3시간 전", unread: false },
  { id: "n5", title: "정우진 수강생 과제 미제출 3회 누적", time: "어제", unread: false },
];

/* ── AI 응답 맵 ── */

export function getAiResponse(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("리포트") || lower.includes("pdf")) {
    return "월간 리포트 초안을 생성했습니다:\n\n📋 2026년 4월 김도윤 학습 리포트\n\n• 총 멘토링 횟수: 3회 (1:1 2회, 커리어 1회)\n• 과제 완수율: 80% (3월 60% → 개선)\n• 주요 개선: Git 협업 역량 향상\n• 남은 과제: 팀 프로젝트 MVP 완성, API 설계 속도\n• 다음 목표: 금요일까지 API 3개 구현\n\n※ PDF 다운로드는 실제 서비스에서 지원됩니다.";
  }
  if (lower.includes("후속") || lower.includes("조치")) {
    return "후속 조치 목록:\n\n1. 팀 프로젝트 API 3개 구현 (금요일까지)\n2. Git 워크플로우 미니 세션 참석\n3. 프론트엔드 연동 일정 조율\n4. 주간 코드 리뷰 참여\n5. 필요 시 추가 멘토링 예약";
  }
  if (lower.includes("요약") || lower.includes("정리")) {
    return "멘토링 요약:\n\n백엔드 API 설계 지연의 핵심 원인은 인증 방식 결정에 과도한 시간을 소요한 것입니다. JWT로 우선 구현하기로 합의했으며, 이번 주 내 API 3개 완성을 목표로 설정했습니다.\n\nGit 충돌 문제는 브랜치 전략 미수립이 원인으로, 내일 팀 대상 Git 워크플로우 미니 세션을 진행할 예정입니다.";
  }
  if (lower.includes("비교") || lower.includes("이전")) {
    return "이전 멘토링과 비교:\n\n• 3.20 멘토링: Git 브랜치 전략 미숙 → 워크플로우 실습\n  → 4.08 현재: Git 역량 개선됨 ✓\n\n• 3.28 커리어 상담: 백엔드 vs 풀스택 고민\n  → 백엔드 집중으로 방향 설정됨\n\n• 4.05 주간 점검: Django ORM 심화\n  → 과제 완수율 향상 (60% → 80%) ✓";
  }
  if (lower.includes("루틴") || lower.includes("학습")) {
    return "추천 학습 루틴:\n\n월·수·금 (프로젝트 집중일)\n  → 09:00~12:00 팀 프로젝트 구현\n  → 14:00~15:00 코드 리뷰\n\n화·목 (학습일)\n  → 09:00~11:00 Django 심화 학습\n  → 14:00~16:00 개인 과제\n\n핵심: MVP 구현을 최우선으로 두고, 리팩토링은 이후 단계에서 진행합니다.";
  }
  return "네, 해당 멘토링 기록을 기반으로 분석해 드리겠습니다. 구체적으로 어떤 부분이 궁금하신가요?\n\n참고할 수 있는 질문:\n• 이 수강생의 학습 패턴 분석\n• 수강생 리포트 작성\n• 이전 멘토링과 비교\n• 추천 학습 루틴";
}

/* ── 대시보드 데이터 ── */

export const DASHBOARD_STATS = {
  todayCounseling: 4,
  totalStudents: 24,
  weeklyRecordingHours: 3.5,
  pendingFollowUps: 6,
};

export const DASHBOARD_RECENT = [
  { studentName: "김도윤", title: "팀 프로젝트 중간 점검", date: "오늘 03:46", color: "#60a5fa" },
  { studentName: "이하은", title: "취업 준비 상담", date: "어제 14:20", color: "#34d399" },
  { studentName: "정우진", title: "학습 스케줄 상담", date: "4.6 10:15", color: "#818cf8" },
  { studentName: "박시우", title: "기초 통계 보강 상담", date: "4.6 09:00", color: "#fbbf24" },
  { studentName: "최예진", title: "커리어 전환 상담", date: "4.5 16:30", color: "#fb7185" },
];

export const DASHBOARD_WEEKLY_CHART = [
  { day: "월", value: 65 },
  { day: "화", value: 40 },
  { day: "수", value: 80 },
  { day: "목", value: 55 },
  { day: "금", value: 90 },
  { day: "토", value: 30 },
  { day: "일", value: 10 },
];

export const DASHBOARD_ALERTS = [
  { studentName: "정우진", reason: "과제 미제출 3회 연속", gradient: "linear-gradient(135deg, #818cf8, #60a5fa)", initial: "우" },
  { studentName: "박시우", reason: "기초 통계 보충 학습 필요", gradient: "linear-gradient(135deg, #fbbf24, #fb923c)", initial: "시" },
];

/* ── Tag 스타일 매핑 키 ── */

export const TAG_CLS_LIST = ["tagMath", "tagEng", "tagKor", "tagSci"] as const;
export type TagCls = (typeof TAG_CLS_LIST)[number];

/* ── 과목 필터 옵션 ── */

export const SUBJECT_FILTERS = [
  { label: "전체", value: "all" },
  { label: "백엔드", value: "tagMath" },
  { label: "프론트엔드", value: "tagEng" },
  { label: "UX/UI", value: "tagKor" },
  { label: "데이터", value: "tagSci" },
] as const;

/* ── 정렬 옵션 ── */

export const SORT_OPTIONS = [
  { label: "이름순", value: "name" },
  { label: "최근 상담순", value: "recent" },
  { label: "상담 횟수순", value: "count" },
] as const;

/* ── 오디오 총 길이 (초) ── */
export const TOTAL_AUDIO_SECONDS = 154; // 2:34
