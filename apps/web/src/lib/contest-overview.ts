import type { ContestOverviewResponse } from "@yeon/api-contract/contest";

export type ContestOverview = ContestOverviewResponse;

const contestRole = {
  learner: "learner",
  instructor: "instructor",
  operator: "operator",
} as const;

export const contestOverview: ContestOverview = {
  solutionName: "YEON",
  category: "부트캠프 교강사용 AI 학생관리 CRM",
  headline:
    "수업 전 30분 안에 오늘 챙길 학생을 정리하고 끝까지 관리하게 만드는 교강사용 AI 학생관리 CRM",
  summary:
    "YEON은 출석, 데일리 과제, 실습, 질문, 상담 메모 같은 신호를 학생함에 모아 운영 조직 소속 부트캠프 교강사가 수업 전 준비 시간 안에 오늘 챙길 학생을 정리하고, 개입하고, 기록하고, 다시 확인하는 전체 관리 흐름을 돕습니다.",
  problemStatement:
    "운영 조직 소속 부트캠프 교강사는 수업 전 짧은 준비 시간 안에 출석, 데일리 과제, 실습, 질문, 상담, 운영 공유까지 함께 정리해야 하지만 정보가 여러 도구에 흩어져 있어 오늘 챙길 학생과 우선 개입 사유를 빠르게 정리하지 못하고, 그 결과 피드백과 후속 확인이 끊긴 채 운영됩니다.",
  targetUsers: ["운영 조직 소속 교강사", "부트캠프 수강생", "교육 운영자"],
  learningSignals: [
    "참여 저하: 출석 하락과 실습 참여 급감",
    "데일리 과제 제출 지연과 미제출 누적",
    "질문 없음 또는 질문 급감",
    "상담·면담 메모의 경고 신호",
    "주차별 반복 오답 개념과 실습 실패",
    "최근 학습 활동 급감",
  ],
  submissionCopy: {
    oneLiner:
      "YEON은 운영 조직 소속 부트캠프 교강사가 수업 전 30분 안에 오늘 챙길 학생을 정리하고 개입까지 이어가게 만드는 AI 학생관리 CRM입니다.",
    problemDefinition:
      "부트캠프 교강사는 학생 상태를 판단할 정보가 없는 것이 아니라, 출석·과제·질문·상담 기록이 흩어져 있어 수업 전 준비 시간 안에 누구를 왜 먼저 챙겨야 하는지 빠르게 정리하지 못합니다.",
    positioning: "교강사용 AI 학생관리 CRM",
  },
  dailyWorkflow: [
    {
      stage: "수업 전",
      title: "오늘 챙길 학생과 반 리스크를 먼저 정리한다",
      summary:
        "교강사는 짧은 준비 시간 안에 출석 하락, 과제 지연, 질문 없음, 상담 메모를 다시 조합해 우선 개입 대상을 정리해야 합니다.",
      keyQuestion: "오늘 누구를 왜 먼저 챙겨야 하는가?",
      isMvpFocus: true,
    },
    {
      stage: "수업 중",
      title: "실습 막힘과 참여 저하를 놓치지 않는다",
      summary:
        "실시간 실습 참여와 질문 반응을 보며 수업 흐름을 유지해야 하지만, 개별 학생 이력까지 깊게 보기 어렵습니다.",
      keyQuestion: "지금 바로 개입해야 할 학생은 누구인가?",
      isMvpFocus: false,
    },
    {
      stage: "수업 후",
      title: "개입 내용을 기록하고 다음 확인을 남긴다",
      summary:
        "피드백 발송, 면담 메모, 보강 과제 지정이 끝난 뒤 다음 확인일과 운영 공유 포인트를 남겨야 학생관리가 끊기지 않습니다.",
      keyQuestion: "오늘 한 개입이 다음 수업 전까지 이어지는가?",
      isMvpFocus: false,
    },
  ],
  primaryPersona: {
    name: "박서연",
    roleTitle: "운영 조직 소속 메인 교강사",
    summary:
      "두 개 코호트를 맡아 매일 수업 전 30분 안에 오늘 챙길 학생을 정리해야 하는 부트캠프 메인 교강사입니다. 수업 품질과 운영 공유를 함께 책임지기 때문에 학생 상태를 빠르게 정리하고, 누락 없이 후속관리할 도구가 필요합니다.",
    cohortScope: "2개 코호트, 총 48~60명 관리",
    workingWindow: "평일 오전 수업 전 30분, 수업 후 20분 정리",
    responsibilities: [
      "오늘 챙길 학생 선별",
      "과제 지연과 실습 막힘 확인",
      "개별 피드백과 면담 일정 조율",
      "운영자에게 코호트 리스크 공유",
    ],
    currentTools: [
      "LMS 출석·과제 화면",
      "Slack 질문 채널",
      "노션 상담 메모",
      "구글 스프레드시트 운영 현황표",
    ],
    painPoints: [
      "출석, 과제, 질문, 상담 기록이 흩어져 우선순위 판단이 느리다",
      "이전에 어떤 개입을 했는지 기억과 메모에 의존한다",
      "수업 전 짧은 시간 안에 전체 학생 상태를 다시 조합해야 한다",
    ],
    successCriteria: [
      "수업 전 30분 안에 오늘 개입 대상과 이유를 정리한다",
      "학생별 이전 개입 이력과 다음 확인일을 한 번에 본다",
      "반 전체 리스크를 운영자에게 바로 공유할 수 있다",
    ],
  },
  riskSignals: [
    {
      priority: "1순위",
      title: "참여 저하",
      indicator: "출석 하락, 지각 증가, 실습 참여 급감",
      reason:
        "학업 성과가 눈에 띄게 떨어지기 전에 가장 먼저 보이는 조기 경고 신호이기 때문입니다.",
      recommendedAction:
        "오늘 수업 전 학생함에서 바로 확인하고 짧은 체크인 메시지 초안을 준비합니다.",
    },
    {
      priority: "2순위",
      title: "데일리 과제 지연",
      indicator: "지연 제출 누적, 미제출 반복, 재제출 증가",
      reason:
        "실습 흐름이 끊기고 있다는 직접적인 신호라 수업 이해도 저하와 함께 나타날 가능성이 큽니다.",
      recommendedAction:
        "과제 맥락을 포함한 피드백과 보강 과제를 함께 제안합니다.",
    },
    {
      priority: "3순위",
      title: "질문 없음",
      indicator: "질문 채널 무응답, 오프라인 질문 감소, 반응 소극화",
      reason:
        "모르는 것을 드러내지 못하는 학생은 늦게 발견될수록 이탈 위험이 커지기 때문입니다.",
      recommendedAction:
        "질문 유도형 메시지와 짧은 면담 예약 액션을 우선 붙입니다.",
    },
    {
      priority: "4순위",
      title: "상담 메모 경고",
      indicator: "학습 자신감 저하, 개인 사정, 반복 경고 메모",
      reason:
        "다른 정량 신호와 결합될 때 교강사가 우선순위를 바꿔야 하는 강한 문맥 신호가 됩니다.",
      recommendedAction:
        "이전 상담 이력과 함께 다음 확인일을 반드시 남기도록 합니다.",
    },
  ],
  painPoints: [
    {
      role: contestRole.instructor,
      roleLabel: "교강사",
      title:
        "운영 조직 소속 교강사에게 코호트 학생을 관리할 학생함이 없어 관리가 끊긴다",
      description:
        "교강사는 출석, 데일리 과제, 실습, 질문, 상담 기록을 따로 확인하며 코호트 학생 상태를 추적하고 있어 실제 피드백보다 관리 정리와 운영 공유에 더 많은 시간을 씁니다.",
      currentState:
        "누가 어떤 상태인지, 무엇을 했는지, 다음에 뭘 해야 하는지 한 번에 보이지 않음",
    },
    {
      role: contestRole.learner,
      roleLabel: "수강생",
      title: "부트캠프 교강사 관리가 끊기면 피드백도 들쭉날쭉해진다",
      description:
        "수강생은 같은 문제라도 교강사 관리가 누락되면 피드백 시점이 늦어지고, 결국 데일리 과제 지연과 학습 포기로 이어지기 쉽습니다.",
      currentState: "학생별 상황에 맞는 일관된 관리와 후속 확인을 받기 어려움",
    },
    {
      role: contestRole.operator,
      roleLabel: "교육 운영자",
      title: "코호트별 학생관리 품질 차이를 운영에서 늦게 파악한다",
      description:
        "운영자는 코호트별 관리 편차와 학생관리 누락 구간을 실시간으로 보기 어려워, 수강생 이탈이나 불만이 커진 뒤에야 개입하게 됩니다.",
      currentState: "관리 품질이 낮은 반과 반복 문제 구간을 늦게 발견함",
    },
  ],
  coreFeatures: [
    {
      name: "학생함과 관리 세그먼트",
      summary:
        "교강사는 전체 코호트 학생을 한 화면에서 보고, 정상/주의/개입필요/후속확인 같은 세그먼트로 빠르게 관리 대상을 찾습니다.",
      deliverable: "코호트 학생함, 상태 필터, 관리 우선순위 리스트",
    },
    {
      name: "학생 상태 카드와 타임라인",
      summary:
        "출석, 데일리 과제, 실습, 질문, 상담 메모, 이전 개입 이력을 한 카드에 묶어 학생 상태를 맥락 있게 보여줍니다.",
      deliverable:
        "학생 상세 카드, 최근 변화, 코드 리뷰/실습 이력, 이전 개입 이력",
    },
    {
      name: "설명 가능한 AI 진단과 피드백 초안",
      summary:
        "AI는 학생 상태를 한 줄로 설명하고, 교강사가 바로 수정해 쓸 수 있는 메시지와 다음 행동 초안을 만듭니다.",
      deliverable: "진단 문장, 메시지 초안, 다음 액션 제안",
    },
    {
      name: "후속관리와 개입 이력",
      summary:
        "어떤 학생에게 언제 무엇을 했는지 기록하고 다음 확인일을 남겨, 학생관리가 끊기지 않게 합니다.",
      deliverable: "개입 이력, 후속 일정, 재확인 큐",
    },
    {
      name: "반 단위 운영 리포트",
      summary:
        "코호트 전체 분위기, 반복 문제 개념, 미개입 학생군을 요약해 교강사의 수업 준비와 운영 보고를 함께 돕습니다.",
      deliverable: "부트캠프 코호트 주간 학생관리 요약",
    },
  ],
  workflow: [
    {
      step: "01",
      title: "학생 신호 자동 수집",
      summary:
        "출석, 데일리 과제, 실습, 질문, 상담 메모 같은 신호를 학생 단위로 묶어 교강사가 따로 취합하지 않아도 되게 만듭니다.",
    },
    {
      step: "02",
      title: "학생함 분류와 상태 진단",
      summary:
        "학생을 세그먼트로 분류하고, AI가 왜 지금 관리가 필요한지 설명 가능한 진단을 붙입니다.",
    },
    {
      step: "03",
      title: "개입 행동 실행",
      summary:
        "교강사는 메시지, 면담 메모, 보강 과제 같은 개입을 실행하고 AI 초안을 검토해 빠르게 처리합니다.",
    },
    {
      step: "04",
      title: "기록과 후속관리",
      summary:
        "학생별 이력과 다음 확인일을 남기고, 다음 수업 전에 다시 확인해 관리가 끊기지 않게 합니다.",
    },
    {
      step: "05",
      title: "반 단위 운영 요약",
      summary:
        "코호트 전체에서 누락되는 학생군과 반복 문제 개념을 요약해 수업 운영과 보고에 활용합니다.",
    },
  ],
  uxPrinciples: [
    {
      title: "첫 화면은 학생 전체와 오늘 할 일을 함께 보여준다",
      description:
        "운영 조직 소속 부트캠프 교강사는 로그인 직후 전체 코호트 상태, 오늘 후속관리 항목, 바로 처리할 학생을 함께 봐야 합니다.",
    },
    {
      title: "학생함이 서비스의 시작점이다",
      description:
        "위험 학생만 따로 떼어 보여주기보다 전체 학생을 관리 세그먼트로 보는 inbox 구조가 먼저 필요합니다.",
    },
    {
      title: "기록과 후속관리가 탐지만큼 중요하다",
      description:
        "학생관리서비스라면 이전 개입 기록과 다음 확인 일정이 항상 보이게 해야 합니다.",
    },
    {
      title: "색보다 관리 문장",
      description:
        "위험도 숫자보다 `최근 2주 과제 지연 + 면담 이후 변화 없음` 같은 관리 문장이 더 중요합니다.",
    },
  ],
  roleSnapshots: [
    {
      role: contestRole.instructor,
      roleLabel: "부트캠프 교강사 학생함",
      heading:
        "전체 코호트 학생을 보고, 필요한 학생을 찾고, 개입하고, 다시 확인합니다",
      summary:
        "학생함, 학생 상세 카드, 피드백 초안, 후속관리 큐를 한 흐름으로 배치해 부트캠프 교강사 학생관리 업무를 닫습니다.",
      actions: [
        "전체 코호트 학생 상태 세그먼트 확인",
        "개입필요 학생 상세 열람",
        "피드백 발송 후 다음 확인일 설정",
      ],
    },
    {
      role: contestRole.learner,
      roleLabel: "수강생 경험",
      heading: "교강사 관리가 끊기지 않아 학생은 더 일관된 지원을 받습니다",
      summary:
        "학생은 적절한 시점에 개별 피드백과 다음 행동을 받아 학습 흐름을 잃지 않습니다.",
      actions: [
        "개별 피드백 확인",
        "보강 과제 수행",
        "다음 면담 또는 질문 시간 준비",
      ],
    },
    {
      role: contestRole.operator,
      roleLabel: "운영자 뷰",
      heading:
        "운영자는 반별 학생관리 품질과 누락 구간을 보조적으로 확인합니다",
      summary:
        "주 사용자는 교강사지만, 운영자는 반 단위 리스크와 관리 품질 편차를 보조적으로 추적합니다.",
      actions: [
        "미개입 학생군 확인",
        "반별 관리 편차 파악",
        "교강사 팔로업 지원 요청",
      ],
    },
  ],
  expectedImpacts: [
    {
      metric: "학생 관리 누락률",
      currentState: "교강사 기억과 감에 따라 관리 편차 발생",
      targetState: "코호트 학생함과 후속관리 큐로 누락 최소화",
      measurement: "상태 세그먼트, 개입 이력, 다음 확인일 기준",
    },
    {
      metric: "교강사 준비 시간",
      currentState: "학생 상태와 이력을 따로 모아 해석",
      targetState: "코호트 학생 상태와 개입 이력을 한 화면에서 확인",
      measurement: "부트캠프 수업 전 학생관리 준비 시간",
    },
    {
      metric: "개별 피드백 실행 속도",
      currentState: "메시지 작성과 기록이 번거로워 지연",
      targetState: "AI 초안 검토 후 즉시 개입",
      measurement: "학생별 피드백 작성, 발송, 기록 시간",
    },
    {
      metric: "학생관리 연속성",
      currentState: "이전 개입 기록이 흩어져 후속 관리 단절",
      targetState: "학생별 이력과 재확인 큐 기반 관리",
      measurement: "개입 이력과 후속 확인 누락률",
    },
  ],
  aiStack: [
    {
      tool: "Codex",
      model: "GPT-5.4",
      purpose: "학생관리 서비스 구조 설계와 핵심 UX 구현",
      reason:
        "학생관리서비스는 탐지뿐 아니라 기록과 후속관리까지 일관되게 설계해야 하므로 구조화 정확도가 중요합니다.",
    },
    {
      tool: "Codex",
      model: "GPT-5.4-mini",
      purpose: "반복 탐색과 학생관리 플로우 초안 정리",
      reason:
        "속도가 필요한 탐색과 보조 초안 정리를 분리해 메인 모델 토큰 낭비를 줄입니다.",
    },
    {
      tool: "Claude Code",
      model: "고성능 Claude 계열 모델",
      purpose: "예외 케이스와 관리 누락 시나리오 검토",
      reason:
        "학생관리 누락, 잘못된 상태 해석, 기록 단절 같은 반례를 찾는 보조 리뷰 역할로 사용합니다.",
    },
  ],
};

export function getContestOverview(): ContestOverview {
  return contestOverview;
}
