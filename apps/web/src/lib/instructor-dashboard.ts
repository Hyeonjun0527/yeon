import {
  instructorDashboardResponseSchema,
  type InstructorDashboardResponse,
} from "@yeon/api-contract";

const instructorDashboard = instructorDashboardResponseSchema.parse({
  generatedAt: "2026-04-07T09:00:00.000Z",
  headline:
    "수업 전 30분 안에 오늘 케어 학생과 다음 행동을 바로 정리하는 교강사 대시보드",
  summary:
    "라운드 1에서는 실제 DB보다 먼저, 교강사가 누구를 왜 먼저 챙겨야 하는지 설명 가능한 구조를 공용 계약과 mock source data로 고정합니다.",
  metrics: [
    {
      label: "오늘 바로 케어",
      value: "06명",
      description: "수업 전 체크인 또는 피드백이 오늘 필요한 학생",
    },
    {
      label: "후속 확인 대기",
      value: "09건",
      description: "이전 개입 뒤 재확인 일정이 남아 있는 항목",
    },
    {
      label: "반복 개념",
      value: "03개",
      description: "이번 주 여러 학생에게 공통으로 보인 막힘 포인트",
    },
    {
      label: "교강사 준비 시간",
      value: "30분",
      description: "라운드 1이 먼저 줄이려는 실제 업무 압박 구간",
    },
  ],
  segments: [
    {
      key: "needs-care",
      label: "즉시 케어",
      count: 6,
      description: "오늘 수업 전 바로 메시지 또는 체크인이 필요한 학생",
    },
    {
      key: "follow-up",
      label: "후속 확인",
      count: 9,
      description: "이미 개입했지만 다시 확인 일정이 남아 있는 학생",
    },
    {
      key: "watch",
      label: "관찰 유지",
      count: 14,
      description:
        "참여 저하 징후는 있으나 즉시 개입 전 맥락 확인이 필요한 학생",
    },
    {
      key: "stable",
      label: "안정",
      count: 27,
      description:
        "현재 흐름이 안정적이라 주간 리포트 수준에서만 확인하면 되는 학생",
    },
  ],
  priorityStudents: [
    {
      id: "student-01",
      name: "김하린",
      cohortName: "웹 풀스택 8기",
      riskLevel: "high",
      careSegment: "needs-care",
      riskSummary:
        "출석 하락과 데일리 과제 미제출이 이번 주 동시에 발생했습니다.",
      recentChange:
        "최근 4일 동안 질문 채널 반응이 없고, 실습 체크포인트가 2회 연속 비었습니다.",
      recommendedAction:
        "수업 전 체크인 메시지 발송 후, 오늘 실습 첫 20분 안에 짧은 1:1 확인을 예약합니다.",
      nextCheckLabel: "오늘 09:40까지",
      tags: ["참여 저하", "과제 지연", "질문 없음"],
    },
    {
      id: "student-02",
      name: "박준오",
      cohortName: "웹 풀스택 8기",
      riskLevel: "high",
      careSegment: "follow-up",
      riskSummary:
        "지난 상담 이후 보강 과제를 다시 미뤘고, 자신감 저하 메모가 추가되었습니다.",
      recentChange:
        "어제 보강 과제 재제출 약속을 지키지 못했고 상담 메모에 수면 부족 이슈가 기록됐습니다.",
      recommendedAction:
        "운영자 공유 메모를 남기고, 오늘 저녁 전까지 과제 범위를 절반으로 나눈 후속 계획을 제안합니다.",
      nextCheckLabel: "오늘 18:00 전",
      tags: ["상담 메모", "후속 확인", "보강 과제"],
    },
    {
      id: "student-03",
      name: "이서후",
      cohortName: "웹 풀스택 7기",
      riskLevel: "medium",
      careSegment: "needs-care",
      riskSummary:
        "실습 참여는 유지되지만 질문이 급감해 혼자 막히는 패턴이 보입니다.",
      recentChange:
        "최근 1주일간 코드 리뷰 요청이 0건이고, 라이브 질문 시간에 반복적으로 응답이 없습니다.",
      recommendedAction:
        "질문 유도형 피드백 초안을 먼저 보내고, 오늘 수업 중 짧은 확인 질문을 배치합니다.",
      nextCheckLabel: "오늘 14:20까지",
      tags: ["질문 없음", "조용한 이탈", "실습 막힘"],
    },
  ],
  careHistory: [
    {
      studentName: "정민서",
      actionLabel: "보강 과제 범위 재조정",
      outcome:
        "부담이 큰 과제를 작은 단위로 나누고 다음 제출 시점을 다시 잡았습니다.",
      recordedAtLabel: "어제 18:10 기록",
      nextCheckLabel: "오늘 오후 출석 확인",
    },
    {
      studentName: "오지훈",
      actionLabel: "질문 유도 메시지 발송",
      outcome:
        "무응답 상태에서 벗어나도록 구체 질문 3개를 보내고 회신을 기다리는 중입니다.",
      recordedAtLabel: "어제 20:30 기록",
      nextCheckLabel: "오늘 13:00 회신 확인",
    },
    {
      studentName: "한세라",
      actionLabel: "운영자 공유 메모 작성",
      outcome:
        "개인 사정으로 인한 학습 공백 가능성을 운영자와 공유하고 이번 주 추적 대상으로 올렸습니다.",
      recordedAtLabel: "오늘 08:40 기록",
      nextCheckLabel: null,
    },
  ],
  weeklyReport: {
    summary:
      "이번 주에는 배열 메서드 체이닝, 비동기 흐름 이해, CSS 레이아웃 복구에서 반복 막힘이 나타났습니다.",
    coachMemo:
      "숫자형 위험 점수보다 왜 지금 케어가 필요한지 문장으로 정리해 두면 교강사와 운영자가 같은 맥락으로 움직일 수 있습니다.",
    todayFocus: [
      "오늘 바로 케어 3명 우선 체크인",
      "어제 후속 확인 미처리 2건 정리",
      "반복 개념 복습용 미니 예제 준비",
    ],
    conceptFocuses: [
      {
        concept: "배열 메서드 체이닝",
        affectedStudentCount: 7,
        reason: "map/filter 조합 실수로 과제 제출 지연이 반복됐습니다.",
      },
      {
        concept: "비동기 흐름 이해",
        affectedStudentCount: 5,
        reason:
          "Promise 흐름을 설명하지 못해 실습 막힘과 질문 회피가 함께 나타났습니다.",
      },
      {
        concept: "CSS 레이아웃 복구",
        affectedStudentCount: 4,
        reason:
          "flex와 height 충돌로 과제 마감 직전 포기하는 사례가 이어졌습니다.",
      },
    ],
  },
});

export function getInstructorDashboard(): InstructorDashboardResponse {
  return instructorDashboard;
}
