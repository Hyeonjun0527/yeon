import {
  instructorDashboardResponseSchema,
  type InstructorDashboardResponse,
} from "@yeon/api-contract";

const instructorDashboard = instructorDashboardResponseSchema.parse({
  generatedAt: "2026-04-07T00:00:00.000Z",
  generatedLabel: "2026년 4월 7일 오전 9:00 기준",
  headline:
    "오늘 케어 학생 6명과 개입 대기 3건을 먼저 정리하고 수업을 시작하는 교강사 브리핑",
  summary:
    "라운드 3에서는 대시보드 상단 브리핑 아래에 우선순위 학생 큐를 두고, 위험 이유와 최근 변화, 다음 행동을 한 카드에서 바로 읽게 만듭니다.",
  briefing: {
    label: "오늘 아침 브리핑",
    headline: "먼저 3건을 처리하면 오전 수업 전 학생관리 흐름이 안정됩니다.",
    summary:
      "오늘 케어 학생 6명 중 긴급도 높은 3명만 먼저 닫아도 반 전체 리스크가 크게 줄어듭니다. 숫자는 상황을 요약하고, 브리핑은 지금 해야 할 행동을 바로 고정합니다.",
    actionItems: [
      "김하린에게 09:40 전 체크인 메시지를 보냅니다.",
      "박준오 보강 과제 범위를 절반으로 다시 제안합니다.",
      "B반 질문 침묵 학생 2명은 수업 중 먼저 호명합니다.",
    ],
    supportNote:
      "라운드 3 기준으로는 숫자만 보여주지 않고, 우선 학생 카드에서 순번과 다음 행동까지 바로 이어 보게 만듭니다.",
  },
  metrics: [
    {
      label: "오늘 케어 학생 수",
      value: "06명",
      description: "수업 전 체크인 또는 피드백이 오늘 바로 필요한 학생",
    },
    {
      label: "개입 대기",
      value: "03건",
      description: "메시지, 면담 제안, 보강 과제 안내를 바로 실행할 항목",
    },
    {
      label: "반복 개념",
      value: "03개",
      description: "오늘 수업 전에 다시 짚어야 할 공통 막힘 포인트",
    },
    {
      label: "오늘 액션",
      value: "03개",
      description: "첫 30분 안에 끝내야 하는 우선 행동 체크리스트",
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
      priorityOrder: 1,
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
      priorityOrder: 2,
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
      priorityOrder: 3,
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
  highlightedStudentDetail: {
    studentId: "student-01",
    statusHeadline:
      "출석 하락과 과제 지연, 질문 무응답이 겹쳐 오늘 수업 전에 가장 먼저 개입해야 하는 학생입니다.",
    aiInterpretation:
      "이번 주 신호는 단순 과제 미제출보다 학습 리듬 이탈에 가깝습니다. 출석과 실습 참여가 흔들린 직후 질문 채널 반응이 사라졌고, 그 다음날 데일리 과제가 비었습니다.",
    coachFocus:
      "학습 의지 확인보다 현재 막힌 지점을 좁혀 묻는 대화가 우선입니다. 첫 실습 20분 안에 체크인하고 과제 범위를 작게 나눠 재진입 장벽을 낮춰야 합니다.",
    timeline: [
      {
        id: "student-01-signal-01",
        type: "attendance",
        typeLabel: "출석",
        title: "월요일 체크인 12분 지각",
        summary:
          "지난 3주간 정시 입실하던 패턴에서 처음으로 지각이 발생했습니다.",
        occurredAtLabel: "04-04 오전 09:12",
      },
      {
        id: "student-01-signal-02",
        type: "question",
        typeLabel: "질문",
        title: "라이브 질문 시간 무응답",
        summary:
          "React 상태 업데이트 실습에서 막힌 것으로 보였지만 질문 채널과 수업 중 반응이 모두 없었습니다.",
        occurredAtLabel: "04-04 오후 14:30",
      },
      {
        id: "student-01-signal-03",
        type: "assignment",
        typeLabel: "과제",
        title: "데일리 과제 미제출",
        summary:
          "과제 마감 30분 전까지 제출이 없어 자동 리마인드가 발송됐습니다.",
        occurredAtLabel: "04-05 오후 23:30",
      },
      {
        id: "student-01-signal-04",
        type: "coaching-note",
        typeLabel: "상담 메모",
        title: "집중력 저하 가능성 메모 추가",
        summary:
          "조교가 실습 집중도 저하와 피로 호소를 상담 메모에 남겼습니다.",
        occurredAtLabel: "04-06 오후 17:10",
      },
    ],
  },
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
      "상단 KPI에서 숫자를 먼저 읽고, 바로 아래 행동 패널에서 오늘 실행 순서를 확인하면 교강사와 운영자가 같은 우선순위로 움직일 수 있습니다.",
    todayFocus: [
      "우선 학생 3명에게 체크인 또는 면담 제안 먼저 보내기",
      "어제 미처리 개입 2건을 수업 전까지 정리하기",
      "반복 개념 3개를 오늘 미니 예제로 다시 짚기",
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
