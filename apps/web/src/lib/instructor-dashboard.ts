import {
  instructorDashboardResponseSchema,
  type InstructorDashboardResponse,
  type InstructorDashboardScope,
  type InstructorDashboardScopeOption,
} from "@yeon/api-contract";

const instructorDashboardCohortIds = {
  webFullstack7: "web-fullstack-7",
  webFullstack8: "web-fullstack-8",
} as const;

const instructorDashboardWeekIds = {
  week05: "week-05",
  week06: "week-06",
  week07: "week-07",
} as const;

type InstructorDashboardCohortId =
  (typeof instructorDashboardCohortIds)[keyof typeof instructorDashboardCohortIds];
type InstructorDashboardWeekId =
  (typeof instructorDashboardWeekIds)[keyof typeof instructorDashboardWeekIds];
type DashboardFixture = Omit<InstructorDashboardResponse, "scope">;

export type GetInstructorDashboardParams = {
  cohortId?: string;
  weekId?: string;
};

const defaultCohortId = instructorDashboardCohortIds.webFullstack8;
const defaultWeekId = instructorDashboardWeekIds.week06;

const instructorDashboardCohorts: readonly InstructorDashboardScopeOption[] = [
  {
    id: instructorDashboardCohortIds.webFullstack8,
    label: "웹 풀스택 8기",
    meta: "28명 운영중",
    description: "프로젝트 제출 직전이라 과제와 질문 신호 변동이 큰 반입니다.",
  },
  {
    id: instructorDashboardCohortIds.webFullstack7,
    label: "웹 풀스택 7기",
    meta: "24명 운영중",
    description: "복습 주간이라 조용한 이탈과 후속 확인이 함께 나오는 반입니다.",
  },
];

const instructorDashboardWeeks: readonly InstructorDashboardScopeOption[] = [
  {
    id: instructorDashboardWeekIds.week05,
    label: "5주차",
    meta: "03.31 - 04.06",
    description: "배열 메서드와 상태 업데이트가 처음 겹치기 시작하는 구간입니다.",
  },
  {
    id: instructorDashboardWeekIds.week06,
    label: "6주차",
    meta: "04.07 - 04.13",
    description: "비동기 흐름과 팀 프로젝트가 겹쳐 개입 우선순위가 갈리는 주간입니다.",
  },
  {
    id: instructorDashboardWeekIds.week07,
    label: "7주차",
    meta: "04.14 - 04.20",
    description: "라우팅 복구와 배포 이슈로 질문과 상담 메모가 함께 늘어나는 주간입니다.",
  },
];

function buildMetrics(
  careStudentCount: number,
  pendingActionCount: number,
  repeatedConceptCount: number,
  todayActionCount: number,
) {
  return [
    {
      label: "오늘 케어 학생 수",
      value: `${String(careStudentCount).padStart(2, "0")}명`,
      description: "수업 전 체크인 또는 피드백이 오늘 바로 필요한 학생",
    },
    {
      label: "개입 대기",
      value: `${String(pendingActionCount).padStart(2, "0")}건`,
      description: "메시지, 면담 제안, 보강 과제 안내를 바로 실행할 항목",
    },
    {
      label: "반복 개념",
      value: `${String(repeatedConceptCount).padStart(2, "0")}개`,
      description: "오늘 수업 전에 다시 짚어야 할 공통 막힘 포인트",
    },
    {
      label: "오늘 액션",
      value: `${String(todayActionCount).padStart(2, "0")}개`,
      description: "첫 30분 안에 끝내야 하는 우선 행동 체크리스트",
    },
  ] satisfies DashboardFixture["metrics"];
}

function buildSegments(
  needsCare: number,
  followUp: number,
  watch: number,
  stable: number,
) {
  return [
    {
      key: "needs-care",
      label: "즉시 케어",
      count: needsCare,
      description: "오늘 수업 전 바로 메시지 또는 체크인이 필요한 학생",
    },
    {
      key: "follow-up",
      label: "후속 확인",
      count: followUp,
      description: "이미 개입했지만 다시 확인 일정이 남아 있는 학생",
    },
    {
      key: "watch",
      label: "관찰 유지",
      count: watch,
      description: "참여 저하 징후는 있으나 먼저 맥락 확인이 필요한 학생",
    },
    {
      key: "stable",
      label: "안정",
      count: stable,
      description: "현재 흐름이 안정적이라 주간 리포트 수준에서 확인하면 되는 학생",
    },
  ] satisfies DashboardFixture["segments"];
}

function resolveOptionId<Option extends { id: string }>(
  options: readonly Option[],
  requestedId: string | undefined,
  fallbackId: Option["id"],
) {
  return options.some((option) => option.id === requestedId)
    ? (requestedId as Option["id"])
    : fallbackId;
}

function getScopeOption(
  options: readonly InstructorDashboardScopeOption[],
  id: string,
) {
  const option = options.find((entry) => entry.id === id);

  if (!option) {
    throw new Error(`학생관리 컨텍스트 옵션을 찾을 수 없습니다: ${id}`);
  }

  return option;
}

function buildScope(
  selectedCohortId: InstructorDashboardCohortId,
  selectedWeekId: InstructorDashboardWeekId,
): InstructorDashboardScope {
  const cohort = getScopeOption(instructorDashboardCohorts, selectedCohortId);
  const week = getScopeOption(instructorDashboardWeeks, selectedWeekId);

  return {
    selectedCohortId,
    selectedWeekId,
    cohortLabel: cohort.label,
    weekLabel: week.label,
    weekDateRangeLabel: week.meta,
    contextSummary: `${cohort.description} ${week.description}`,
    cohorts: instructorDashboardCohorts,
    weeks: instructorDashboardWeeks,
  };
}

const instructorDashboardFixtures: Record<
  InstructorDashboardCohortId,
  Record<InstructorDashboardWeekId, DashboardFixture>
