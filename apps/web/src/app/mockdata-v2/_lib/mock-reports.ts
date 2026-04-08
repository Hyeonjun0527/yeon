/* ── 수강생 리포트 목데이터 ── */

export type ReportTemplate = "regular" | "special" | "counseling-result";
export type ReportStatus = "draft" | "sent";

export interface ReportSection {
  title: string;
  content: string;
}

export interface ParentReport {
  id: string;
  studentId: string;
  studentName: string;
  template: ReportTemplate;
  status: ReportStatus;
  createdAt: string;
  sections: ReportSection[];
}

export const REPORT_TEMPLATES = [
  { value: "regular" as const, label: "정기 리포트", desc: "주간/월간 학습 진행 보고서" },
  { value: "special" as const, label: "특별 알림", desc: "진도 지연, 출석 이슈 등 긴급 알림" },
  { value: "counseling-result" as const, label: "멘토링 결과", desc: "1:1 멘토링 결과 공유" },
] as const;

export const MOCK_REPORTS: ParentReport[] = [
  {
    id: "rpt1",
    studentId: "kim",
    studentName: "김도윤",
    template: "regular",
    status: "sent",
    createdAt: "2026.04.08",
    sections: [
      {
        title: "멘토링 요약",
        content:
          "4월 한 달간 총 3회 멘토링을 진행했습니다. 팀 프로젝트 백엔드 API 설계 지연이 주요 이슈였으며, MVP 우선 접근 전략으로 전환하여 과제 완수율이 60%에서 80%로 개선되었습니다.",
      },
      {
        title: "학습 진행 상황",
        content:
          "백엔드(Django/Python): API 설계 역량 성장 중, 인증 구현 경험 확보\nGit 협업: 브랜치 전략·PR 리뷰 프로세스 이해도 크게 향상\n팀 프로젝트: MVP 스코프 재조정 완료, 금요일 중간 점검 예정",
      },
      {
        title: "주의 사항",
        content:
          "설계 단계에서 과도한 시간을 소요하는 경향이 있습니다. '완벽한 설계보다 동작하는 코드 먼저' 원칙을 반복 코칭 중입니다. 팀 프로젝트 데드라인 관리가 필요합니다.",
      },
      {
        title: "다음 단계",
        content:
          "1. 이번 주 금요일 API 3개 구현 완료 점검\n2. 다음 주 프론트엔드 연동 시작\n3. 주간 코드 리뷰 참여 유지\n4. 커리어 방향(백엔드 집중) 맞춤 포트폴리오 준비 시작",
      },
    ],
  },
  {
    id: "rpt2",
    studentId: "lee",
    studentName: "이하은",
    template: "counseling-result",
    status: "draft",
    createdAt: "2026.04.07",
    sections: [
      {
        title: "멘토링 요약",
        content:
          "취업 준비와 학습 병행에 대한 시간 배분 고민이 주요 주제였습니다. 이력서 초안을 검토하고 프로젝트 경험 위주로 재구성하기로 했습니다.",
      },
      {
        title: "학습 진행 상황",
        content:
          "프론트엔드(React): 컴포넌트 설계 역량 양호, 상태 관리 심화 학습 진행 중\n포트폴리오: 개인 사이트 구축 계획 수립, 2주 내 배포 목표",
      },
      {
        title: "주의 사항",
        content:
          "React 심화 과정 진입 전 자신감이 저하된 상태입니다. 작은 성취를 자주 경험할 수 있는 단기 목표 설정이 효과적입니다.",
      },
      {
        title: "다음 단계",
        content:
          "1. 이력서 프로젝트 경험 섹션 재작성 (이번 주)\n2. 포트폴리오 사이트 Next.js로 구축 시작\n3. 주 1회 모의 면접 참여\n4. React 심화 과제 단계별 분리 진행",
      },
    ],
  },
  {
    id: "rpt3",
    studentId: "jung",
    studentName: "정우진",
    template: "special",
    status: "draft",
    createdAt: "2026.04.06",
    sections: [
      {
        title: "멘토링 요약",
        content:
          "파트타임 근무 병행으로 학습 시간이 절대적으로 부족한 상황입니다. 주간 학습 플랜을 재설계하고 핵심 과제 우선순위를 정리했습니다.",
      },
      {
        title: "학습 진행 상황",
        content:
          "백엔드(Java/Spring): 기초 개념 이해 양호하나 과제 제출 지연 빈번\n프로젝트 참여: 팀 기여도 부족, 코드 리뷰 참석률 저조",
      },
      {
        title: "주의 사항",
        content:
          "과제 미제출이 3회 연속 발생했습니다. 파트타임 일정과 학습 시간의 충돌이 해결되지 않으면 커리큘럼 진행에 차질이 우려됩니다.",
      },
      {
        title: "다음 단계",
        content:
          "1. 파트타임 근무일 기준 주간 학습 플랜 재조정\n2. 핵심 과제만 우선 제출하는 전략으로 전환\n3. 주 1회 진도 점검 멘토링 유지\n4. 필요 시 수강 기간 연장 옵션 안내",
      },
    ],
  },
];

/** AI 리포트 생성 시뮬레이션용 기본 섹션 */
export function generateMockReportSections(
  studentName: string,
  template: ReportTemplate,
): ReportSection[] {
  const base: ReportSection[] = [
    {
      title: "멘토링 요약",
      content: `${studentName} 수강생의 최근 멘토링 내용을 종합한 요약입니다. AI가 상담 기록을 분석하여 자동 생성한 초안이며, 발송 전 검토·수정이 가능합니다.`,
    },
    {
      title: "학습 진행 상황",
      content: "멘토링 기록을 기반으로 트랙별 진행 상황을 정리합니다. 충분한 멘토링 데이터가 쌓이면 더 정확한 분석이 가능합니다.",
    },
    {
      title: "주의 사항",
      content: "현재까지의 멘토링 기록에서 발견된 주의가 필요한 부분입니다.",
    },
    {
      title: "다음 단계",
      content: "멘토링 내용을 바탕으로 다음 단계 학습 방향을 안내합니다.",
    },
  ];

  if (template === "special") {
    base.unshift({
      title: "긴급 안내",
      content: `${studentName} 수강생과 관련하여 즉시 공유드릴 사항이 있습니다.`,
    });
  }

  return base;
}
