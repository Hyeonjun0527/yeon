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

/* ── 학생 데이터 ── */

export const STUDENTS: Student[] = [
  {
    id: "kim",
    name: "김민수",
    initial: "민",
    gradient: "linear-gradient(135deg, #60a5fa, #818cf8)",
    tags: [
      { label: "수학", cls: "tagMath" },
      { label: "영어", cls: "tagEng" },
    ],
    grade: "중2",
    registered: "2026.03",
    counseling: 12,
    thisMonth: 3,
    lastDate: "4.8",
    mainIssue: "과제 관리",
    phone: "010-1234-5678",
    parentPhone: "010-9876-5432",
    school: "연세중학교",
    memos: [
      {
        id: "m1",
        date: "2026.04.08",
        text: "과제 제출 기한 조정 합의. 2주 후 재점검.",
      },
      {
        id: "m2",
        date: "2026.04.01",
        text: "월수금 수학, 화목 영어 학원 스케줄 확인.",
      },
      {
        id: "m3",
        date: "2026.03.20",
        text: "수업 중 집중도 떨어짐. 앞자리로 배치 변경.",
      },
    ],
    history: [
      {
        date: "2026.04.08",
        title: "수학 과제 누락 상담",
        type: "대면",
        summary: "학원 일정으로 과제 시간 부족, 제출 기한 조정 합의",
      },
      {
        date: "2026.04.05",
        title: "월간 학습 점검",
        type: "대면",
        summary: "수학 중간고사 대비 계획 수립, 주 3회 자습 권장",
      },
      {
        date: "2026.03.28",
        title: "보호자 통화",
        type: "전화",
        summary: "학원-집 학습 연계 방안 논의, 부모 협조 요청",
      },
      {
        date: "2026.03.20",
        title: "수업 태도 점검",
        type: "대면",
        summary: "집중력 저하 원인 파악, 자리 배치 변경",
      },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 학원 일정 과밀로 자기주도 학습 시간 부족. 과제 미제출이 반복되는 경향.<br/><br/><strong>개선 추이:</strong> 3월 대비 과제 완수율 향상 (60% → 80%). 자리 배치 변경 후 수업 집중도 개선.<br/><br/><strong>권장 조치:</strong><br/>• 과제 양 조절 (현행 유지)<br/>• 중간고사 전 보호자 면담 1회<br/>• 월 2회 정기 학습 점검 유지",
  },
  {
    id: "lee",
    name: "이서윤",
    initial: "서",
    gradient: "linear-gradient(135deg, #34d399, #22d3ee)",
    tags: [
      { label: "국어", cls: "tagKor" },
      { label: "영어", cls: "tagEng" },
    ],
    grade: "중3",
    registered: "2025.09",
    counseling: 8,
    thisMonth: 2,
    lastDate: "4.7",
    mainIssue: "교우 관계",
    phone: "010-2345-6789",
    parentPhone: "010-8765-4321",
    school: "한빛중학교",
    memos: [
      {
        id: "m4",
        date: "2026.04.07",
        text: "친구 갈등 상황 지속. 담임 선생님과 소통 필요.",
      },
    ],
    history: [
      {
        date: "2026.04.07",
        title: "교우 관계 고민 상담",
        type: "대면",
        summary: "친구 갈등 중재, 담임과 협력 방안 논의",
      },
      {
        date: "2026.03.30",
        title: "학습 동기 부여",
        type: "대면",
        summary: "성적 정체에 따른 동기 저하, 단기 목표 설정",
      },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 교우 관계 스트레스가 학습에 영향. 감정 표현에 어려움.<br/><br/><strong>권장 조치:</strong><br/>• 월 1회 교우관계 점검<br/>• 담임교사와 정기 소통",
  },
  {
    id: "park",
    name: "박도현",
    initial: "도",
    gradient: "linear-gradient(135deg, #fbbf24, #fb923c)",
    tags: [
      { label: "수학", cls: "tagMath" },
      { label: "과학", cls: "tagSci" },
    ],
    grade: "중1",
    registered: "2026.03",
    counseling: 5,
    thisMonth: 1,
    lastDate: "4.6",
    mainIssue: "기초 학력",
    school: "동명중학교",
    memos: [],
    history: [
      {
        date: "2026.04.06",
        title: "기초 학력 진단",
        type: "대면",
        summary: "수학 기초 연산 부족, 보충 학습 계획 수립",
      },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 초등 과정 기초 연산이 불안정. 자신감 부족.<br/><br/><strong>권장 조치:</strong><br/>• 주 2회 기초 연산 보충<br/>• 성취감 있는 과제 배정",
  },
  {
    id: "choi",
    name: "최지우",
    initial: "지",
    gradient: "linear-gradient(135deg, #fb7185, #c084fc)",
    tags: [{ label: "영어", cls: "tagEng" }],
    grade: "고1",
    registered: "2025.12",
    counseling: 3,
    thisMonth: 1,
    lastDate: "4.5",
    mainIssue: "진로 탐색",
    school: "하늘고등학교",
    memos: [
      {
        id: "m5",
        date: "2026.04.05",
        text: "이과/문과 고민 중. 적성 검사 결과 기다리는 중.",
      },
      {
        id: "m6",
        date: "2026.03.15",
        text: "영어 성적은 양호. 수학 보충 필요 여부 검토.",
      },
    ],
    history: [
      {
        date: "2026.04.05",
        title: "진로 상담",
        type: "대면",
        summary: "이과/문과 선택 고민, 적성 검사 권유",
      },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 진로 방향 미결정으로 학습 목표 불명확.<br/><br/><strong>권장 조치:</strong><br/>• 적성 검사 실시<br/>• 학과 체험 프로그램 안내",
  },
  {
    id: "jung",
    name: "정현우",
    initial: "현",
    gradient: "linear-gradient(135deg, #818cf8, #60a5fa)",
    tags: [
      { label: "수학", cls: "tagMath" },
      { label: "국어", cls: "tagKor" },
    ],
    grade: "중2",
    registered: "2025.06",
    counseling: 7,
    thisMonth: 2,
    lastDate: "4.6",
    mainIssue: "시간 관리",
    phone: "010-3456-7890",
    school: "연세중학교",
    memos: [
      {
        id: "m7",
        date: "2026.04.06",
        text: "게임 시간 하루 3시간 이상. 보호자와 규칙 합의.",
      },
    ],
    history: [
      {
        date: "2026.04.06",
        title: "시간 관리 상담",
        type: "대면",
        summary: "게임 시간 과다, 학습 루틴 재설계",
      },
      {
        date: "2026.03.25",
        title: "보호자 면담",
        type: "대면",
        summary: "가정 학습 환경 점검, 스마트폰 사용 규칙 합의",
      },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 게임 과몰입으로 학습 시간 부족. 보호자 협조 필요.<br/><br/><strong>권장 조치:</strong><br/>• 주간 학습 일지 작성<br/>• 보호자 월 1회 소통",
  },
  {
    id: "han",
    name: "한소희",
    initial: "소",
    gradient: "linear-gradient(135deg, #22d3ee, #818cf8)",
    tags: [
      { label: "영어", cls: "tagEng" },
      { label: "과학", cls: "tagSci" },
    ],
    grade: "중3",
    registered: "2025.03",
    counseling: 10,
    thisMonth: 2,
    lastDate: "4.7",
    mainIssue: "학습 전략",
    phone: "010-4567-8901",
    parentPhone: "010-7654-3210",
    school: "한빛중학교",
    memos: [
      {
        id: "m8",
        date: "2026.04.07",
        text: "영어 독해 전략 변경. 스키밍 → 정독 병행.",
      },
      {
        id: "m9",
        date: "2026.04.01",
        text: "과학 보고서 구조 개선. 실험 목적-방법-결과 프레임.",
      },
      {
        id: "m10",
        date: "2026.03.20",
        text: "단어 암기법: 어원 분석 + 문맥 활용법으로 전환.",
      },
      {
        id: "m11",
        date: "2026.03.10",
        text: "학습 의지는 높으나 비효율적 반복 학습에 시간 낭비.",
      },
    ],
    history: [
      {
        date: "2026.04.07",
        title: "영어 학습 전략 상담",
        type: "대면",
        summary: "영어 독해 전략 점검, 단어 암기법 변경",
      },
      {
        date: "2026.04.01",
        title: "과학 실험 보고서 피드백",
        type: "대면",
        summary: "보고서 구조 개선, 실험 결과 분석 방법 안내",
      },
    ],
    aiReport:
      "<strong>핵심 패턴:</strong> 학습 의지 높으나 비효율적 학습 방법 사용.<br/><br/><strong>권장 조치:</strong><br/>• 효율적 암기법 트레이닝<br/>• 과목별 학습 전략 맞춤 설계",
  },
];

/* ── 전사 세그먼트 ── */

export const TRANSCRIPT: TranscriptSegment[] = [
  {
    time: "00:00",
    speaker: "teacher",
    label: "교사",
    name: "최현준",
    text: "민수야, 오늘 수학 과제가 제출이 안 됐더라. 혹시 무슨 일 있었어?",
  },
  {
    time: "00:08",
    speaker: "student",
    label: "학생",
    name: "김민수",
    text: "아... 네, 어제 학원이 늦게 끝나서 못 했어요.",
  },
  {
    time: "00:15",
    speaker: "teacher",
    label: "교사",
    name: "최현준",
    text: "그랬구나. 학원 스케줄이 빡빡한 편이야?",
  },
  {
    time: "00:22",
    speaker: "student",
    label: "학생",
    name: "김민수",
    text: "네, 월수금 수학이랑 화목 영어 다녀요.",
  },
  {
    time: "00:30",
    speaker: "teacher",
    label: "교사",
    name: "최현준",
    text: "그러면 과제 제출 시간을 조정해볼까? 다음날 아침까지로 여유를 주면 어때?",
  },
  {
    time: "00:42",
    speaker: "student",
    label: "학생",
    name: "김민수",
    text: "그러면 할 수 있을 것 같아요. 감사합니다 선생님.",
  },
  {
    time: "01:02",
    speaker: "teacher",
    label: "교사",
    name: "최현준",
    text: "좋아, 그러면 2주 동안 이렇게 해보고, 4월 말쯤에 다시 확인하자. 다른 과목은 괜찮아?",
  },
  {
    time: "01:15",
    speaker: "student",
    label: "학생",
    name: "김민수",
    text: "영어는 괜찮은데, 과학이 좀 어려워요.",
  },
  {
    time: "01:22",
    speaker: "teacher",
    label: "교사",
    name: "최현준",
    text: "과학은 어떤 부분이 어렵니? 이론? 실험?",
  },
  {
    time: "01:30",
    speaker: "student",
    label: "학생",
    name: "김민수",
    text: "이론은 괜찮은데 계산 문제가 어려워요. 수학이랑 겹치는 부분이요.",
  },
  {
    time: "01:42",
    speaker: "teacher",
    label: "교사",
    name: "최현준",
    text: "아, 그러면 수학 기초가 좀 더 단단해지면 과학도 같이 올라갈 수 있겠다. 우선 수학에 집중하자.",
  },
  {
    time: "01:55",
    speaker: "student",
    label: "학생",
    name: "김민수",
    text: "네, 알겠습니다. 감사합니다 선생님.",
  },
];

/* ── 사이드바 기록 목록 ── */

export const SIDEBAR_RECORDS: SidebarRecord[] = [
  {
    id: "rec1",
    title: "수학 과제 누락 상담",
    status: "ready",
    meta: "김민수 · 4.8",
    duration: "2분 34초",
    studentName: "김민수",
    type: "대면 상담",
  },
  {
    id: "rec2",
    title: "교우 관계 고민 상담",
    status: "ready",
    meta: "이서윤 · 4.7",
    duration: "5분 12초",
    studentName: "이서윤",
    type: "대면 상담",
  },
  {
    id: "rec3",
    title: "녹음 2026.04.08 10:30",
    status: "processing",
    meta: "",
    duration: "3분 08초",
    studentName: "",
    type: "",
  },
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
  {
    id: "n1",
    title: "김민수 학생 전사가 완료되었습니다",
    time: "방금 전",
    unread: true,
  },
  {
    id: "n2",
    title: "이서윤 학생 AI 요약이 생성되었습니다",
    time: "5분 전",
    unread: true,
  },
  {
    id: "n3",
    title: "박도현 학생 보호자 면담 예정 (내일)",
    time: "1시간 전",
    unread: false,
  },
  {
    id: "n4",
    title: "주간 상담 리포트가 준비되었습니다",
    time: "3시간 전",
    unread: false,
  },
  {
    id: "n5",
    title: "정현우 학생 과제 미제출 3회 누적",
    time: "어제",
    unread: false,
  },
];

/* ── AI 응답 맵 ── */

export function getAiResponse(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("보호자")) {
    return "[연세학원] 학생 상담 안내\n\n안녕하세요. 오늘 학생과 상담을 진행했습니다.\n\n상담 내용을 바탕으로 보호자님께 안내드립니다. 학원 일정과 과제 제출 관련하여 조정이 필요한 부분이 있어 협의하였습니다.\n\n궁금하신 점은 편하게 연락주세요.\n\n연세학원 원장 최 드림";
  }
  if (lower.includes("후속") || lower.includes("조치")) {
    return "후속 조치 목록:\n\n1. 과제 제출 기한 조정 (익일 오전)\n2. 2주 후 학습 루틴 재점검\n3. 월 1회 보호자 소통\n4. 과제 완수율 모니터링\n5. 필요 시 추가 상담 예약";
  }
  if (lower.includes("요약") || lower.includes("정리")) {
    return "상담 요약:\n\n학원 일정(주 5회)으로 인한 과제 시간 부족이 핵심 원인입니다. 과제 제출 기한을 익일 오전으로 조정하기로 합의했으며, 2주간 적용 후 학습 루틴을 재점검할 예정입니다.\n\n과학 과목에서도 수학 기초 부족으로 인한 어려움이 있어, 수학 기초 강화를 우선 과제로 설정했습니다.";
  }
  if (lower.includes("비교") || lower.includes("이전")) {
    return "이전 상담과 비교:\n\n• 3.20 상담: 수업 태도·집중력 이슈 → 자리 배치 변경\n  → 4.08 현재: 집중도 개선됨 ✓\n\n• 3.28 보호자 통화: 학습 연계 방안 논의\n  → 가정 학습 시간 일부 확보됨\n\n• 4.05 월간 점검: 중간고사 대비 계획\n  → 과제 시간 확보가 여전히 병목";
  }
  if (lower.includes("루틴") || lower.includes("학습")) {
    return "추천 학습 루틴:\n\n월·수·금 (수학 학원 후)\n  → 20:30~21:00 수학 과제\n\n화·목 (영어 학원 후)\n  → 20:30~21:00 영어 복습\n\n토요일\n  → 10:00~12:00 주간 복습 + 밀린 과제\n\n핵심: 학원 직후 30분을 과제 시간으로 고정하는 것이 가장 현실적입니다.";
  }
  if (lower.includes("리포트") || lower.includes("pdf")) {
    return "월간 리포트 초안을 생성했습니다:\n\n📋 2026년 4월 김민수 학습 리포트\n\n• 총 상담 횟수: 3회 (대면 2, 전화 1)\n• 과제 완수율: 80% (3월 60% → 개선)\n• 주요 개선: 수업 집중도 향상\n• 남은 과제: 시간 관리, 과학 기초\n• 다음 목표: 중간고사 수학 70점 이상\n\n※ PDF 다운로드는 실제 서비스에서 지원됩니다.";
  }
  return "네, 해당 상담 기록을 기반으로 분석해 드리겠습니다. 구체적으로 어떤 부분이 궁금하신가요?\n\n참고할 수 있는 질문:\n• 이 학생의 학습 패턴 분석\n• 보호자 안내 문자 작성\n• 이전 상담과 비교\n• 추천 학습 루틴";
}

/* ── 대시보드 데이터 ── */

export const DASHBOARD_STATS = {
  todayCounseling: 4,
  totalStudents: 24,
  weeklyRecordingHours: 3.5,
  pendingFollowUps: 6,
};

export const DASHBOARD_RECENT = [
  {
    studentName: "김민수",
    title: "수학 과제 누락 상담",
    date: "오늘 03:46",
    color: "#60a5fa",
  },
  {
    studentName: "이서윤",
    title: "교우 관계 고민 상담",
    date: "어제 14:20",
    color: "#34d399",
  },
  {
    studentName: "정현우",
    title: "시간 관리 상담",
    date: "4.6 10:15",
    color: "#818cf8",
  },
  {
    studentName: "박도현",
    title: "기초 학력 진단",
    date: "4.6 09:00",
    color: "#fbbf24",
  },
  {
    studentName: "최지우",
    title: "진로 상담",
    date: "4.5 16:30",
    color: "#fb7185",
  },
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
  {
    studentName: "정현우",
    reason: "과제 미제출 3회 연속",
    gradient: "linear-gradient(135deg, #818cf8, #60a5fa)",
    initial: "현",
  },
  {
    studentName: "박도현",
    reason: "기초 학력 평가 재검 필요",
    gradient: "linear-gradient(135deg, #fbbf24, #fb923c)",
    initial: "도",
  },
];

/* ── Tag 스타일 매핑 키 ── */

export const TAG_CLS_LIST = ["tagMath", "tagEng", "tagKor", "tagSci"] as const;
export type TagCls = (typeof TAG_CLS_LIST)[number];

/* ── 과목 필터 옵션 ── */

export const SUBJECT_FILTERS = [
  { label: "전체", value: "all" },
  { label: "수학", value: "tagMath" },
  { label: "영어", value: "tagEng" },
  { label: "국어", value: "tagKor" },
  { label: "과학", value: "tagSci" },
] as const;

/* ── 정렬 옵션 ── */

export const SORT_OPTIONS = [
  { label: "이름순", value: "name" },
  { label: "최근 상담순", value: "recent" },
  { label: "상담 횟수순", value: "count" },
] as const;

/* ── 오디오 총 길이 (초) ── */
export const TOTAL_AUDIO_SECONDS = 154; // 2:34