> = {
  [instructorDashboardCohortIds.webFullstack8]: {
    [instructorDashboardWeekIds.week05]: {
      generatedAt: "2026-04-07T00:00:00.000Z",
      generatedLabel: "2026년 4월 7일 오전 9:00 기준 · 웹 풀스택 8기 5주차",
      headline:
        "웹 풀스택 8기 5주차는 배열 체이닝과 상태 업데이트 막힘이 겹쳐 체크인 2건을 먼저 닫아야 합니다.",
      summary:
        "5주차에서는 기초 문법에서 막힌 학생을 먼저 끌어올려야 팀 프로젝트 전환 구간의 이탈을 줄일 수 있습니다.",
      briefing: {
        label: "5주차 아침 브리핑",
        headline:
          "기초 실습에서 멈춘 2명을 먼저 끌어올리면 오늘 오전 실습 흐름이 안정됩니다.",
        summary:
          "웹 풀스택 8기는 배열 메서드와 상태 업데이트 개념이 처음 겹칩니다. 질문이 사라진 학생을 먼저 체크인하면 오후 팀 실습 전반의 막힘도 함께 줄어듭니다.",
        actionItems: [
          "김하린에게 배열 메서드 체이닝 미션을 15분 버전으로 다시 제안합니다.",
          "박준오 상담 메모에 남은 수면 이슈를 운영팀과 공유합니다.",
          "최서윤에게 setState 실습 복구 영상을 수업 전 다시 전달합니다.",
        ],
        supportNote:
          "라운드 17부터는 같은 대시보드라도 코호트와 주차를 바꾸면 브리핑과 큐가 함께 바뀌게 합니다.",
      },
      metrics: buildMetrics(5, 2, 2, 3),
      segments: buildSegments(5, 7, 9, 7),
      priorityStudents: [
        {
          priorityOrder: 1,
          id: "w8-week05-student-01",
          name: "김하린",
          cohortName: "웹 풀스택 8기",
          riskLevel: "high",
          careSegment: "needs-care",
          riskSummary:
            "배열 메서드 체이닝 과제를 두 번 연속 비우고 질문 채널 반응도 끊겼습니다.",
          recentChange:
            "지난 3일 동안 map/filter 조합 실수 후 재시도 흔적이 사라졌고, 오전 체크인도 늦어졌습니다.",
          recommendedAction:
            "오늘 첫 실습 전 15분 복구 과제를 다시 제안하고, 실패 지점을 한 문장으로 말하게 돕습니다.",
          nextCheckLabel: "오늘 09:35까지",
          tags: ["배열 메서드", "질문 감소", "실습 이탈"],
        },
        {
          priorityOrder: 2,
          id: "w8-week05-student-02",
          name: "박준오",
          cohortName: "웹 풀스택 8기",
          riskLevel: "high",
          careSegment: "follow-up",
          riskSummary:
            "상담 이후 다시 과제 제출이 끊겼고 수면 부족 메모가 반복됐습니다.",
          recentChange:
            "어제 저녁 보강 과제를 시작하지 못했고, 아침 출석 체크도 마지막에 들어왔습니다.",
          recommendedAction:
            "과제 범위를 절반으로 나누고 오늘 저녁 전 다시 제출 기준을 합의합니다.",
          nextCheckLabel: "오늘 18:00 전",
          tags: ["상담 메모", "후속 확인", "과제 지연"],
        },
        {
          priorityOrder: 3,
          id: "w8-week05-student-03",
          name: "최서윤",
          cohortName: "웹 풀스택 8기",
          riskLevel: "medium",
          careSegment: "watch",
          riskSummary:
            "상태 업데이트 실습 중에만 제출 속도가 급격히 느려지는 패턴이 보입니다.",
          recentChange:
            "코드 리뷰는 남기지만 setState 실습 캡처가 비어 있고, 질문은 DM으로만 짧게 옵니다.",
          recommendedAction:
            "수업 시작 전 상태 업데이트 예제를 하나 더 주고, 오후에 다시 제출 시간을 확인합니다.",
          nextCheckLabel: "오늘 14:10까지",
          tags: ["상태 업데이트", "제출 지연", "조용한 이탈"],
        },
      ],
      highlightedStudentDetail: {
        studentId: "w8-week05-student-01",
        statusHeadline:
          "배열 메서드 체이닝에서 막힌 뒤 질문과 재시도 흔적이 동시에 사라져 오늘 가장 먼저 복구해야 하는 학생입니다.",
        aiInterpretation:
          "이번 신호는 단순 실수보다 실패 회피에 가깝습니다. map과 filter를 함께 쓰는 과제에서 첫 막힘이 생긴 뒤 질문 채널과 실습 기록이 모두 줄었습니다.",
        coachFocus:
          "정답 설명보다 막힌 지점을 직접 말하게 하는 짧은 체크인이 우선입니다. 15분짜리 복구 미션으로 다시 진입 장벽을 낮춰야 합니다.",
        timeline: [
          {
            id: "w8-week05-student-01-signal-01",
            type: "assignment",
            typeLabel: "과제",
            title: "배열 체이닝 과제 1차 미제출",
            summary:
              "map/filter 조합 예제에서 제출 기록이 비어 자동 리마인드가 발송됐습니다.",
            occurredAtLabel: "04-03 오후 23:10",
          },
          {
            id: "w8-week05-student-01-signal-02",
            type: "question",
            typeLabel: "질문",
            title: "질문 채널 반응 중단",
            summary:
              "이전까지 남기던 짧은 질문도 사라져 스스로 포기하는 흐름으로 보였습니다.",
            occurredAtLabel: "04-04 오전 11:20",
          },
          {
            id: "w8-week05-student-01-signal-03",
            type: "attendance",
            typeLabel: "출석",
            title: "오전 체크인 8분 지연",
            summary:
              "첫 실습 전 들어오던 체크인이 늦어지며 학습 리듬 이탈 신호가 함께 나타났습니다.",
            occurredAtLabel: "04-05 오전 09:08",
          },
          {
            id: "w8-week05-student-01-signal-04",
            type: "coaching-note",
            typeLabel: "상담 메모",
            title: "실패 후 재시도 회피 메모",
            summary:
              "조교가 한 번 막힌 뒤 재시도 시간을 미루는 패턴을 상담 메모에 남겼습니다.",
            occurredAtLabel: "04-06 오후 17:00",
          },
        ],
      },
      careHistory: [
        {
          studentName: "정민서",
          actionLabel: "배열 체이닝 보강 과제 분할",
          outcome:
            "한 번에 끝내지 못하던 과제를 2단계로 나누고, 첫 제출 시점까지 다시 합의했습니다.",
          recordedAtLabel: "어제 18:00 기록",
          nextCheckLabel: "오늘 오전 실습 확인",
        },
        {
          studentName: "오지훈",
          actionLabel: "질문 템플릿 전달",
          outcome:
            "질문을 못 남기던 학생에게 에러 로그 작성 템플릿을 주고 첫 회신을 받았습니다.",
          recordedAtLabel: "어제 20:10 기록",
          nextCheckLabel: "오늘 13:00 회신 확인",
        },
        {
          studentName: "한세라",
          actionLabel: "운영팀 공유 메모 등록",
          outcome:
            "개인 일정으로 인한 제출 공백 가능성을 운영팀과 공유해 추적 대상으로 올렸습니다.",
          recordedAtLabel: "오늘 08:35 기록",
          nextCheckLabel: null,
        },
      ],
      weeklyReport: {
        summary:
          "5주차에는 배열 메서드 체이닝과 상태 업데이트 입문 구간에서 질문 감소가 동시에 나타났습니다.",
        coachMemo:
          "기초 개념 막힘을 빨리 복구해야 다음 주 팀 프로젝트 전환이 부드럽게 이어집니다.",
        todayFocus: [
          "질문이 끊긴 학생 2명에게 오전 체크인 먼저 보내기",
          "배열 체이닝 복구 미션을 15분 버전으로 재배포하기",
          "상태 업데이트 예제를 다시 설명할 미니 데모 준비하기",
        ],
        conceptFocuses: [
          {
            concept: "배열 메서드 체이닝",
            affectedStudentCount: 6,
            reason: "map과 filter를 함께 쓰는 과제에서 제출 포기가 반복됐습니다.",
          },
          {
            concept: "React 상태 업데이트",
            affectedStudentCount: 4,
            reason: "setState 동작을 이해하지 못해 실습 중 멈추는 사례가 늘었습니다.",
          },
        ],
      },
    },
    [instructorDashboardWeekIds.week06]: {
      generatedAt: "2026-04-07T00:00:00.000Z",
      generatedLabel: "2026년 4월 7일 오전 9:00 기준 · 웹 풀스택 8기 6주차",
      headline:
        "웹 풀스택 8기 6주차는 팀 프로젝트 진입과 비동기 흐름 실습이 겹쳐 오늘 3건의 개입을 먼저 닫아야 합니다.",
      summary:
        "6주차에서는 비동기 흐름 이해와 팀 과제 분업이 동시에 흔들리기 시작합니다. 오늘 우선 학생 3명만 먼저 닫아도 반 전체 리스크가 크게 줄어듭니다.",
      briefing: {
        label: "6주차 아침 브리핑",
        headline:
          "먼저 3건을 처리하면 오전 수업 전 학생관리 흐름이 안정됩니다.",
        summary:
          "팀 프로젝트가 시작되면서 질문량은 늘지만, 실제로는 막힌 학생과 조용히 빠지는 학생이 동시에 생깁니다. 개입 우선순위를 한 화면에서 맞추는 것이 핵심입니다.",
        actionItems: [
          "김하린에게 09:40 전 체크인 메시지를 보냅니다.",
          "박준오 보강 과제 범위를 절반으로 다시 제안합니다.",
          "최서윤 팀 프로젝트 역할 분담 메모를 수업 전 확인합니다.",
        ],
        supportNote:
          "코호트와 주차를 바꾸면 같은 학생관리 화면에서도 브리핑과 우선 학생 큐가 함께 바뀌어야 합니다.",
      },
      metrics: buildMetrics(6, 3, 3, 3),
      segments: buildSegments(6, 9, 8, 5),
      priorityStudents: [
        {
          priorityOrder: 1,
          id: "w8-week06-student-01",
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
          id: "w8-week06-student-02",
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
          id: "w8-week06-student-03",
          name: "최서윤",
          cohortName: "웹 풀스택 8기",
          riskLevel: "medium",
          careSegment: "needs-care",
          riskSummary:
            "팀 프로젝트 역할을 맡은 뒤 질문은 늘었지만 비동기 API 연결에서 반복적으로 멈춥니다.",
          recentChange:
            "fetch 응답 처리 실습에서 2회 연속 미완료 기록이 남았고, 팀 채널에는 역할 부담 메모가 올라왔습니다.",
          recommendedAction:
            "API 응답 파싱 예제를 먼저 같이 복구하고, 오늘 안에 팀 역할 범위를 다시 좁혀줍니다.",
          nextCheckLabel: "오늘 15:20까지",
          tags: ["비동기 흐름", "팀 프로젝트", "역할 부담"],
        },
      ],
      highlightedStudentDetail: {
        studentId: "w8-week06-student-01",
        statusHeadline:
          "출석 하락과 과제 지연, 질문 무응답이 겹쳐 오늘 수업 전에 가장 먼저 개입해야 하는 학생입니다.",
        aiInterpretation:
          "이번 주 신호는 단순 과제 미제출보다 학습 리듬 이탈에 가깝습니다. 출석과 실습 참여가 흔들린 직후 질문 채널 반응이 사라졌고, 그 다음날 데일리 과제가 비었습니다.",
        coachFocus:
          "학습 의지 확인보다 현재 막힌 지점을 좁혀 묻는 대화가 우선입니다. 첫 실습 20분 안에 체크인하고 과제 범위를 작게 나눠 재진입 장벽을 낮춰야 합니다.",
        timeline: [
          {
            id: "w8-week06-student-01-signal-01",
            type: "attendance",
            typeLabel: "출석",
            title: "월요일 체크인 12분 지각",
            summary:
              "지난 3주간 정시 입실하던 패턴에서 처음으로 지각이 발생했습니다.",
            occurredAtLabel: "04-07 오전 09:12",
          },
          {
            id: "w8-week06-student-01-signal-02",
            type: "question",
            typeLabel: "질문",
            title: "라이브 질문 시간 무응답",
            summary:
              "비동기 상태 업데이트 실습에서 막힌 것으로 보였지만 질문 채널과 수업 중 반응이 모두 없었습니다.",
            occurredAtLabel: "04-07 오후 14:30",
          },
          {
            id: "w8-week06-student-01-signal-03",
            type: "assignment",
            typeLabel: "과제",
            title: "데일리 과제 미제출",
            summary:
              "과제 마감 30분 전까지 제출이 없어 자동 리마인드가 발송됐습니다.",
            occurredAtLabel: "04-08 오후 23:30",
          },
          {
            id: "w8-week06-student-01-signal-04",
            type: "coaching-note",
            typeLabel: "상담 메모",
            title: "집중력 저하 가능성 메모 추가",
            summary:
              "조교가 실습 집중도 저하와 피로 호소를 상담 메모에 남겼습니다.",
            occurredAtLabel: "04-09 오후 17:10",
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
          "6주차에는 비동기 흐름 이해, 팀 프로젝트 역할 분담, CSS 레이아웃 복구에서 반복 막힘이 나타났습니다.",
        coachMemo:
          "코호트와 주차가 바뀌면 반복 개념과 오늘 액션도 같이 바뀌어야 교강사와 운영자가 같은 우선순위로 움직일 수 있습니다.",
        todayFocus: [
          "우선 학생 3명에게 체크인 또는 면담 제안 먼저 보내기",
          "어제 미처리 개입 3건을 수업 전까지 정리하기",
          "비동기 흐름과 CSS 복구 예제를 오늘 미니 데모로 다시 짚기",
        ],
        conceptFocuses: [
          {
            concept: "비동기 흐름 이해",
            affectedStudentCount: 6,
            reason:
              "Promise 처리 순서를 설명하지 못해 실습 막힘과 질문 회피가 함께 나타났습니다.",
          },
          {
            concept: "팀 프로젝트 역할 분담",
            affectedStudentCount: 5,
            reason:
              "역할 범위를 좁히지 못해 과제 시작 자체를 미루는 사례가 늘었습니다.",
          },
          {
            concept: "CSS 레이아웃 복구",
            affectedStudentCount: 4,
            reason:
              "flex와 height 충돌로 마지막 제출 직전 포기하는 사례가 이어졌습니다.",
          },
        ],
      },
    },
    [instructorDashboardWeekIds.week07]: {
      generatedAt: "2026-04-07T00:00:00.000Z",
      generatedLabel: "2026년 4월 7일 오전 9:00 기준 · 웹 풀스택 8기 7주차",
      headline:
        "웹 풀스택 8기 7주차는 라우팅 복구와 배포 이슈가 겹쳐 상담 메모 기반 개입이 더 중요해집니다.",
      summary:
        "7주차에서는 기술 막힘보다 심리적 압박과 제출 회피가 함께 커지므로, 질문이 아니라 상담 메모까지 같이 봐야 합니다.",
      briefing: {
        label: "7주차 아침 브리핑",
        headline:
          "배포 실패 뒤 멈춘 학생 2명을 먼저 복구하면 팀 전체 일정 지연을 막을 수 있습니다.",
        summary:
          "이번 주는 Next.js 라우팅 복구와 배포 절차가 겹쳐 질문량보다 상담 메모와 체크인 지연이 더 강한 신호로 작동합니다.",
        actionItems: [
          "김하린에게 배포 실패 로그를 같이 읽는 10분 체크인을 잡습니다.",
          "최서윤 팀 프로젝트 역할을 프론트엔드 범위로 다시 좁혀 제안합니다.",
          "민우재에게 상담 메모 기반으로 오늘 제출 최소 기준을 합의합니다.",
        ],
        supportNote:
          "주차 컨텍스트가 바뀌면 같은 코호트라도 브리핑과 반복 개념 우선순위가 달라집니다.",
      },
      metrics: buildMetrics(7, 4, 3, 4),
      segments: buildSegments(7, 8, 8, 5),
      priorityStudents: [
        {
          priorityOrder: 1,
          id: "w8-week07-student-01",
          name: "김하린",
          cohortName: "웹 풀스택 8기",
          riskLevel: "high",
          careSegment: "needs-care",
          riskSummary:
            "배포 실패 이후 제출과 질문이 모두 멈췄고, 오전 체크인까지 늦어졌습니다.",
          recentChange:
            "vercel 배포 로그를 읽지 못한 뒤 팀 채널 반응이 줄었고, 어제 데일리 회고도 비었습니다.",
          recommendedAction:
            "배포 로그를 같이 읽어주고, 오늘은 제출 최소 기준만 맞추는 방식으로 부담을 낮춥니다.",
          nextCheckLabel: "오늘 10:00 전",
          tags: ["배포 실패", "질문 중단", "체크인 지연"],
        },
        {
          priorityOrder: 2,
          id: "w8-week07-student-02",
          name: "최서윤",
          cohortName: "웹 풀스택 8기",
          riskLevel: "high",
          careSegment: "follow-up",
          riskSummary:
            "팀 역할이 넓어지며 API와 UI를 동시에 맡아 복구 속도가 급격히 떨어졌습니다.",
          recentChange:
            "어제 라우팅 버그 수정 후 배포까지 가지 못했고, 팀 회의 메모에 역할 부담이 다시 남았습니다.",
          recommendedAction:
            "오늘 안에 프론트엔드 범위만 먼저 마치도록 역할을 다시 좁혀 합의합니다.",
          nextCheckLabel: "오늘 16:00 전",
          tags: ["팀 역할 과부하", "라우팅 버그", "후속 확인"],
        },
        {
          priorityOrder: 3,
          id: "w8-week07-student-03",
          name: "민우재",
          cohortName: "웹 풀스택 8기",
          riskLevel: "medium",
          careSegment: "needs-care",
          riskSummary:
            "상담 메모상 자신감 저하가 커졌고, 제출 최소 기준도 스스로 높게 잡고 있습니다.",
          recentChange:
            "조교와의 짧은 대화에서 배포 오류를 모두 해결해야만 제출할 수 있다고 말했습니다.",
          recommendedAction:
            "오늘은 최소 기준 제출만 먼저 하게 하고, 오류 복구는 오후 후속 시간으로 분리합니다.",
          nextCheckLabel: "오늘 17:20까지",
          tags: ["상담 메모", "완벽주의", "제출 회피"],
        },
      ],
      highlightedStudentDetail: {
        studentId: "w8-week07-student-01",
        statusHeadline:
          "배포 실패 이후 질문과 제출, 체크인이 함께 끊겨 오늘 가장 먼저 리듬을 복구해야 하는 학생입니다.",
        aiInterpretation:
          "이번 주 신호는 기술 막힘과 심리적 압박이 동시에 나타난 사례입니다. 라우팅 오류 이후 로그를 읽지 못한 시점부터 질문과 팀 채널 반응이 모두 감소했습니다.",
        coachFocus:
          "문제 전체를 한 번에 풀게 하지 말고, 오늘 제출 최소 기준을 먼저 합의해야 합니다. 짧은 로그 해석 체크인으로 다시 진입하게 만드는 것이 우선입니다.",
        timeline: [
          {
            id: "w8-week07-student-01-signal-01",
            type: "assignment",
            typeLabel: "과제",
            title: "배포 과제 최종 제출 보류",
            summary:
              "배포 오류를 모두 해결할 때까지 제출하지 않겠다는 코멘트가 기록됐습니다.",
            occurredAtLabel: "04-14 오후 22:40",
          },
          {
            id: "w8-week07-student-01-signal-02",
            type: "question",
            typeLabel: "질문",
            title: "오류 로그 질문 중단",
            summary:
              "배포 로그를 읽지 못한 뒤부터 질문 채널에 남기던 문의가 끊겼습니다.",
            occurredAtLabel: "04-15 오전 11:10",
          },
          {
            id: "w8-week07-student-01-signal-03",
            type: "attendance",
            typeLabel: "출석",
            title: "오전 체크인 누락",
            summary:
              "프로젝트 주간 내내 유지하던 체크인이 처음으로 누락돼 리듬 붕괴 신호가 확인됐습니다.",
            occurredAtLabel: "04-15 오전 09:00",
          },
          {
            id: "w8-week07-student-01-signal-04",
            type: "coaching-note",
            typeLabel: "상담 메모",
            title: "배포 실패 후 자신감 저하 메모",
            summary:
              "조교가 '어디서부터 다시 봐야 할지 모르겠다'는 발화를 상담 메모에 남겼습니다.",
            occurredAtLabel: "04-15 오후 18:25",
          },
        ],
      },
      careHistory: [
        {
          studentName: "장하은",
          actionLabel: "배포 로그 해석 체크인",
          outcome:
            "로그를 한 줄씩 읽는 방식으로 오류 범위를 좁히고, 오늘 제출 최소 기준을 다시 잡았습니다.",
          recordedAtLabel: "어제 19:20 기록",
          nextCheckLabel: "오늘 오전 배포 확인",
        },
        {
          studentName: "류시윤",
          actionLabel: "팀 역할 범위 재조정",
          outcome:
            "프론트엔드와 배포를 함께 맡던 범위를 나누고, 프론트엔드 완료 기준만 먼저 합의했습니다.",
          recordedAtLabel: "어제 21:00 기록",
          nextCheckLabel: "오늘 15:00 회의 확인",
        },
        {
          studentName: "김도하",
          actionLabel: "상담 메모 후속 체크",
          outcome:
            "완벽주의로 제출을 미루는 패턴을 확인하고 최소 제출 기준을 도입했습니다.",
          recordedAtLabel: "오늘 08:20 기록",
          nextCheckLabel: null,
        },
      ],
      weeklyReport: {
        summary:
          "7주차에는 라우팅 복구, 배포 오류 해석, 팀 역할 과부하가 동시에 반복 막힘으로 나타났습니다.",
        coachMemo:
          "이 주차는 질문량보다 상담 메모와 체크인 누락이 더 강한 위험 신호로 작동합니다.",
        todayFocus: [
          "배포 실패 후 멈춘 학생 2명을 오전 중 다시 진입시키기",
          "팀 역할 과부하 학생의 범위를 오늘 안에 다시 좁히기",
          "배포 로그 읽기 예제를 짧은 미니 데모로 먼저 보여주기",
        ],
        conceptFocuses: [
          {
            concept: "Next.js 라우팅 복구",
            affectedStudentCount: 5,
            reason:
              "App Router 경로 구조를 잘못 이해해 팀 프로젝트 전체가 막히는 사례가 생겼습니다.",
          },
          {
            concept: "배포 로그 해석",
            affectedStudentCount: 4,
            reason:
              "오류 메시지를 읽지 못해 질문보다 포기를 먼저 선택하는 흐름이 반복됐습니다.",
          },
          {
            concept: "팀 역할 범위 조정",
            affectedStudentCount: 4,
            reason:
              "한 사람이 UI, API, 배포를 동시에 맡아 일정이 급격히 무너졌습니다.",
          },
        ],
      },
    },
  },
  [instructorDashboardCohortIds.webFullstack7]: {
    [instructorDashboardWeekIds.week05]: {
      generatedAt: "2026-04-07T00:00:00.000Z",
      generatedLabel: "2026년 4월 7일 오전 9:00 기준 · 웹 풀스택 7기 5주차",
      headline:
        "웹 풀스택 7기 5주차는 복습 구간에서 질문이 줄어드는 학생 2명을 먼저 챙겨야 합니다.",
      summary:
        "7기는 기존 개념 복습 비중이 커서 겉으로는 안정적이지만, 질문이 사라지는 학생을 빠르게 발견해야 합니다.",
      briefing: {
        label: "5주차 아침 브리핑",
        headline:
          "질문이 끊긴 학생 2명을 먼저 흔들어야 오후 복습 수업이 살아납니다.",
        summary:
          "복습 주간은 출석만 보면 안정적으로 보이지만, 실제로는 조용히 빠지는 학생이 늘어납니다. 질문과 코드 리뷰 요청 수를 함께 봐야 합니다.",
        actionItems: [
          "이서후에게 라이브 질문 시간 첫 순서를 먼저 배정합니다.",
          "윤다은의 코드 리뷰 요청 초안을 오전 중 다시 확인합니다.",
          "송지민에게 복습 과제 최소 제출 기준을 다시 안내합니다.",
        ],
        supportNote:
          "같은 제품이라도 코호트 특성이 다르면 우선 학생 큐 기준도 바뀌어야 합니다.",
      },
      metrics: buildMetrics(4, 2, 3, 3),
      segments: buildSegments(4, 6, 8, 6),
      priorityStudents: [
        {
          priorityOrder: 1,
          id: "w7-week05-student-01",
          name: "이서후",
          cohortName: "웹 풀스택 7기",
          riskLevel: "high",
          careSegment: "needs-care",
          riskSummary:
            "복습 수업에서는 출석하지만 질문이 완전히 사라져 혼자 막히는 패턴이 보입니다.",
          recentChange:
            "지난 1주일 동안 코드 리뷰 요청이 0건이고, 라이브 질문 시간 응답도 모두 짧게 끝났습니다.",
          recommendedAction:
            "질문을 직접 만들어보는 짧은 템플릿을 보내고, 오늘 수업 첫 10분에 바로 확인합니다.",
          nextCheckLabel: "오늘 14:00까지",
          tags: ["질문 없음", "복습 주간", "조용한 이탈"],
        },
        {
          priorityOrder: 2,
          id: "w7-week05-student-02",
          name: "윤다은",
          cohortName: "웹 풀스택 7기",
          riskLevel: "medium",
          careSegment: "follow-up",
          riskSummary:
            "코드 리뷰 초안을 작성하다 멈추는 패턴이 반복돼 후속 확인이 필요합니다.",
          recentChange:
            "리뷰 요청을 두 번 저장만 하고 제출하지 못했고, 과제 설명도 길게 적지 못하고 있습니다.",
          recommendedAction:
            "코드 리뷰 요청 양식을 더 짧게 줄이고, 오늘 안에 첫 제출만 완료하게 돕습니다.",
          nextCheckLabel: "오늘 17:00 전",
          tags: ["코드 리뷰", "후속 확인", "표현 부담"],
        },
        {
          priorityOrder: 3,
          id: "w7-week05-student-03",
          name: "송지민",
          cohortName: "웹 풀스택 7기",
          riskLevel: "medium",
          careSegment: "watch",
          riskSummary:
            "복습 과제는 열지만 제출 최소 기준을 스스로 높게 잡아 마감 직전 포기합니다.",
          recentChange:
            "과제 시작 로그는 있으나 최종 제출이 비고, 회고에는 '완벽하지 않아 못 냈다'는 문장이 남았습니다.",
          recommendedAction:
            "오늘은 최소 제출만 먼저 하게 하고, 보완은 내일 후속 시간으로 분리합니다.",
          nextCheckLabel: "오늘 20:00까지",
          tags: ["완벽주의", "복습 과제", "마감 포기"],
        },
      ],
      highlightedStudentDetail: {
        studentId: "w7-week05-student-01",
        statusHeadline:
          "복습 구간에서 질문이 완전히 사라져, 겉보기 안정감 뒤에 숨은 이탈 위험이 가장 큰 학생입니다.",
        aiInterpretation:
          "질문 감소와 코드 리뷰 요청 중단이 동시에 나타났습니다. 복습 주간 특성상 출석만 보면 안정적으로 보이지만 실제 학습 확인 신호는 급격히 약해졌습니다.",
        coachFocus:
          "정답 설명보다 질문을 다시 만들게 하는 구조가 먼저입니다. 수업 첫 10분에 직접 질문 한 줄을 쓰게 만드는 개입이 필요합니다.",
        timeline: [
          {
            id: "w7-week05-student-01-signal-01",
            type: "question",
            typeLabel: "질문",
            title: "라이브 질문 시간 무응답",
            summary:
              "반복 개념 확인 시간에 가장 자주 질문하던 학생이 처음으로 완전히 응답하지 않았습니다.",
            occurredAtLabel: "04-03 오후 14:10",
          },
          {
            id: "w7-week05-student-01-signal-02",
            type: "assignment",
            typeLabel: "과제",
            title: "복습 과제 제출 지연",
            summary:
              "과제 시작 로그는 있었지만 제출까지 이어지지 않아 자동 알림이 발송됐습니다.",
            occurredAtLabel: "04-04 오후 23:20",
          },
          {
            id: "w7-week05-student-01-signal-03",
            type: "attendance",
            typeLabel: "출석",
            title: "출석은 정상 유지",
            summary:
              "겉으로는 안정적으로 보이지만, 다른 학습 신호가 급격히 약해져 주의가 필요합니다.",
            occurredAtLabel: "04-05 오전 09:00",
          },
          {
            id: "w7-week05-student-01-signal-04",
            type: "coaching-note",
            typeLabel: "상담 메모",
            title: "질문 만드는 것 자체가 부담된다는 메모",
            summary:
              "조교가 질문을 정리하는 단계부터 부담을 느낀다는 발화를 메모에 남겼습니다.",
            occurredAtLabel: "04-06 오후 18:05",
          },
        ],
      },
      careHistory: [
        {
          studentName: "김다솔",
          actionLabel: "질문 템플릿 전달",
          outcome:
            "질문 문장을 직접 쓰기 어려운 학생에게 템플릿을 줘 첫 회신을 다시 받았습니다.",
          recordedAtLabel: "어제 17:50 기록",
          nextCheckLabel: "오늘 12:30 회신 확인",
        },
        {
          studentName: "배지호",
          actionLabel: "코드 리뷰 요청 분할",
          outcome:
            "길게 적어야 한다는 부담을 줄이기 위해 리뷰 요청을 3문장 양식으로 바꿨습니다.",
          recordedAtLabel: "어제 19:30 기록",
          nextCheckLabel: "오늘 오후 제출 확인",
        },
        {
          studentName: "오은결",
          actionLabel: "최소 제출 기준 합의",
          outcome:
            "복습 과제를 완벽하게 내야 한다는 부담을 낮추고 최소 제출 기준을 먼저 합의했습니다.",
          recordedAtLabel: "오늘 08:15 기록",
          nextCheckLabel: null,
        },
      ],
      weeklyReport: {
        summary:
          "웹 풀스택 7기 5주차는 질문 문장 만들기, 코드 리뷰 요청, 복습 과제 최소 제출 기준에서 반복 막힘이 확인됩니다.",
        coachMemo:
          "복습 주간은 출석보다 질문과 리뷰 요청 신호를 더 강하게 봐야 조용한 이탈을 놓치지 않습니다.",
        todayFocus: [
          "질문이 끊긴 학생 2명의 첫 질문 문장을 오전 중 다시 열기",
          "코드 리뷰 요청 양식을 짧게 줄여 오늘 안에 첫 제출 받기",
          "복습 과제 최소 제출 기준을 다시 명시해 마감 포기 줄이기",
        ],
        conceptFocuses: [
          {
            concept: "질문 문장 만들기",
            affectedStudentCount: 5,
            reason: "무엇을 물어야 할지 몰라 아예 질문을 포기하는 패턴이 나타났습니다.",
          },
          {
            concept: "코드 리뷰 요청",
            affectedStudentCount: 4,
            reason: "길게 정리해야 한다는 부담 때문에 리뷰 요청이 저장 상태로만 남았습니다.",
          },
          {
            concept: "복습 과제 최소 제출",
            affectedStudentCount: 4,
            reason: "완벽해야 낼 수 있다고 생각해 마감 직전 포기하는 사례가 반복됐습니다.",
          },
        ],
      },
    },
    [instructorDashboardWeekIds.week06]: {
      generatedAt: "2026-04-07T00:00:00.000Z",
      generatedLabel: "2026년 4월 7일 오전 9:00 기준 · 웹 풀스택 7기 6주차",
      headline:
        "웹 풀스택 7기 6주차는 팀 협업 복습과 API 연결 과제가 겹쳐 후속 확인 학생이 늘어났습니다.",
      summary:
        "6주차의 7기는 즉시 케어보다 후속 확인 비중이 커집니다. 이미 개입한 학생을 놓치지 않는 흐름이 더 중요합니다.",
      briefing: {
        label: "6주차 아침 브리핑",
        headline:
          "이미 손댄 학생 3명의 후속 확인만 잘 닫아도 오늘 반 흐름이 정돈됩니다.",
        summary:
          "복습 코호트는 큰 문제보다 작은 약속 미이행이 누적되며 리듬이 무너집니다. 어제 합의한 제출 시점과 체크인 약속을 다시 확인해야 합니다.",
        actionItems: [
          "이서후의 질문 템플릿 회신 여부를 오전 중 다시 확인합니다.",
          "윤다은에게 코드 리뷰 요청 최소 기준을 다시 안내합니다.",
          "송지민에게 어제 합의한 복습 과제 제출 시점을 다시 체크합니다.",
        ],
        supportNote:
          "라운드 17부터는 주차를 바꾸면 후속 확인 중심 코호트의 밀도도 함께 바뀌어야 합니다.",
      },
      metrics: buildMetrics(5, 3, 2, 3),
      segments: buildSegments(5, 7, 7, 5),
      priorityStudents: [
        {
          priorityOrder: 1,
          id: "w7-week06-student-01",
          name: "이서후",
          cohortName: "웹 풀스택 7기",
          riskLevel: "high",
          careSegment: "follow-up",
          riskSummary:
            "질문 템플릿을 보냈지만 회신이 다시 끊겨 후속 확인이 가장 시급합니다.",
          recentChange:
            "어제 밤 회신 예정 시간을 넘겼고, 오늘 아침 체크인도 짧게만 남겼습니다.",
          recommendedAction:
            "오전 수업 시작 전 직접 한 줄 질문을 같이 작성해 회신 장벽을 다시 낮춥니다.",
          nextCheckLabel: "오늘 10:30까지",
          tags: ["후속 확인", "질문 템플릿", "회신 지연"],
        },
        {
          priorityOrder: 2,
          id: "w7-week06-student-02",
          name: "윤다은",
          cohortName: "웹 풀스택 7기",
          riskLevel: "medium",
          careSegment: "follow-up",
          riskSummary:
            "코드 리뷰 요청 양식을 줄였지만 제출 직전 다시 멈추는 패턴이 남아 있습니다.",
          recentChange:
            "리뷰 요청 초안은 작성했으나 마지막 전송 버튼만 누르지 못한 상태가 다시 확인됐습니다.",
          recommendedAction:
            "오늘은 리뷰 요청 한 건만 먼저 같이 전송하고, 설명은 오후에 보완하게 합니다.",
          nextCheckLabel: "오늘 16:20까지",
          tags: ["코드 리뷰", "후속 확인", "전송 지연"],
        },
        {
          priorityOrder: 3,
          id: "w7-week06-student-03",
          name: "송지민",
          cohortName: "웹 풀스택 7기",
          riskLevel: "medium",
          careSegment: "needs-care",
          riskSummary:
            "API 연결 복습 과제에서 오류를 만나자 다시 제출 자체를 미루고 있습니다.",
          recentChange:
            "fetch 응답 처리 오류를 만난 뒤 복습 과제 창은 열었지만 제출 시도를 멈췄습니다.",
          recommendedAction:
            "오류를 고치는 것보다 콘솔 로그를 읽는 순서를 먼저 같이 정리합니다.",
          nextCheckLabel: "오늘 18:10까지",
          tags: ["API 연결", "콘솔 로그", "제출 지연"],
        },
      ],
      highlightedStudentDetail: {
        studentId: "w7-week06-student-01",
        statusHeadline:
          "이미 개입한 뒤에도 회신이 다시 끊겨 후속 확인 실패가 누적되기 쉬운 학생입니다.",
        aiInterpretation:
          "복습 코호트 특성상 큰 붕괴보다 작은 약속 미이행이 먼저 나타납니다. 질문 템플릿 회신을 약속했지만, 실행 단계에서 다시 멈춘 흐름이 보입니다.",
        coachFocus:
          "새로운 설명보다 이전 약속을 아주 작게 다시 실행하게 만드는 것이 중요합니다. 한 줄 질문을 같이 써서 회신 장벽을 낮춰야 합니다.",
        timeline: [
          {
            id: "w7-week06-student-01-signal-01",
            type: "coaching-note",
            typeLabel: "상담 메모",
            title: "질문 템플릿 전달 후 안도 메모",
            summary:
              "처음에는 도움이 됐다고 말했지만 실제 회신 행동으로 이어지지는 않았습니다.",
            occurredAtLabel: "04-07 오후 18:40",
          },
          {
            id: "w7-week06-student-01-signal-02",
            type: "question",
            typeLabel: "질문",
            title: "회신 약속 시간 초과",
            summary:
              "밤 10시까지 남기기로 한 질문이 끝내 들어오지 않아 후속 확인이 필요해졌습니다.",
            occurredAtLabel: "04-08 오후 22:10",
          },
          {
            id: "w7-week06-student-01-signal-03",
            type: "attendance",
            typeLabel: "출석",
            title: "짧은 체크인만 남김",
            summary:
              "출석은 했지만 '괜찮습니다' 한 줄만 남겨 실제 상태 파악이 되지 않았습니다.",
            occurredAtLabel: "04-09 오전 09:02",
          },
          {
            id: "w7-week06-student-01-signal-04",
            type: "assignment",
            typeLabel: "과제",
            title: "복습 과제 재시도 없음",
            summary:
              "질문 회신이 늦어지며 복습 과제 재시도 로그도 함께 멈췄습니다.",
            occurredAtLabel: "04-09 오후 23:00",
          },
        ],
      },
      careHistory: [
        {
          studentName: "김다솔",
          actionLabel: "질문 회신 재오픈",
          outcome:
            "질문 템플릿을 다시 같이 작성해 회신을 재오픈했고, 첫 줄은 직접 남기게 했습니다.",
          recordedAtLabel: "어제 18:30 기록",
          nextCheckLabel: "오늘 오전 회신 확인",
        },
        {
          studentName: "배지호",
          actionLabel: "리뷰 요청 전송 보조",
          outcome:
            "저장만 하던 리뷰 요청을 함께 전송해 후속 피드백 루프를 다시 열었습니다.",
          recordedAtLabel: "어제 20:00 기록",
          nextCheckLabel: "오늘 오후 리뷰 확인",
        },
        {
          studentName: "오은결",
          actionLabel: "콘솔 로그 읽기 가이드 전달",
          outcome:
            "API 연결 오류를 한 번에 고치려 하지 않고 로그부터 읽게 하는 가이드를 먼저 전달했습니다.",
          recordedAtLabel: "오늘 08:25 기록",
          nextCheckLabel: null,
        },
      ],
      weeklyReport: {
        summary:
          "6주차의 웹 풀스택 7기는 후속 확인 누락, 코드 리뷰 요청 전송 지연, API 연결 복습 과제에서 반복 막힘이 보입니다.",
        coachMemo:
          "이 코호트는 즉시 케어보다 어제 합의한 약속을 오늘 실제로 실행하게 만드는 흐름이 더 중요합니다.",
        todayFocus: [
          "후속 확인 학생 3명의 약속 실행 여부를 오전 중 다시 닫기",
          "리뷰 요청 저장 상태를 실제 전송으로 바꾸기",
          "API 연결 복습 과제에서 로그 읽기 순서를 짧게 다시 설명하기",
        ],
        conceptFocuses: [
          {
            concept: "후속 약속 실행",
            affectedStudentCount: 5,
            reason: "설명은 이해했지만 실제 실행 단계에서 다시 멈추는 패턴이 반복됐습니다.",
          },
          {
            concept: "코드 리뷰 요청 전송",
            affectedStudentCount: 4,
            reason: "요청을 작성해도 마지막 전송 버튼에서 멈추는 사례가 남아 있습니다.",
          },
          {
            concept: "API 연결 로그 읽기",
            affectedStudentCount: 3,
            reason: "오류를 한 번에 고치려다 오히려 제출을 미루는 흐름이 보입니다.",
          },
        ],
      },
    },
    [instructorDashboardWeekIds.week07]: {
      generatedAt: "2026-04-07T00:00:00.000Z",
      generatedLabel: "2026년 4월 7일 오전 9:00 기준 · 웹 풀스택 7기 7주차",
      headline:
        "웹 풀스택 7기 7주차는 프로젝트 회고와 복구 과제가 겹쳐 상담 메모 기반 케어가 더 중요해집니다.",
      summary:
        "7주차의 7기는 기술 복구보다 회고와 자신감 회복이 함께 필요한 구간입니다. 상담 메모를 포함한 학생관리 흐름이 중요합니다.",
      briefing: {
        label: "7주차 아침 브리핑",
        headline:
          "회고 단계에서 멈춘 학생 2명을 먼저 열어야 다음 주 제출 계획이 다시 살아납니다.",
        summary:
          "프로젝트를 한 번 마무리한 뒤에는 기술 막힘보다 회고와 재시작 부담이 크게 작동합니다. 상담 메모와 후속 일정 합의가 핵심입니다.",
        actionItems: [
          "이서후에게 회고 초안을 오늘 첫 15분 안에 같이 시작하게 합니다.",
          "윤다은의 리뷰 피드백 반영 범위를 오늘 안에 다시 좁혀 합의합니다.",
          "송지민에게 최소 제출 기준을 다음 주 계획표와 함께 다시 씁니다.",
        ],
        supportNote:
          "주차 컨텍스트는 기술 막힘뿐 아니라 회고 단계의 정서 신호까지 함께 보여줘야 합니다.",
      },
      metrics: buildMetrics(5, 3, 2, 4),
      segments: buildSegments(5, 6, 7, 6),
      priorityStudents: [
        {
          priorityOrder: 1,
          id: "w7-week07-student-01",
          name: "이서후",
          cohortName: "웹 풀스택 7기",
          riskLevel: "high",
          careSegment: "needs-care",
          riskSummary:
            "프로젝트 회고 초안을 시작하지 못해 다음 주 계획도 함께 비어 있습니다.",
          recentChange:
            "회고 문서를 열어만 두고 저장하지 못했고, 질문 템플릿도 다시 비었습니다.",
          recommendedAction:
            "회고 초안 첫 문장만 같이 쓰고, 다음 주 첫 액션 한 가지만 바로 정합니다.",
          nextCheckLabel: "오늘 11:00까지",
          tags: ["회고 중단", "계획 비움", "정서 케어"],
        },
        {
          priorityOrder: 2,
          id: "w7-week07-student-02",
          name: "윤다은",
          cohortName: "웹 풀스택 7기",
          riskLevel: "medium",
          careSegment: "follow-up",
          riskSummary:
            "리뷰 피드백을 모두 반영하려다 다시 손을 못 대는 패턴이 생겼습니다.",
          recentChange:
            "리뷰 코멘트 7개를 한 번에 처리하려다 수정 시작 로그가 끊겼습니다.",
          recommendedAction:
            "오늘은 피드백 2개만 반영하는 범위로 다시 좁혀 제출 계획을 재합의합니다.",
          nextCheckLabel: "오늘 16:40까지",
          tags: ["리뷰 피드백", "범위 과다", "후속 확인"],
        },
        {
          priorityOrder: 3,
          id: "w7-week07-student-03",
          name: "송지민",
          cohortName: "웹 풀스택 7기",
          riskLevel: "medium",
          careSegment: "watch",
          riskSummary:
            "최소 제출 기준을 합의했지만, 다음 주 계획으로 연결하지 못해 다시 정체 중입니다.",
          recentChange:
            "이번 주 과제는 냈지만 다음 주 계획표를 비워 둔 채 회고 문서만 길게 남겼습니다.",
          recommendedAction:
            "다음 주 첫 액션 1개만 계획표에 먼저 적게 하고, 나머지는 이후에 채우게 합니다.",
          nextCheckLabel: "오늘 19:00까지",
          tags: ["계획 비움", "회고 과다", "관찰 유지"],
        },
      ],
      highlightedStudentDetail: {
        studentId: "w7-week07-student-01",
        statusHeadline:
          "기술 막힘보다 회고와 재시작 부담이 커져, 다음 주 계획까지 함께 비워질 위험이 큰 학생입니다.",
        aiInterpretation:
          "프로젝트를 마무리한 뒤에는 회고를 시작하지 못하는 학생이 다음 주 학습 계획도 함께 비워 두는 경향이 있습니다. 이 학생은 질문 템플릿과 회고 초안이 동시에 비었습니다.",
        coachFocus:
          "회고를 잘 쓰게 만드는 것보다 첫 문장을 같이 시작하게 하는 것이 우선입니다. 다음 주 첫 액션 한 가지만 먼저 정하면 리듬을 다시 만들 수 있습니다.",
        timeline: [
          {
            id: "w7-week07-student-01-signal-01",
            type: "assignment",
            typeLabel: "과제",
            title: "회고 문서 미작성",
            summary:
              "프로젝트 마감 후 필수 회고 문서가 열려만 있고 저장되지 않았습니다.",
            occurredAtLabel: "04-14 오후 23:10",
          },
          {
            id: "w7-week07-student-01-signal-02",
            type: "question",
            typeLabel: "질문",
            title: "질문 템플릿 재중단",
            summary:
              "이전 주에 복구했던 질문 템플릿 회신이 다시 비어 다음 주 계획과 함께 멈췄습니다.",
            occurredAtLabel: "04-15 오전 10:20",
          },
          {
            id: "w7-week07-student-01-signal-03",
            type: "coaching-note",
            typeLabel: "상담 메모",
            title: "재시작 부담 메모",
            summary:
              "조교가 '다음 주를 어디서 시작해야 할지 모르겠다'는 발화를 메모에 남겼습니다.",
            occurredAtLabel: "04-15 오후 15:40",
          },
          {
            id: "w7-week07-student-01-signal-04",
            type: "attendance",
            typeLabel: "출석",
            title: "출석은 정상 유지",
            summary:
              "겉보기 출석은 안정적이지만 실제 계획과 회고 신호가 동시에 약해졌습니다.",
            occurredAtLabel: "04-16 오전 09:00",
          },
        ],
      },
      careHistory: [
        {
          studentName: "김다솔",
          actionLabel: "회고 초안 첫 문장 작성",
          outcome:
            "회고를 완성하려 하지 않고 첫 문장만 같이 적어 재시작 부담을 줄였습니다.",
          recordedAtLabel: "어제 18:15 기록",
          nextCheckLabel: "오늘 오전 회고 확인",
        },
        {
          studentName: "배지호",
          actionLabel: "리뷰 반영 범위 축소",
          outcome:
            "코멘트 전체를 처리하려던 범위를 2개로 좁혀 다시 제출 계획을 세웠습니다.",
          recordedAtLabel: "어제 20:05 기록",
          nextCheckLabel: "오늘 오후 반영 확인",
        },
        {
          studentName: "오은결",
          actionLabel: "다음 주 첫 액션 고정",
          outcome:
            "계획표 전체를 쓰지 못해도 첫 액션 1개만 먼저 적게 해 다시 출발점을 만들었습니다.",
          recordedAtLabel: "오늘 08:10 기록",
          nextCheckLabel: null,
        },
      ],
      weeklyReport: {
        summary:
          "7주차의 웹 풀스택 7기는 회고 시작, 리뷰 반영 범위 조정, 다음 주 첫 액션 고정에서 반복 막힘이 나타났습니다.",
        coachMemo:
          "이 주차는 기술 설명보다 재시작 부담을 낮추는 짧은 개입이 훨씬 큰 효과를 냅니다.",
        todayFocus: [
          "회고 초안이 비어 있는 학생 2명의 첫 문장부터 다시 열기",
          "리뷰 반영 범위를 2개 이하로 좁혀 오늘 안에 다시 합의하기",
          "다음 주 계획표는 첫 액션 1개만 먼저 적게 만들기",
        ],
        conceptFocuses: [
          {
            concept: "회고 시작",
            affectedStudentCount: 4,
            reason: "회고를 완성해야 한다는 부담으로 첫 문장도 쓰지 못하는 학생이 늘었습니다.",
          },
          {
            concept: "리뷰 반영 범위 조정",
            affectedStudentCount: 4,
            reason: "코멘트를 한 번에 모두 반영하려다 수정 시작 자체를 미루는 사례가 생겼습니다.",
          },
          {
            concept: "다음 주 첫 액션 고정",
            affectedStudentCount: 3,
            reason: "계획표 전체를 채우려다 결국 아무것도 시작하지 못하는 패턴이 반복됐습니다.",
          },
        ],
      },
    },
  },
};

export function getInstructorDashboard(
  params: GetInstructorDashboardParams = {},
): InstructorDashboardResponse {
  const selectedCohortId = resolveOptionId(
    instructorDashboardCohorts,
    params.cohortId,
    defaultCohortId,
  ) as InstructorDashboardCohortId;
  const selectedWeekId = resolveOptionId(
    instructorDashboardWeeks,
    params.weekId,
    defaultWeekId,
  ) as InstructorDashboardWeekId;

  const response = {
    ...instructorDashboardFixtures[selectedCohortId][selectedWeekId],
    scope: buildScope(selectedCohortId, selectedWeekId),
  };

  return instructorDashboardResponseSchema.parse(response);
}
