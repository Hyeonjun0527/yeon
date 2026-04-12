export const demoSpaces = [
  { id: "space-7", name: "7기", memberCount: 48, activeCheckSessions: 2 },
  {
    id: "space-6",
    name: "6기(클라우드)",
    memberCount: 31,
    activeCheckSessions: 1,
  },
];

export const demoRecords = [
  {
    id: "rec-1",
    studentName: "김민수",
    sessionTitle: "과제 누락 이후 보호자 요청 정리",
    status: "ready",
    createdAt: "오늘 14:10",
    tags: ["원문 완료", "AI 요약", "후속조치 3개"],
  },
  {
    id: "rec-2",
    studentName: "박서윤",
    sessionTitle: "중간 점검 상담",
    status: "processing",
    createdAt: "오늘 11:40",
    tags: ["전사 중", "화자 분리"],
  },
  {
    id: "rec-3",
    studentName: "이도현",
    sessionTitle: "학습 리듬 조정 상담",
    status: "ready",
    createdAt: "어제 18:20",
    tags: ["체크리스트 완료"],
  },
];

export const demoTranscript = [
  {
    speaker: "교사",
    time: "00:00",
    text: "민수야, 이번 주 과제 제출이 두 번 밀렸는데 어떤 지점이 가장 막혔는지부터 볼게.",
  },
  {
    speaker: "학생",
    time: "00:14",
    text: "학원 끝나고 집에 가면 너무 늦어서 시작을 못 했어요. 어디서부터 해야 할지도 애매했고요.",
  },
  {
    speaker: "교사",
    time: "00:31",
    text: "그럼 과제 양보다 시작 구조가 문제였네. 이번 주는 제출 마감보다 먼저 '착수 시간'을 정하자.",
  },
  {
    speaker: "보호자",
    time: "00:55",
    text: "집에서는 스스로 하길 기다렸는데 오히려 시작을 못 하더라고요. 체크 포인트가 필요해 보여요.",
  },
];

export const demoSummary = {
  core: [
    "과제 누락의 핵심 원인은 시간 부족보다 시작 구조 부재",
    "보호자는 집에서 체크 포인트 제공을 원함",
    "학생은 착수 허들이 높아 과제 시작을 미루는 패턴 보임",
  ],
  issues: [
    "과제 시작 시간이 정해져 있지 않음",
    "과제량보다 착수 판단 부담이 큼",
    "보호자와 학원 사이 체크 기준이 분산됨",
  ],
  actions: [
    "월·수·금 21:10 착수 알림 고정",
    "과제를 15분 단위 체크리스트로 분리",
    "다음 상담 전 보호자 체크 기록 1회 수집",
  ],
};

export const demoChat = [
  {
    role: "user",
    content: "보호자에게 보낼 안내 문구를 실무적으로 써줘",
  },
  {
    role: "assistant",
    content:
      "이번 상담에서는 과제량보다 과제 착수 구조가 없는 점이 핵심 원인으로 확인되었습니다. 이번 주부터는 착수 시간을 고정하고, 과제를 짧은 체크리스트 단위로 나누어 진행할 예정입니다. 가정에서도 시작 여부만 간단히 확인해 주시면 학원에서 후속 점검을 이어가겠습니다.",
  },
];

export const demoMembers = [
  {
    name: "김민수",
    status: "수강중",
    risk: "medium",
    lastCounselingAt: "오늘",
    recordCount: 12,
  },
  {
    name: "박서윤",
    status: "수강중",
    risk: "low",
    lastCounselingAt: "어제",
    recordCount: 6,
  },
  {
    name: "이도현",
    status: "수강중",
    risk: "high",
    lastCounselingAt: "2일 전",
    recordCount: 9,
  },
  {
    name: "최하린",
    status: "휴학",
    risk: "low",
    lastCounselingAt: "지난주",
    recordCount: 4,
  },
];

export const demoBoardRows = [
  {
    name: "김민수",
    attendance: "출석",
    assignment: "완료",
    link: "https://drive.google.com/file/d/minsu-homework",
    selfCheckReady: true,
  },
  {
    name: "박서윤",
    attendance: "출석",
    assignment: "미완료",
    link: "",
    selfCheckReady: true,
  },
  {
    name: "이도현",
    attendance: "미정",
    assignment: "완료",
    link: "https://notion.so/project-review",
    selfCheckReady: false,
  },
];

export const demoCheckSessions = [
  {
    title: "오늘 출석/과제 체크",
    methods: "QR + 위치",
    status: "열림",
    detail: "반경 120m · 강남 강의실",
  },
  {
    title: "야간반 체크인",
    methods: "QR",
    status: "닫힘",
    detail: "이전 세션 보관",
  },
];

export const demoImportDrafts = [
  {
    fileName: "스페이스_통합_수강생.xlsx",
    status: "분석 완료",
    description: "수강생 48명 · 스페이스 초안 ready",
  },
  {
    fileName: "7기_상담이력_정리.csv",
    status: "검토 필요",
    description: "시트 컬럼 매핑 확인 필요",
  },
];
