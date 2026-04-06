import {
  instructorWorkspaceResponseSchema,
  type InstructorWorkspaceResponse,
} from "@yeon/api-contract/instructor-workspace";

const instructorWorkspace = instructorWorkspaceResponseSchema.parse({
  generatedAt: "2026-04-07T08:30:00.000Z",
  generatedLabel: "2026년 4월 7일 오전 8:30 기준",
  headline:
    "수업 전 30분 안에 오늘 챙길 학생을 정리하는 교강사 학생관리 대시보드",
  summary:
    "학생 큐, 개입 근거, 메모 기록, 오늘 액션 보드를 한 화면에서 닫아 교강사가 바로 움직일 수 있게 구성했습니다.",
  workspace: {
    coachName: "박서연",
    organizationName: "YEON 부트캠프 운영팀",
    focusWindowLabel: "오전 수업 전 30분 집중 관리",
    coverageLabel: "웹 풀스택 7기·8기 56명 관리",
  },
  cohorts: [
    {
      id: "cohort-7",
      name: "웹 풀스택 7기",
      stageLabel: "프론트엔드 6주차",
      studentCount: 27,
      needsCareCount: 2,
      followUpCount: 4,
      agenda:
        "비동기 흐름과 Promise 체이닝 막힘이 이어져 오늘 미니 예제로 다시 짚어야 합니다.",
    },
    {
      id: "cohort-8",
      name: "웹 풀스택 8기",
      stageLabel: "프론트엔드 5주차",
      studentCount: 29,
      needsCareCount: 4,
      followUpCount: 5,
      agenda:
        "CSS 레이아웃 복구와 과제 지연 학생 체크인이 오늘 수업 전 핵심입니다.",
    },
  ],
  students: [
    {
      id: "student-01",
      name: "김하린",
      cohortName: "웹 풀스택 8기",
      stageLabel: "프론트엔드 5주차",
      ownerLabel: "박서연 교강사",
      priorityOrder: 1,
      riskLevel: "high",
      careSegment: "needs-care",
      currentStatus:
        "출석 하락과 과제 지연, 질문 무응답이 한 주 안에 겹쳤습니다.",
      latestSignal: "최근 4일 질문 채널 반응 없음",
      recentChange:
        "데일리 과제 미제출 뒤 실습 체크포인트도 비어 있어 오늘 바로 체크인이 필요합니다.",
      nextCheckLabel: "오늘 09:40",
      tags: ["참여 저하", "과제 지연", "질문 없음"],
    },
    {
      id: "student-02",
      name: "박준오",
      cohortName: "웹 풀스택 8기",
      stageLabel: "프론트엔드 5주차",
      ownerLabel: "박서연 교강사",
      priorityOrder: 2,
      riskLevel: "high",
      careSegment: "follow-up",
      currentStatus:
        "지난 상담 이후 과제 범위를 다시 조정해야 하는 후속 확인 상태입니다.",
      latestSignal: "보강 과제 재제출 약속 미이행",
      recentChange:
        "상담 메모에 수면 부족 이슈가 추가되어 범위 재설계와 일정 재합의가 필요합니다.",
      nextCheckLabel: "오늘 18:00",
      tags: ["상담 메모", "후속 확인", "보강 과제"],
    },
    {
      id: "student-03",
      name: "이서후",
      cohortName: "웹 풀스택 7기",
      stageLabel: "프론트엔드 6주차",
      ownerLabel: "박서연 교강사",
      priorityOrder: 3,
      riskLevel: "medium",
      careSegment: "needs-care",
      currentStatus:
        "질문이 급감해 혼자 막히는 패턴이 보여 수업 중 개입 지점이 필요합니다.",
      latestSignal: "코드 리뷰 요청 1주일간 0건",
      recentChange:
        "실습 참여는 유지되지만 라이브 질문 시간 응답이 반복적으로 비어 있습니다.",
      nextCheckLabel: "오늘 14:20",
      tags: ["질문 없음", "조용한 이탈", "실습 막힘"],
    },
    {
      id: "student-04",
      name: "최나윤",
      cohortName: "웹 풀스택 7기",
      stageLabel: "프론트엔드 6주차",
      ownerLabel: "김민지 조교",
      priorityOrder: 4,
      riskLevel: "medium",
      careSegment: "watch",
      currentStatus:
        "출석은 유지되지만 과제 제출 시간이 계속 늦어지고 있어 관찰이 필요합니다.",
      latestSignal: "과제 제출 마감 직전 제출 3회 연속",
      recentChange:
        "레이아웃 복구 실습에서 같은 오류를 반복했지만 질문은 적어 개입 타이밍을 봐야 합니다.",
      nextCheckLabel: "내일 10:10",
      tags: ["관찰 유지", "레이아웃", "제출 지연"],
    },
    {
      id: "student-05",
      name: "정민서",
      cohortName: "웹 풀스택 8기",
      stageLabel: "프론트엔드 5주차",
      ownerLabel: "박서연 교강사",
      priorityOrder: 5,
      riskLevel: "medium",
      careSegment: "follow-up",
      currentStatus:
        "보강 과제 범위를 줄인 뒤 다시 진입하는 중이라 결과 확인이 필요합니다.",
      latestSignal: "어제 보강 과제 범위 재조정",
      recentChange:
        "부담이 큰 과제를 작은 단위로 나눈 뒤 제출 약속이 다시 잡혀 오늘 출석과 함께 확인합니다.",
      nextCheckLabel: "오늘 13:00",
      tags: ["후속 확인", "보강 과제", "학습 리듬 회복"],
    },
    {
      id: "student-06",
      name: "오지훈",
      cohortName: "웹 풀스택 8기",
      stageLabel: "프론트엔드 5주차",
      ownerLabel: "박서연 교강사",
      priorityOrder: 6,
      riskLevel: "low",
      careSegment: "follow-up",
      currentStatus:
        "질문 유도 메시지 발송 후 회신 대기 중인 안정화 단계입니다.",
      latestSignal: "질문 유도 메시지 전송 완료",
      recentChange:
        "무응답에서 벗어나도록 구체 질문 3개를 보냈고 오늘 중 회신 여부를 확인합니다.",
      nextCheckLabel: "오늘 13:00",
      tags: ["후속 확인", "질문 유도", "회신 대기"],
    },
    {
      id: "student-07",
      name: "한세라",
      cohortName: "웹 풀스택 7기",
      stageLabel: "프론트엔드 6주차",
      ownerLabel: "운영팀 공유",
      priorityOrder: 7,
      riskLevel: "medium",
      careSegment: "watch",
      currentStatus:
        "개인 사정 메모가 있어 운영팀과 같이 추적해야 하는 학생입니다.",
      latestSignal: "운영 공유 메모 등록",
      recentChange:
        "집중력 저하와 출석 흔들림이 함께 보여 개인 사정과 학습 리듬을 같이 봐야 합니다.",
      nextCheckLabel: "내일 09:20",
      tags: ["운영 공유", "개인 사정", "관찰 유지"],
    },
    {
      id: "student-08",
      name: "윤도현",
      cohortName: "웹 풀스택 8기",
      stageLabel: "프론트엔드 5주차",
      ownerLabel: "박서연 교강사",
      priorityOrder: 8,
      riskLevel: "low",
      careSegment: "stable",
      currentStatus:
        "실습 참여와 과제 제출이 모두 안정적이라 주간 리포트 수준에서만 확인합니다.",
      latestSignal: "이번 주 실습 체크포인트 전부 완료",
      recentChange:
        "배열 메서드 체이닝에서 막히던 지점이 사라져 안정 그룹으로 이동했습니다.",
      nextCheckLabel: "금요일 주간 체크",
      tags: ["안정", "과제 정상", "실습 완료"],
    },
  ],
  initialStudentId: "student-01",
  studentDetails: [
    {
      studentId: "student-01",
      statusHeadline:
        "출석 하락과 과제 지연, 질문 무응답이 겹쳐 오늘 수업 전에 가장 먼저 개입해야 하는 학생입니다.",
      aiInterpretation:
        "이번 주 신호는 단순 과제 미제출보다 학습 리듬 이탈에 가깝습니다. 출석과 실습 참여가 흔들린 직후 질문 채널 반응이 사라졌고, 그 다음날 데일리 과제가 비었습니다.",
      coachFocus:
        "첫 대화는 의지 확인보다 현재 막힌 지점을 좁혀 묻는 방향이 좋습니다. 실습 첫 20분 안에 체크인하고 과제 범위를 작게 나눠 재진입 장벽을 낮춰야 합니다.",
      recommendedMessageDraft:
        "하린님, 어제 과제랑 오늘 수업 진입 흐름이 같이 흔들린 게 보여서 먼저 체크인 드려요. 오늘 첫 실습 20분 안에 잠깐 같이 막힌 지점만 정리해봅시다.",
      blockers: [
        "실습 참여 저하와 질문 무응답이 동시에 나타남",
        "과제 범위가 커 보이고 재진입 장벽이 높음",
        "피로 호소 메모가 있어 단순 독려만으로는 해결이 어려움",
      ],
      nextBestActions: [
        "09:40 전 체크인 메시지 발송",
        "첫 실습 20분 안에 1:1 확인 슬롯 확보",
        "오늘 과제 범위를 절반으로 다시 제안",
      ],
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
      careNotes: [
        {
          id: "student-01-note-01",
          label: "조교 메모",
          body: "어제 오후 실습에서 집중력이 평소보다 크게 떨어졌고, 스스로도 피로를 언급했습니다.",
          recordedAtLabel: "어제 17:10",
          authorLabel: "조교 김민지",
        },
        {
          id: "student-01-note-02",
          label: "이전 개입",
          body: "지난주에는 질문 유도 메시지에 반응했으나 이번 주는 회신이 끊겼습니다.",
          recordedAtLabel: "지난주 금요일 18:40",
          authorLabel: "박서연 교강사",
        },
      ],
    },
    {
      studentId: "student-02",
      statusHeadline:
        "상담 이후에도 보강 과제가 다시 밀려 범위 재설계와 일정 재합의가 필요한 후속 확인 단계입니다.",
      aiInterpretation:
        "문제는 수행 의지보다 과제 난도와 생활 리듬이 맞지 않는 데 있습니다. 같은 요구량을 유지하면 재실패가 반복될 가능성이 높습니다.",
      coachFocus:
        "과제 범위를 절반으로 잘라 다시 제안하고, 오늘 저녁 전까지 현실적인 제출 약속을 새로 합의해야 합니다.",
      recommendedMessageDraft:
        "준오님, 어제 약속한 범위가 아직 부담이 큰 것 같아요. 오늘 안에 끝낼 수 있는 최소 단위로 다시 쪼개서 같이 재설정해볼게요.",
      blockers: [
        "수면 부족 이슈가 있어 기존 계획 유지가 어려움",
        "과제 요구량이 현재 컨디션 대비 과함",
        "상담 이후 follow-up 간격이 길어지면 다시 끊길 가능성 높음",
      ],
      nextBestActions: [
        "보강 과제 범위를 절반으로 재제안",
        "운영팀 공유 메모 갱신",
        "오늘 18:00 전 재합의 결과 확인",
      ],
      timeline: [
        {
          id: "student-02-signal-01",
          type: "coaching-note",
          typeLabel: "상담 메모",
          title: "수면 부족 이슈 기록",
          summary:
            "상담 중 새벽 과제 수행으로 생활 리듬이 무너졌다는 내용을 남겼습니다.",
          occurredAtLabel: "04-06 오전 11:20",
        },
        {
          id: "student-02-signal-02",
          type: "assignment",
          typeLabel: "과제",
          title: "보강 과제 재제출 지연",
          summary: "재조정한 보강 과제도 마감 시점까지 제출되지 않았습니다.",
          occurredAtLabel: "04-06 오후 23:50",
        },
      ],
      careNotes: [
        {
          id: "student-02-note-01",
          label: "상담 요약",
          body: "과제 범위를 줄여도 스스로 진입 타이밍을 놓친다고 말했습니다.",
          recordedAtLabel: "어제 11:40",
          authorLabel: "박서연 교강사",
        },
      ],
    },
    {
      studentId: "student-03",
      statusHeadline:
        "실습 참여는 유지되지만 질문이 사라져 혼자 막히는 패턴이 강하게 보입니다.",
      aiInterpretation:
        "겉보기 참여도는 유지되지만 도움 요청이 끊긴 상태입니다. 늦게 발견될수록 과제 지연이나 이탈로 번질 가능성이 큽니다.",
      coachFocus:
        "오늘 수업 중 먼저 짧은 확인 질문을 배치하고, 수업 전에는 질문 유도형 메시지 초안을 보내두는 것이 좋습니다.",
      recommendedMessageDraft:
        "서후님, 요즘 질문이 줄어서 혼자 막히는 구간이 있는지 먼저 확인하고 싶어요. 오늘 수업 전에 10분만 짧게 흐름 점검해봅시다.",
      blockers: [
        "도움을 요청하지 않는 패턴이 반복됨",
        "코드 리뷰 요청이 끊겨 학습 상태를 읽기 어려움",
        "실습 참여도가 낮지는 않아 발견이 늦어질 수 있음",
      ],
      nextBestActions: [
        "질문 유도형 메시지 발송",
        "라이브 질문 시간에 먼저 호명",
        "코드 리뷰 요청 한 건을 오늘 안에 유도",
      ],
      timeline: [
        {
          id: "student-03-signal-01",
          type: "question",
          typeLabel: "질문",
          title: "질문 채널 최근 1주일 0건",
          summary:
            "이전에는 주 3회 이상 질문을 남기던 학생이 이번 주에는 질문 기록이 없습니다.",
          occurredAtLabel: "04-07 오전 08:00",
        },
      ],
      careNotes: [
        {
          id: "student-03-note-01",
          label: "조교 피드백",
          body: "실습 시간에는 참여하지만 막히는 순간에도 질문을 올리지 않는 모습이 보였습니다.",
          recordedAtLabel: "오늘 08:05",
          authorLabel: "조교 김민지",
        },
      ],
    },
    {
      studentId: "student-04",
      statusHeadline:
        "즉시 개입보다는 레이아웃 복구 막힘이 반복되는지 관찰하면서 짧은 체크인을 준비해야 합니다.",
      aiInterpretation:
        "수행 의지는 유지되지만 제출 직전까지 혼자 붙잡고 있는 패턴입니다. 질문 타이밍을 앞당기면 안정 그룹으로 돌아올 가능성이 있습니다.",
      coachFocus:
        "오늘은 직접 개입보다 질문 유도 문장을 던지고, 내일 아침 제출 시간을 다시 확인하는 정도가 적절합니다.",
      recommendedMessageDraft:
        "나윤님, 레이아웃 복구에서 막히는 구간이 있으면 마감 직전까지 혼자 보지 말고 중간에 한 번만 공유해주세요.",
      blockers: [
        "질문 타이밍이 항상 늦음",
        "과제 제출은 유지되지만 체력 소모가 큼",
        "명확한 위험 학생은 아니어서 개입 우선순위가 밀리기 쉬움",
      ],
      nextBestActions: ["질문 유도 문장 전달", "내일 아침 제출 시간 재확인"],
      timeline: [
        {
          id: "student-04-signal-01",
          type: "assignment",
          typeLabel: "과제",
          title: "마감 직전 제출 3회 연속",
          summary:
            "과제는 완료하지만 항상 마감 직전에 제출해 학습 스트레스가 누적되는 패턴입니다.",
          occurredAtLabel: "04-06 오후 23:54",
        },
      ],
      careNotes: [
        {
          id: "student-04-note-01",
          label: "관찰 메모",
          body: "질문 빈도가 낮아도 제출은 유지되어 당장 위험군으로 올리지는 않았습니다.",
          recordedAtLabel: "오늘 07:50",
          authorLabel: "박서연 교강사",
        },
      ],
    },
    {
      studentId: "student-05",
      statusHeadline:
        "과제 범위를 줄인 뒤 다시 리듬을 찾는 중이라 출석과 첫 제출만 확인하면 되는 상태입니다.",
      aiInterpretation:
        "강한 개입보다는 재진입 성공 여부를 빠르게 확인하는 follow-up 단계입니다.",
      coachFocus:
        "오늘은 추가 피드백보다 약속한 작은 단위를 실제로 제출했는지 확인하는 것이 우선입니다.",
      recommendedMessageDraft:
        "민서님, 어제 나눈 작은 단위 과제부터 오늘 안에 편하게 다시 시작해봅시다. 출석 후 진입만 확인할게요.",
      blockers: ["이전 과제 실패 경험으로 자신감이 낮아짐"],
      nextBestActions: ["오늘 출석 확인", "작은 단위 제출 여부 체크"],
      timeline: [
        {
          id: "student-05-signal-01",
          type: "coaching-note",
          typeLabel: "상담 메모",
          title: "보강 과제 범위 축소 합의",
          summary:
            "기존 과제를 작은 단위로 나누고 오늘 첫 제출만 확인하기로 합의했습니다.",
          occurredAtLabel: "04-06 오후 18:10",
        },
      ],
      careNotes: [
        {
          id: "student-05-note-01",
          label: "후속 계획",
          body: "오늘은 출석과 첫 제출만 확인하고, 추가 피드백은 내일로 미룹니다.",
          recordedAtLabel: "어제 18:20",
          authorLabel: "박서연 교강사",
        },
      ],
    },
    {
      studentId: "student-06",
      statusHeadline:
        "질문 유도 메시지 후 회신 대기 중인 안정화 단계라 응답 여부만 빠르게 체크하면 됩니다.",
      aiInterpretation:
        "무응답 패턴이 길어지지 않도록 짧은 follow-up만 있으면 되는 상태입니다.",
      coachFocus:
        "추가 개입보다 13:00 회신 여부 체크와 필요 시 한 번 더 짧게 핑하는 정도면 충분합니다.",
      recommendedMessageDraft:
        "지훈님, 오전 중에 어제 보낸 질문 중 막힌 것 하나만 편하게 답 주세요.",
      blockers: ["회신이 없으면 다시 무응답 패턴으로 돌아갈 수 있음"],
      nextBestActions: ["13:00 회신 확인", "무응답 시 한 번 더 짧게 리마인드"],
      timeline: [
        {
          id: "student-06-signal-01",
          type: "question",
          typeLabel: "질문",
          title: "질문 유도 메시지 발송",
          summary:
            "무응답 상태를 깨기 위해 구체 질문 3개를 담은 메시지를 보냈습니다.",
          occurredAtLabel: "04-06 오후 20:30",
        },
      ],
      careNotes: [
        {
          id: "student-06-note-01",
          label: "전송 기록",
          body: "메시지 발송 완료. 오전 회신 여부만 확인하면 됩니다.",
          recordedAtLabel: "어제 20:31",
          authorLabel: "박서연 교강사",
        },
      ],
    },
    {
      studentId: "student-07",
      statusHeadline:
        "개인 사정 메모가 있어 운영팀과 교강사가 함께 관찰해야 하는 학생입니다.",
      aiInterpretation:
        "학습 데이터만으로 판단하기보다 운영 맥락을 함께 봐야 하는 케이스입니다.",
      coachFocus:
        "오늘은 무리한 학습 독려보다 출석과 컨디션을 가볍게 확인하고 운영팀 공유를 유지하는 것이 적절합니다.",
      recommendedMessageDraft:
        "세라님, 오늘은 수업 진입만 무리 없이 되는지 먼저 확인할게요. 필요하면 운영팀과 일정 조정도 같이 도와드릴게요.",
      blockers: [
        "개인 사정으로 학습 리듬 변동 가능성 큼",
        "운영팀과 교강사 사이 정보가 끊기면 대응이 늦어질 수 있음",
      ],
      nextBestActions: ["오늘 출석 확인", "운영팀 공유 메모 유지"],
      timeline: [
        {
          id: "student-07-signal-01",
          type: "coaching-note",
          typeLabel: "상담 메모",
          title: "개인 사정 공유 메모 추가",
          summary:
            "학습 외부 요인으로 컨디션 변동이 있다는 메모가 운영팀에 공유되었습니다.",
          occurredAtLabel: "04-06 오후 16:00",
        },
      ],
      careNotes: [
        {
          id: "student-07-note-01",
          label: "운영 공유",
          body: "이번 주는 출석과 컨디션만 우선 확인하고, 추가 요구는 최소화하기로 했습니다.",
          recordedAtLabel: "어제 16:10",
          authorLabel: "운영팀 이수진",
        },
      ],
    },
    {
      studentId: "student-08",
      statusHeadline:
        "현재는 안정 그룹으로 이동해 주간 리포트 수준에서만 확인하면 되는 학생입니다.",
      aiInterpretation:
        "과거 막힘 지점을 통과해 안정 흐름으로 돌아왔고, 개별 개입 필요도는 낮습니다.",
      coachFocus:
        "별도 개입 없이 주간 리포트에만 포함하고, 같은 개념에서 다시 흔들리는지만 보면 됩니다.",
      recommendedMessageDraft:
        "도현님은 이번 주는 별도 체크인 없이 주간 리포트 수준에서만 확인합니다.",
      blockers: ["현재 특별한 막힘 없음"],
      nextBestActions: ["금요일 주간 체크만 유지"],
      timeline: [
        {
          id: "student-08-signal-01",
          type: "assignment",
          typeLabel: "과제",
          title: "실습 체크포인트 전부 완료",
          summary:
            "이번 주 실습 체크포인트를 모두 제시간에 완료해 안정 그룹으로 이동했습니다.",
          occurredAtLabel: "04-06 오후 21:10",
        },
      ],
      careNotes: [
        {
          id: "student-08-note-01",
          label: "상태 이동",
          body: "이번 주부터 안정 그룹으로 이동해 개별 follow-up을 종료했습니다.",
          recordedAtLabel: "어제 21:15",
          authorLabel: "박서연 교강사",
        },
      ],
    },
  ],
  todayActionBoard: [
    {
      id: "action-01",
      studentId: "student-01",
      title: "김하린 체크인 메시지 발송",
      summary:
        "수업 전 짧은 체크인으로 현재 막힌 지점을 좁혀 묻고 첫 실습 20분 안에 확인을 예약합니다.",
      dueLabel: "09:40 전",
      channelLabel: "슬랙 DM",
      ownerLabel: "박서연 교강사",
      status: "pending",
    },
    {
      id: "action-02",
      studentId: "student-02",
      title: "박준오 보강 과제 범위 재설계",
      summary:
        "오늘 안에 끝낼 수 있는 최소 범위로 다시 제안하고, 저녁 전 재합의 결과를 남깁니다.",
      dueLabel: "18:00 전",
      channelLabel: "상담 메모",
      ownerLabel: "박서연 교강사",
      status: "in-progress",
    },
    {
      id: "action-03",
      studentId: "student-03",
      title: "이서후 질문 유도형 체크인",
      summary:
        "수업 전에 메시지를 보내고 라이브 질문 시간에 먼저 짧게 호명합니다.",
      dueLabel: "14:20 전",
      channelLabel: "슬랙 + 라이브 수업",
      ownerLabel: "박서연 교강사",
      status: "pending",
    },
    {
      id: "action-04",
      studentId: "student-05",
      title: "정민서 첫 제출 확인",
      summary:
        "작게 나눈 과제의 첫 제출이 실제로 이뤄지는지만 확인하고 추가 압박은 주지 않습니다.",
      dueLabel: "13:00",
      channelLabel: "LMS",
      ownerLabel: "박서연 교강사",
      status: "done",
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
        "개인 사정으로 인한 학습 공백 가능성을 운영팀과 공유하고 이번 주 추적 대상으로 올렸습니다.",
      recordedAtLabel: "오늘 08:10 기록",
      nextCheckLabel: null,
    },
  ],
  weeklyReport: {
    summary:
      "이번 주에는 배열 메서드 체이닝, 비동기 흐름 이해, CSS 레이아웃 복구에서 반복 막힘이 나타났습니다.",
    coachMemo:
      "이번 화면은 숫자만 보여주는 대시보드가 아니라, 학생을 고르고 바로 개입 기록까지 이어지는 운영용 워크스페이스로 설계했습니다.",
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

export function getInstructorWorkspace(): InstructorWorkspaceResponse {
  return instructorWorkspace;
}
