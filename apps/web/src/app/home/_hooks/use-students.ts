import { useState, useMemo } from "react";

export type Student = {
  id: string;
  name: string;
  initial: string;
  gradient: string;
  tags: { label: string; cls: string }[];
  grade: string;
  counseling: number;
  lastDate: string;
  memos: number;
  registeredAt: string;
  mainIssue: string;
  monthCounseling: number;
  history: CounselingRecord[];
};

export type CounselingRecord = {
  date: string;
  title: string;
  type: "대면" | "전화";
  status: "ready";
  summary: string;
};

const MOCK_STUDENTS: Student[] = [
  {
    id: "s1",
    name: "김민수",
    initial: "민",
    gradient: "linear-gradient(135deg, #60a5fa, #818cf8)",
    tags: [
      { label: "수학", cls: "tagMath" },
      { label: "영어", cls: "tagEng" },
    ],
    grade: "중2",
    counseling: 12,
    lastDate: "4.8",
    memos: 3,
    registeredAt: "2026.03",
    mainIssue: "과제 관리",
    monthCounseling: 3,
    history: [
      { date: "2026.04.08", title: "수학 과제 누락 상담", type: "대면", status: "ready", summary: "학원 일정으로 과제 시간 부족, 제출 기한 조정 합의" },
      { date: "2026.04.05", title: "월간 학습 점검", type: "대면", status: "ready", summary: "수학 중간고사 대비 계획 수립, 주 3회 자습 권장" },
      { date: "2026.03.28", title: "보호자 통화", type: "전화", status: "ready", summary: "학원-집 학습 연계 방안 논의, 부모 협조 요청" },
      { date: "2026.03.20", title: "수업 태도 점검", type: "대면", status: "ready", summary: "집중력 저하 원인 파악, 자리 배치 변경" },
    ],
  },
  {
    id: "s2",
    name: "이서윤",
    initial: "서",
    gradient: "linear-gradient(135deg, #34d399, #22d3ee)",
    tags: [
      { label: "국어", cls: "tagKor" },
      { label: "영어", cls: "tagEng" },
    ],
    grade: "중3",
    counseling: 8,
    lastDate: "4.7",
    memos: 1,
    registeredAt: "2025.09",
    mainIssue: "진로 탐색",
    monthCounseling: 2,
    history: [
      { date: "2026.04.07", title: "진로 상담", type: "대면", status: "ready", summary: "고등학교 진학 방향 논의, 관심 분야 정리" },
      { date: "2026.04.01", title: "독서 습관 점검", type: "대면", status: "ready", summary: "월 독서량 목표 설정, 독서록 작성 권장" },
    ],
  },
  {
    id: "s3",
    name: "박도현",
    initial: "도",
    gradient: "linear-gradient(135deg, #fbbf24, #fb923c)",
    tags: [
      { label: "수학", cls: "tagMath" },
      { label: "과학", cls: "tagSci" },
    ],
    grade: "중1",
    counseling: 5,
    lastDate: "4.6",
    memos: 0,
    registeredAt: "2026.03",
    mainIssue: "학습 습관",
    monthCounseling: 2,
    history: [
      { date: "2026.04.06", title: "학습 계획 수립", type: "대면", status: "ready", summary: "주간 학습 계획표 작성, 자기주도 학습 시간 확보" },
      { date: "2026.03.25", title: "적응 상담", type: "대면", status: "ready", summary: "중학교 적응 상태 점검, 교우 관계 양호" },
    ],
  },
  {
    id: "s4",
    name: "최지우",
    initial: "지",
    gradient: "linear-gradient(135deg, #fb7185, #c084fc)",
    tags: [{ label: "영어", cls: "tagEng" }],
    grade: "고1",
    counseling: 3,
    lastDate: "4.5",
    memos: 2,
    registeredAt: "2026.02",
    mainIssue: "영어 성적",
    monthCounseling: 1,
    history: [
      { date: "2026.04.05", title: "영어 성적 분석", type: "대면", status: "ready", summary: "모의고사 성적 분석, 취약 영역 문법·어휘로 확인" },
    ],
  },
  {
    id: "s5",
    name: "정현우",
    initial: "현",
    gradient: "linear-gradient(135deg, #818cf8, #60a5fa)",
    tags: [
      { label: "수학", cls: "tagMath" },
      { label: "국어", cls: "tagKor" },
    ],
    grade: "중2",
    counseling: 7,
    lastDate: "4.6",
    memos: 1,
    registeredAt: "2025.11",
    mainIssue: "수업 집중",
    monthCounseling: 2,
    history: [
      { date: "2026.04.06", title: "수업 참여도 점검", type: "대면", status: "ready", summary: "수업 중 딴짓 빈도 감소, 발표 참여 증가" },
      { date: "2026.03.30", title: "보호자 면담", type: "대면", status: "ready", summary: "가정 학습 환경 개선 논의, 스마트폰 사용 시간 조절" },
    ],
  },
  {
    id: "s6",
    name: "한소희",
    initial: "소",
    gradient: "linear-gradient(135deg, #22d3ee, #818cf8)",
    tags: [
      { label: "영어", cls: "tagEng" },
      { label: "과학", cls: "tagSci" },
    ],
    grade: "중3",
    counseling: 10,
    lastDate: "4.7",
    memos: 4,
    registeredAt: "2025.06",
    mainIssue: "시험 불안",
    monthCounseling: 3,
    history: [
      { date: "2026.04.07", title: "시험 불안 상담", type: "대면", status: "ready", summary: "중간고사 앞두고 불안 증상 호소, 호흡법·시간 분배 전략 안내" },
      { date: "2026.04.03", title: "과학 실험 보고서 피드백", type: "대면", status: "ready", summary: "실험 보고서 작성법 지도, 결과 해석 보완" },
      { date: "2026.03.27", title: "보호자 전화 상담", type: "전화", status: "ready", summary: "시험 기간 스트레스 관리 방안 공유" },
    ],
  },
];

export function useStudents() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return MOCK_STUDENTS;
    return MOCK_STUDENTS.filter((s) => s.name.includes(search.trim()));
  }, [search]);

  const selected = useMemo(
    () => MOCK_STUDENTS.find((s) => s.id === selectedId) ?? null,
    [selectedId],
  );

  const selectStudent = (id: string) => setSelectedId(id);
  const clearSelection = () => setSelectedId(null);

  return {
    students: filtered,
    totalCount: MOCK_STUDENTS.length,
    selected,
    selectedId,
    search,
    setSearch,
    selectStudent,
    clearSelection,
  };
}
