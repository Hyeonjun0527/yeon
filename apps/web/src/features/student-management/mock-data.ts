import type {
  ClassRoom,
  CounselingHistoryItem,
  CourseHistoryItem,
  Guardian,
  Memo,
  Student,
} from "./types";

/* ── 반(코호트) ── */
export const MOCK_CLASSES: ClassRoom[] = [
  {
    id: "c1",
    name: "웹개발 1기",
    subject: "풀스택 웹개발",
    capacity: 15,
    studentIds: ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9", "s10", "s11", "s12"],
    instructor: "김태호 멘토",
    schedule: "월~금 09:00-18:00",
    year: 2026,
  },
  {
    id: "c2",
    name: "웹개발 2기",
    subject: "풀스택 웹개발",
    capacity: 15,
    studentIds: ["s13", "s14", "s15", "s16", "s17", "s18", "s19", "s20"],
    instructor: "박지영 멘토",
    schedule: "월~금 09:00-18:00",
    year: 2026,
  },
  {
    id: "c3",
    name: "데이터분석 1기",
    subject: "데이터 사이언스",
    capacity: 12,
    studentIds: ["s21", "s22", "s23", "s24", "s25"],
    instructor: "이준서 멘토",
    schedule: "월~금 10:00-19:00",
    year: 2026,
  },
  {
    id: "c4",
    name: "UI/UX 디자인 1기",
    subject: "프로덕트 디자인",
    capacity: 10,
    studentIds: ["s26", "s27", "s28", "s29", "s30"],
    instructor: "정수빈 멘토",
    schedule: "월~금 10:00-19:00",
    year: 2026,
  },
  {
    id: "c5",
    name: "백엔드 심화 1기",
    subject: "서버/인프라",
    capacity: 10,
    studentIds: ["s31", "s32", "s33"],
    instructor: "최동현 멘토",
    schedule: "월수금 19:00-22:00",
    year: 2026,
  },
  {
    id: "c6",
    name: "프론트엔드 심화 1기",
    subject: "React/Next.js",
    capacity: 10,
    studentIds: ["s34", "s35"],
    instructor: "한소영 멘토",
    schedule: "화목 19:00-22:00",
    year: 2026,
  },
];

/* ── 헬퍼: 공통 상담 이력 ── */
function makeCounselingHistory(count: number): CounselingHistoryItem[] {
  const types = ["학습 상담", "진로 상담", "멘토링", "코드 리뷰", "취업 상담"];
  const items: CounselingHistoryItem[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(2026, 2 - Math.floor(i / 3), 28 - i * 3);
    items.push({
      id: `ch-${i}`,
      date: d.toISOString().slice(0, 10),
      title: `${types[i % types.length]} #${i + 1}`,
      type: types[i % types.length],
      summary: `${types[i % types.length]} 진행 완료.`,
      status: i === 0 ? "in_progress" : "completed",
    });
  }
  return items;
}

function makeCourseHistory(classIds: string[]): CourseHistoryItem[] {
  return classIds.map((cid) => {
    const cls = MOCK_CLASSES.find((c) => c.id === cid);
    return {
      id: `course-${cid}`,
      className: cls?.name ?? "알 수 없음",
      period: "2026.03 ~ 진행중",
      status: "active" as const,
      instructor: cls?.instructor,
    };
  });
}

function makeGuardian(i: number): Guardian[] {
  const names = ["김영희", "이순자", "박미영", "최정숙", "정은주", "한미경", "윤수진", "조현숙"];
  return [
    {
      id: `g-${i}-1`,
      name: names[i % names.length],
      phone: `010-${String(1000 + i).slice(0, 4)}-${String(5000 + i * 3).slice(0, 4)}`,
      relation: "부모",
    },
  ];
}

function makeMemos(count: number): Memo[] {
  const texts = [
    "프로젝트 진행 속도 양호",
    "알고리즘 문제 풀이 추가 연습 필요",
    "팀 프로젝트에서 리더십 발휘",
    "출석률 관리 필요",
    "포트폴리오 완성도 높음",
  ];
  return Array.from({ length: count }, (_, i) => ({
    id: `m-${i}`,
    date: new Date(2026, 2, 28 - i * 5).toISOString().slice(0, 10),
    text: texts[i % texts.length],
    author: "멘토",
  }));
}

/* ── 학생 35명 생성 ── */
const NAMES = [
  "김민수", "이서윤", "박도현", "최지우", "정현우",
  "한소희", "강지훈", "윤채영", "임태우", "송민지",
  "오준서", "배수빈", "전하은", "홍성민", "류지아",
  "신동욱", "장예린", "고승현", "문서연", "서진우",
  "안유나", "권도윤", "황지민", "남수현", "조은서",
  "유승아", "김하린", "이도현", "박서진", "최유진",
  "정민재", "한지호", "강서윤", "임채원", "송예진",
];

const TAGS_POOL = ["성실", "리더", "신규", "우수", "멘토링필요", "취업준비", "포트폴리오우수", "야간반"];

function getStudentTags(i: number): string[] {
  const count = 1 + (i % 3);
  const tags: string[] = [];
  for (let j = 0; j < count; j++) {
    tags.push(TAGS_POOL[(i + j) % TAGS_POOL.length]);
  }
  return tags;
}

function getClassIds(i: number): string[] {
  if (i < 12) return ["c1"];
  if (i < 20) return ["c2"];
  if (i < 25) return ["c3"];
  if (i < 30) return ["c4"];
  if (i < 33) return ["c5"];
  return ["c6"];
}

function getStatus(i: number) {
  if (i < 25) return "enrolled" as const;
  if (i < 29) return "on_leave" as const;
  if (i < 32) return "graduated" as const;
  return "withdrawn" as const;
}

function getGrade(i: number): string {
  if (i < 12) return "1기";
  if (i < 20) return "2기";
  return "1기";
}

export const MOCK_STUDENTS: Student[] = NAMES.map((name, i) => {
  const id = `s${i + 1}`;
  const classIds = getClassIds(i);
  return {
    id,
    name,
    phone: `010-${String(2000 + i * 7).slice(0, 4)}-${String(3000 + i * 11).slice(0, 4)}`,
    email: `student${i + 1}@example.com`,
    school: MOCK_CLASSES.find((c) => c.id === classIds[0])?.subject ?? "",
    grade: getGrade(i),
    status: getStatus(i),
    registeredAt: new Date(2026, 1 + (i % 2), 1 + i).toISOString().slice(0, 10),
    tags: getStudentTags(i),
    classIds,
    guardians: makeGuardian(i),
    memos: makeMemos(1 + (i % 3)),
    counselingHistory: makeCounselingHistory(2 + (i % 5)),
    courseHistory: makeCourseHistory(classIds),
  };
});

/** 모든 태그 (고유값) */
export const ALL_TAGS = [...new Set(MOCK_STUDENTS.flatMap((s) => s.tags))];
