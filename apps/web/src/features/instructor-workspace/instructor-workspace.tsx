"use client";

import { ApiClientError, createApiClient } from "@yeon/api-client";
import Link from "next/link";
import { startTransition, useDeferredValue, useEffect, useState } from "react";
import type {
  InstructorDashboardResponse,
  PriorityStudentCard,
} from "@yeon/api-contract";
import type {
  InstructorActionBoardItem,
  InstructorActionStatus,
  InstructorRiskLevel,
  InstructorWorkspaceResponse,
  LearningSignalEventType,
  StudentCareSegment,
  WorkspaceStudent,
  WorkspaceStudentDetail,
} from "@yeon/api-contract/instructor-workspace";

import styles from "./instructor-workspace.module.css";

const apiClient = createApiClient();

const segmentLabelMap: Record<StudentCareSegment, string> = {
  "needs-care": "즉시 케어",
  "follow-up": "후속 확인",
  watch: "관찰 유지",
  stable: "안정",
};

const riskLabelMap: Record<InstructorRiskLevel, string> = {
  high: "위험도 상",
  medium: "위험도 중",
  low: "위험도 하",
};

const actionStatusLabelMap: Record<InstructorActionStatus, string> = {
  pending: "대기",
  "in-progress": "진행 중",
  done: "완료",
};

const riskClassNameMap: Record<InstructorRiskLevel, string> = {
  high: styles.riskHigh,
  medium: styles.riskMedium,
  low: styles.riskLow,
};

const signalClassNameMap: Record<LearningSignalEventType, string> = {
  attendance: styles.signalAttendance,
  assignment: styles.signalAssignment,
  question: styles.signalQuestion,
  "coaching-note": styles.signalCoachingNote,
};

const actionStatusClassNameMap: Record<InstructorActionStatus, string> = {
  pending: styles.actionPending,
  "in-progress": styles.actionInProgress,
  done: styles.actionDone,
};

const actionPriorityRank: Record<InstructorActionStatus, number> = {
  "in-progress": 0,
  pending: 1,
  done: 2,
};

type InstructorWorkspaceProps = {
  dashboard: InstructorDashboardResponse;
  workspace: InstructorWorkspaceResponse;
};

type SegmentFilter = StudentCareSegment | "all";

type PriorityQueueEntry = {
  priorityCard: PriorityStudentCard;
  student: WorkspaceStudent;
  hasDetail: boolean;
};

type OverviewMetricCardProps = {
  label: string;
  value: string;
  description: string;
};

function OverviewMetricCard({
  label,
  value,
  description,
}: OverviewMetricCardProps) {
  return (
    <article className={styles.metricCard}>
      <p className={styles.metricLabel}>{label}</p>
      <p className={styles.metricValue}>{value}</p>
      <p className={styles.metricDescription}>{description}</p>
    </article>
  );
}

function getStudentMap(students: WorkspaceStudent[]) {
  return new Map(students.map((student) => [student.id, student]));
}

function getPriorityQueueEntries(
  priorityStudents: PriorityStudentCard[],
  students: WorkspaceStudent[],
  studentDetails: InstructorWorkspaceResponse["studentDetails"],
) {
  const studentMap = getStudentMap(students);
  const studentDetailIdSet = new Set(
    studentDetails.map((detail) => detail.studentId),
  );

  return priorityStudents.flatMap((priorityCard) => {
    const student = studentMap.get(priorityCard.id);

    if (!student) {
      return [];
    }

    const entry: PriorityQueueEntry = {
      priorityCard,
      student,
      hasDetail: studentDetailIdSet.has(student.id),
    };

    return [entry];
  });
}

function getStudentDetailMap(studentDetails: WorkspaceStudentDetail[]) {
  return new Map(studentDetails.map((detail) => [detail.studentId, detail]));
}

function getStudentActionMap(actionBoard: InstructorActionBoardItem[]) {
  return actionBoard.reduce<Map<string, InstructorActionBoardItem>>(
    (actionMap, actionItem) => {
      const currentItem = actionMap.get(actionItem.studentId);

      if (
        !currentItem ||
        actionPriorityRank[actionItem.status] <
          actionPriorityRank[currentItem.status]
      ) {
        actionMap.set(actionItem.studentId, actionItem);
      }

      return actionMap;
    },
    new Map<string, InstructorActionBoardItem>(),
  );
}

function getStudentNextAction(
  studentDetail: WorkspaceStudentDetail | undefined,
  actionItem: InstructorActionBoardItem | undefined,
) {
  return (
    studentDetail?.nextBestActions[0] ??
    actionItem?.summary ??
    "오늘 수업 전 현재 막힌 지점을 짧게 다시 확인합니다."
  );
}

function getSegmentCount(
  students: WorkspaceStudent[],
  segment: StudentCareSegment,
) {
  return students.filter((student) => student.careSegment === segment).length;
}

function matchesSearch(student: WorkspaceStudent, searchTerm: string) {
  if (!searchTerm) {
    return true;
  }

  const normalized = searchTerm.toLowerCase();
  const keywords = [
    student.name,
    student.cohortName,
    student.stageLabel,
    student.currentStatus,
    student.latestSignal,
    ...student.tags,
  ];

  return keywords.some((keyword) => keyword.toLowerCase().includes(normalized));
}

function formatCount(value: number, unit: string) {
  return `${String(value).padStart(2, "0")}${unit}`;
}

export function InstructorWorkspace({
  dashboard,
  workspace,
}: InstructorWorkspaceProps) {
  const [workspaceSnapshot, setWorkspaceSnapshot] = useState(workspace);
  const [students, setStudents] = useState(workspace.students);
  const [studentDetails, setStudentDetails] = useState(
    workspace.studentDetails,
  );
  const [todayActionBoard, setTodayActionBoard] = useState(
    workspace.todayActionBoard,
  );
  const [careHistory, setCareHistory] = useState(workspace.careHistory);
  const [selectedSegment, setSelectedSegment] = useState<SegmentFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(
    workspace.initialStudentId,
  );
  const [draftMessage, setDraftMessage] = useState("");
  const [draftNote, setDraftNote] = useState("");
  const [mutationMessage, setMutationMessage] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [isMutating, setIsMutating] = useState(false);
  const deferredSearchTerm = useDeferredValue(searchTerm.trim());

  const visibleStudents = students
    .filter((student) => {
      if (selectedSegment === "all") {
        return true;
      }

      return student.careSegment === selectedSegment;
    })
    .filter((student) => matchesSearch(student, deferredSearchTerm))
    .sort((left, right) => left.priorityOrder - right.priorityOrder);

  const studentMap = getStudentMap(students);
  const studentDetailMap = getStudentDetailMap(studentDetails);
  const studentActionMap = getStudentActionMap(todayActionBoard);
  const priorityQueueEntries = getPriorityQueueEntries(
    dashboard.priorityStudents,
    students,
    studentDetails,
  );
  const selectedStudent =
    studentMap.get(selectedStudentId) ?? visibleStudents[0] ?? students[0];
  const selectedStudentDetail = studentDetails.find(
    (detail) => detail.studentId === selectedStudent?.id,
  );
  const isSelectedStudentVisible =
    !selectedStudent ||
    visibleStudents.some((student) => student.id === selectedStudent.id);
  const heroFocusStudent =
    selectedStudent ??
    students.find(
      (student) => student.id === dashboard.highlightedStudentDetail.studentId,
    ) ??
    students[0];
  const heroFocusStudentDetail =
    selectedStudentDetail ??
    studentDetailMap.get(heroFocusStudent?.id ?? "") ??
    dashboard.highlightedStudentDetail;
  const needsCareCount = getSegmentCount(students, "needs-care");
  const pendingActionCount = todayActionBoard.filter(
    (item) => item.status !== "done",
  ).length;
  const completedActionCount = todayActionBoard.filter(
    (item) => item.status === "done",
  ).length;
  const focusConceptCount =
    workspaceSnapshot.weeklyReport.conceptFocuses.length;
  const displayedMetrics = dashboard.metrics.map((metric) => {
    switch (metric.label) {
      case "오늘 케어 학생 수":
        return {
          ...metric,
          value: formatCount(needsCareCount, "명"),
        };
      case "개입 대기":
        return {
          ...metric,
          value: formatCount(pendingActionCount, "건"),
        };
      case "반복 개념":
        return {
          ...metric,
          value: formatCount(focusConceptCount, "개"),
        };
      case "오늘 액션":
        return {
          ...metric,
          value: formatCount(todayActionBoard.length, "개"),
          description: `완료 ${completedActionCount}건 · 남은 액션 ${pendingActionCount}건`,
        };
      default:
        return metric;
    }
  });

  useEffect(() => {
    if (!selectedStudentDetail) {
      return;
    }

    setDraftMessage(selectedStudentDetail.recommendedMessageDraft);
    setDraftNote("");
  }, [
    selectedStudentDetail?.studentId,
    selectedStudentDetail?.recommendedMessageDraft,
  ]);

  useEffect(() => {
    if (!visibleStudents.length) {
      return;
    }

    const selectedStudentExists = students.some(
      (student) => student.id === selectedStudentId,
    );

    if (!selectedStudentExists) {
      startTransition(() => {
        setSelectedStudentId(visibleStudents[0].id);
      });
    }
  }, [selectedStudentId, students, visibleStudents]);

  function syncWorkspace(nextWorkspace: InstructorWorkspaceResponse) {
    setWorkspaceSnapshot(nextWorkspace);
    setStudents(nextWorkspace.students);
    setStudentDetails(nextWorkspace.studentDetails);
    setTodayActionBoard(nextWorkspace.todayActionBoard);
    setCareHistory(nextWorkspace.careHistory);
    setSelectedStudentId((current) =>
      nextWorkspace.students.some((student) => student.id === current)
        ? current
        : nextWorkspace.initialStudentId,
    );
  }

  function getMutationErrorMessage(error: unknown) {
    if (error instanceof ApiClientError) {
      return error.message;
    }

    return "저장 중 오류가 발생했습니다.";
  }

  async function runWorkspaceMutation(
    execute: () => Promise<{ workspace: InstructorWorkspaceResponse }>,
    successMessage: string,
  ) {
    setIsMutating(true);
    setMutationError(null);
    setMutationMessage(null);

    try {
      const { workspace: nextWorkspace } = await execute();

      syncWorkspace(nextWorkspace);
      setMutationMessage(successMessage);
    } catch (error) {
      setMutationError(getMutationErrorMessage(error));
    } finally {
      setIsMutating(false);
    }
  }

  async function handleSaveDraft() {
    if (!selectedStudent || !draftMessage.trim()) {
      return;
    }

    await runWorkspaceMutation(
      () =>
        apiClient.createInstructorWorkspaceNote({
          studentId: selectedStudent.id,
          label: "체크인 초안",
          body: draftMessage.trim(),
          authorLabel: workspaceSnapshot.workspace.coachName,
        }),
      "체크인 초안을 저장했습니다.",
    );
  }

  async function handleSaveNote() {
    if (!selectedStudent || !draftNote.trim()) {
      return;
    }

    await runWorkspaceMutation(
      () =>
        apiClient.createInstructorWorkspaceNote({
          studentId: selectedStudent.id,
          label: "교강사 메모",
          body: draftNote.trim(),
          authorLabel: workspaceSnapshot.workspace.coachName,
        }),
      "교강사 메모를 저장했습니다.",
    );
    setDraftNote("");
  }

  async function handleMoveToFollowUp() {
    if (!selectedStudent) {
      return;
    }

    await runWorkspaceMutation(
      () =>
        apiClient.updateInstructorWorkspaceStudentState(selectedStudent.id, {
          careSegment: "follow-up",
          currentStatus:
            "오늘 개입 완료. 다음 수업 전 follow-up으로 다시 확인합니다.",
          nextCheckLabel: "내일 10:00",
          statusHeadline:
            "오늘 개입을 기록했고, 다음 수업 전 다시 확인하는 후속 확인 단계로 이동했습니다.",
          coachFocus:
            "다음 확인 전까지는 과제 진입 여부와 수업 중 반응만 짧게 추적하면 됩니다.",
        }),
      "학생 상태를 후속 확인으로 이동했습니다.",
    );
  }

  async function handleActionComplete(actionId: string) {
    await runWorkspaceMutation(
      () =>
        apiClient.updateInstructorWorkspaceActionStatus(actionId, {
          status: "done",
        }),
      "오늘 액션 상태를 완료로 저장했습니다.",
    );
  }

  function handleActionFocus(action: InstructorActionBoardItem) {
    startTransition(() => {
      setSelectedStudentId(action.studentId);
    });
  }

  function handleStudentSelect(studentId: string) {
    startTransition(() => {
      setSelectedStudentId(studentId);
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>교강사 학생관리 워크스페이스</p>
            <h1 className={styles.heroTitle}>{workspaceSnapshot.headline}</h1>
            <p className={styles.heroSummary}>{workspaceSnapshot.summary}</p>
            <div className={styles.heroMetaList}>
              <span>{workspaceSnapshot.workspace.coachName}</span>
              <span>{workspaceSnapshot.workspace.organizationName}</span>
              <span>{workspaceSnapshot.workspace.focusWindowLabel}</span>
              <span>{workspaceSnapshot.generatedLabel}</span>
            </div>
            <div className={styles.heroActions}>
              <Link
                className={styles.primaryLink}
                href="/api/v1/instructor-workspace"
              >
                워크스페이스 JSON 보기
              </Link>
              <Link className={styles.secondaryLink} href="/contest">
                공모전 데모 화면 보기
              </Link>
            </div>
          </div>

          <div className={styles.heroAside}>
            <article className={styles.briefingPanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>
                    {dashboard.briefing.label}
                  </p>
                  <h2 className={styles.panelTitle}>
                    {dashboard.briefing.headline}
                  </h2>
                </div>
                <p className={styles.panelDescription}>
                  {dashboard.generatedLabel}
                </p>
              </div>
              <p className={styles.panelDescription}>
                {dashboard.briefing.summary}
              </p>
              <div className={styles.briefingActionList}>
                {dashboard.briefing.actionItems.map((item, index) => (
                  <article key={item} className={styles.briefingActionCard}>
                    <p
                      className={styles.actionStudentName}
                    >{`행동 ${index + 1}`}</p>
                    <p className={styles.detailBody}>{item}</p>
                  </article>
                ))}
              </div>
              <div className={styles.briefingFocusCard}>
                <p className={styles.actionStudentName}>지금 먼저 챙길 학생</p>
                <h3 className={styles.actionTitle}>
                  {heroFocusStudent.name} · {heroFocusStudent.cohortName}
                </h3>
                <p className={styles.detailBody}>
                  {heroFocusStudentDetail.statusHeadline}
                </p>
              </div>
            </article>

            <div className={styles.metricGrid}>
              {displayedMetrics.map((metric) => (
                <OverviewMetricCard
                  key={metric.label}
                  label={metric.label}
                  value={metric.value}
                  description={metric.description}
                />
              ))}
            </div>
          </div>
        </section>

        <section className={styles.workspaceGrid}>
          <section className={styles.queuePanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>학생 큐</p>
                <h2 className={styles.panelTitle}>
                  우선순위 학생과 전체 학생 탐색을 같은 패널에서 정리합니다
                </h2>
              </div>
              <p className={styles.panelDescription}>
                상단 고정 큐는 오늘 먼저 개입할 학생을, 아래 탐색 영역은 전체
                학생 검색과 세그먼트 필터를 담당합니다.
              </p>
            </div>

            <div className={styles.priorityQueueBlock}>
              <div className={styles.queueSubsectionHeader}>
                <div>
                  <p className={styles.panelEyebrow}>우선순위 학생 큐</p>
                  <h3 className={styles.sectionTitle}>
                    위험 이유와 다음 행동을 카드 한 장에서 바로 닫습니다
                  </h3>
                </div>
                <p className={styles.panelDescription}>
                  카드를 누르면 상세 패널과 오늘 액션 보드가 같은 학생 기준으로
                  바로 연결됩니다.
                </p>
              </div>

              <div className={styles.priorityQueueList}>
                {priorityQueueEntries.map(
                  ({ priorityCard, student, hasDetail }) => {
                    const studentAction = studentActionMap.get(student.id);
                    const isActive = selectedStudent?.id === student.id;

                    return (
                      <button
                        key={priorityCard.id}
                        className={`${styles.priorityQueueCard} ${
                          isActive ? styles.priorityQueueCardActive : ""
                        }`}
                        type="button"
                        aria-pressed={isActive}
                        onClick={() => {
                          handleStudentSelect(student.id);
                        }}
                      >
                        <div className={styles.priorityQueueCardHeader}>
                          <div>
                            <div className={styles.studentCardMeta}>
                              <span className={styles.priorityBadge}>
                                우선 {priorityCard.priorityOrder}
                              </span>
                              <span className={styles.cohortLabel}>
                                {priorityCard.cohortName}
                              </span>
                              {isActive ? (
                                <span className={styles.prioritySelectionChip}>
                                  현재 상세 확인 중
                                </span>
                              ) : null}
                            </div>
                            <h3 className={styles.studentName}>
                              {priorityCard.name}
                            </h3>
                            <p className={styles.priorityStage}>
                              {student.stageLabel} · {student.ownerLabel}
                            </p>
                          </div>
                          <div className={styles.studentBadges}>
                            <span
                              className={`${styles.riskBadge} ${riskClassNameMap[priorityCard.riskLevel]}`}
                            >
                              {riskLabelMap[priorityCard.riskLevel]}
                            </span>
                            <span className={styles.segmentBadge}>
                              {segmentLabelMap[priorityCard.careSegment]}
                            </span>
                          </div>
                        </div>

                        <dl className={styles.priorityQueueFacts}>
                          <div
                            className={`${styles.studentFactCard} ${styles.studentFactCardEmphasis}`}
                          >
                            <div className={styles.studentFactHeader}>
                              <dt>위험 이유</dt>
                            </div>
                            <dd>
                              <span className={styles.studentFactLead}>
                                {student.latestSignal}
                              </span>
                              <span className={styles.studentFactBody}>
                                {priorityCard.riskSummary}
                              </span>
                            </dd>
                          </div>
                          <div className={styles.studentFactCard}>
                            <div className={styles.studentFactHeader}>
                              <dt>최근 변화</dt>
                            </div>
                            <dd className={styles.studentFactBody}>
                              {priorityCard.recentChange}
                            </dd>
                          </div>
                          <div className={styles.studentFactCard}>
                            <div className={styles.studentFactHeader}>
                              <dt>다음 행동</dt>
                              {studentAction ? (
                                <span
                                  className={`${styles.actionStatus} ${actionStatusClassNameMap[studentAction.status]}`}
                                >
                                  {actionStatusLabelMap[studentAction.status]}
                                </span>
                              ) : null}
                            </div>
                            <dd className={styles.studentFactBody}>
                              {priorityCard.recommendedAction}
                            </dd>
                          </div>
                          <div
                            className={`${styles.studentFactCard} ${styles.studentFactCardCompact}`}
                          >
                            <div className={styles.studentFactHeader}>
                              <dt>다음 확인</dt>
                            </div>
                            <dd>
                              <span className={styles.studentFactTime}>
                                {priorityCard.nextCheckLabel}
                              </span>
                            </dd>
                          </div>
                        </dl>

                        <div className={styles.priorityQueueFooter}>
                          <div className={styles.tagList}>
                            {priorityCard.tags.map((tag) => (
                              <span key={tag} className={styles.tagChip}>
                                {tag}
                              </span>
                            ))}
                          </div>
                          <p className={styles.priorityQueueFootnote}>
                            {hasDetail
                              ? "상세 패널과 오늘 액션 보드가 함께 연결됩니다."
                              : "상세 신호는 준비 중이며 큐 우선순위는 먼저 확인할 수 있습니다."}
                          </p>
                        </div>
                      </button>
                    );
                  },
                )}
              </div>
            </div>

            <div className={styles.queueSubsectionHeader}>
              <div>
                <p className={styles.panelEyebrow}>전체 학생 탐색</p>
                <h3 className={styles.sectionTitle}>
                  세그먼트와 검색으로 학생함을 다시 좁힙니다
                </h3>
              </div>
              <p className={styles.panelDescription}>
                우선순위 큐와 별개로 전체 학생을 탐색해 다른 학생 상세도 바로 열
                수 있습니다.
              </p>
            </div>

            <div className={styles.queueToolbar}>
              <div className={styles.segmentChips} aria-label="학생 세그먼트">
                <button
                  className={`${styles.segmentChip} ${
                    selectedSegment === "all" ? styles.segmentChipActive : ""
                  }`}
                  type="button"
                  aria-pressed={selectedSegment === "all"}
                  onClick={() => {
                    startTransition(() => {
                      setSelectedSegment("all");
                    });
                  }}
                >
                  전체
                  <span className={styles.segmentChipCount}>
                    {students.length}
                  </span>
                </button>
                {(["needs-care", "follow-up", "watch", "stable"] as const).map(
                  (segment) => (
                    <button
                      key={segment}
                      className={`${styles.segmentChip} ${
                        selectedSegment === segment
                          ? styles.segmentChipActive
                          : ""
                      }`}
                      type="button"
                      aria-pressed={selectedSegment === segment}
                      onClick={() => {
                        startTransition(() => {
                          setSelectedSegment(segment);
                        });
                      }}
                    >
                      {segmentLabelMap[segment]}
                      <span className={styles.segmentChipCount}>
                        {getSegmentCount(students, segment)}
                      </span>
                    </button>
                  ),
                )}
              </div>

              <label className={styles.searchField}>
                <span className={styles.searchLabel}>학생 검색</span>
                <input
                  className={styles.searchInput}
                  type="search"
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                  }}
                  placeholder="이름, 코호트, 태그 검색"
                />
              </label>
            </div>

            {!isSelectedStudentVisible ? (
              <p className={styles.queueFilterNotice}>
                현재 상세 패널은 필터 결과 밖 학생을 유지하고 있습니다. 목록에서
                다시 보이게 하려면 세그먼트나 검색어를 조정하세요.
              </p>
            ) : null}

            <div className={styles.studentList}>
              {visibleStudents.length ? (
                visibleStudents.map((student) => {
                  const studentDetail = studentDetailMap.get(student.id);
                  const studentAction = studentActionMap.get(student.id);
                  const nextActionLabel = getStudentNextAction(
                    studentDetail,
                    studentAction,
                  );

                  return (
                    <button
                      key={student.id}
                      className={`${styles.studentCard} ${
                        selectedStudent?.id === student.id
                          ? styles.studentCardActive
                          : ""
                      }`}
                      type="button"
                      aria-pressed={selectedStudent?.id === student.id}
                      onClick={() => {
                        handleStudentSelect(student.id);
                      }}
                    >
                      <div className={styles.studentCardHeader}>
                        <div>
                          <div className={styles.studentCardMeta}>
                            <span className={styles.priorityBadge}>
                              우선 {student.priorityOrder}
                            </span>
                            <span className={styles.cohortLabel}>
                              {student.cohortName}
                            </span>
                          </div>
                          <h3 className={styles.studentName}>{student.name}</h3>
                        </div>
                        <div className={styles.studentBadges}>
                          <span
                            className={`${styles.riskBadge} ${riskClassNameMap[student.riskLevel]}`}
                          >
                            {riskLabelMap[student.riskLevel]}
                          </span>
                          <span className={styles.segmentBadge}>
                            {segmentLabelMap[student.careSegment]}
                          </span>
                        </div>
                      </div>

                      <dl className={styles.studentFacts}>
                        <div
                          className={`${styles.studentFactCard} ${styles.studentFactCardEmphasis}`}
                        >
                          <div className={styles.studentFactHeader}>
                            <dt>위험 이유</dt>
                          </div>
                          <dd>
                            <span className={styles.studentFactLead}>
                              {student.latestSignal}
                            </span>
                            <span className={styles.studentFactBody}>
                              {student.currentStatus}
                            </span>
                          </dd>
                        </div>
                        <div className={styles.studentFactCard}>
                          <div className={styles.studentFactHeader}>
                            <dt>최근 변화</dt>
                          </div>
                          <dd className={styles.studentFactBody}>
                            {student.recentChange}
                          </dd>
                        </div>
                        <div className={styles.studentFactCard}>
                          <div className={styles.studentFactHeader}>
                            <dt>다음 행동</dt>
                            {studentAction ? (
                              <span
                                className={`${styles.actionStatus} ${actionStatusClassNameMap[studentAction.status]}`}
                              >
                                {actionStatusLabelMap[studentAction.status]}
                              </span>
                            ) : null}
                          </div>
                          <dd className={styles.studentFactBody}>
                            {nextActionLabel}
                          </dd>
                        </div>
                        <div
                          className={`${styles.studentFactCard} ${styles.studentFactCardCompact}`}
                        >
                          <div className={styles.studentFactHeader}>
                            <dt>다음 확인</dt>
                          </div>
                          <dd>
                            <span className={styles.studentFactTime}>
                              {student.nextCheckLabel}
                            </span>
                          </dd>
                        </div>
                      </dl>

                      <div className={styles.studentFooter}>
                        <div className={styles.tagList}>
                          {student.tags.map((tag) => (
                            <span key={tag} className={styles.tagChip}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <article className={styles.emptyState}>
                  <p className={styles.panelEyebrow}>검색 결과 없음</p>
                  <h3 className={styles.emptyStateTitle}>
                    현재 조건에 맞는 학생이 없습니다
                  </h3>
                  <p className={styles.panelDescription}>
                    세그먼트나 검색어를 조정해 다른 학생을 확인하세요.
                  </p>
                </article>
              )}
            </div>
          </section>

          <section className={styles.detailPanel}>
            {selectedStudent && selectedStudentDetail ? (
              <>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>학생 상세</p>
                    <h2 className={styles.panelTitle}>
                      {selectedStudent.name} · {selectedStudent.cohortName}
                    </h2>
                  </div>
                  <div className={styles.studentBadges}>
                    <span
                      className={`${styles.riskBadge} ${riskClassNameMap[selectedStudent.riskLevel]}`}
                    >
                      {riskLabelMap[selectedStudent.riskLevel]}
                    </span>
                    <span className={styles.segmentBadge}>
                      {segmentLabelMap[selectedStudent.careSegment]}
                    </span>
                  </div>
                </div>

                <p className={styles.detailHeadline}>
                  {selectedStudentDetail.statusHeadline}
                </p>

                <div className={styles.detailInsightGrid}>
                  <article className={styles.detailCard}>
                    <p className={styles.detailLabel}>AI 해석</p>
                    <p className={styles.detailBody}>
                      {selectedStudentDetail.aiInterpretation}
                    </p>
                  </article>
                  <article className={styles.detailCard}>
                    <p className={styles.detailLabel}>개입 포인트</p>
                    <p className={styles.detailBody}>
                      {selectedStudentDetail.coachFocus}
                    </p>
                  </article>
                </div>

                <div className={styles.detailColumns}>
                  <section className={styles.detailSection}>
                    <div className={styles.detailSectionHeader}>
                      <div>
                        <p className={styles.panelEyebrow}>학습 신호</p>
                        <h3 className={styles.sectionTitle}>
                          개입 근거 타임라인
                        </h3>
                      </div>
                      <p className={styles.detailMeta}>
                        {selectedStudent.stageLabel}
                      </p>
                    </div>
                    <ol className={styles.timelineList}>
                      {selectedStudentDetail.timeline.map((event) => (
                        <li key={event.id} className={styles.timelineItem}>
                          <span
                            className={`${styles.timelineBadge} ${signalClassNameMap[event.type]}`}
                          >
                            {event.typeLabel}
                          </span>
                          <div className={styles.timelineContent}>
                            <p className={styles.timelineTime}>
                              {event.occurredAtLabel}
                            </p>
                            <p className={styles.timelineTitle}>
                              {event.title}
                            </p>
                            <p className={styles.detailBody}>{event.summary}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </section>

                  <section className={styles.detailSection}>
                    <div className={styles.detailSectionHeader}>
                      <div>
                        <p className={styles.panelEyebrow}>즉시 실행</p>
                        <h3 className={styles.sectionTitle}>
                          메시지 초안과 메모를 바로 남깁니다
                        </h3>
                      </div>
                      <p className={styles.detailMeta}>
                        {selectedStudent.ownerLabel}
                      </p>
                    </div>

                    <div className={styles.checklistCard}>
                      <p className={styles.detailLabel}>막힘 요인</p>
                      <ul className={styles.pointList}>
                        {selectedStudentDetail.blockers.map((blocker) => (
                          <li key={blocker}>{blocker}</li>
                        ))}
                      </ul>
                    </div>

                    <div className={styles.checklistCard}>
                      <p className={styles.detailLabel}>다음 행동</p>
                      <ul className={styles.pointList}>
                        {selectedStudentDetail.nextBestActions.map((action) => (
                          <li key={action}>{action}</li>
                        ))}
                      </ul>
                    </div>

                    {mutationMessage ? (
                      <p className={styles.mutationNotice}>{mutationMessage}</p>
                    ) : null}
                    {mutationError ? (
                      <p className={styles.mutationError}>{mutationError}</p>
                    ) : null}

                    <label className={styles.editorField}>
                      <span className={styles.editorLabel}>
                        체크인 메시지 초안
                      </span>
                      <textarea
                        className={styles.editorTextarea}
                        value={draftMessage}
                        onChange={(event) => {
                          setDraftMessage(event.target.value);
                        }}
                        rows={5}
                      />
                    </label>
                    <div className={styles.inlineActions}>
                      <button
                        className={styles.primaryButton}
                        type="button"
                        disabled={isMutating}
                        onClick={handleSaveDraft}
                      >
                        {isMutating ? "저장 중..." : "초안 저장"}
                      </button>
                      <button
                        className={styles.secondaryButton}
                        type="button"
                        disabled={isMutating}
                        onClick={handleMoveToFollowUp}
                      >
                        후속 확인으로 이동
                      </button>
                    </div>

                    <label className={styles.editorField}>
                      <span className={styles.editorLabel}>교강사 메모</span>
                      <textarea
                        className={styles.editorTextarea}
                        value={draftNote}
                        onChange={(event) => {
                          setDraftNote(event.target.value);
                        }}
                        rows={4}
                        placeholder="이번 수업에서 확인할 포인트나 운영 공유 메모를 남깁니다."
                      />
                    </label>
                    <button
                      className={styles.secondaryButton}
                      type="button"
                      disabled={isMutating}
                      onClick={handleSaveNote}
                    >
                      메모 저장
                    </button>
                  </section>
                </div>

                <section className={styles.detailSection}>
                  <div className={styles.detailSectionHeader}>
                    <div>
                      <p className={styles.panelEyebrow}>최근 기록</p>
                      <h3 className={styles.sectionTitle}>학생별 개입 로그</h3>
                    </div>
                    <p className={styles.detailMeta}>
                      {selectedStudent.nextCheckLabel} 재확인 예정
                    </p>
                  </div>
                  <div className={styles.noteList}>
                    {selectedStudentDetail.careNotes.map((note) => (
                      <article key={note.id} className={styles.noteCard}>
                        <div className={styles.noteHeader}>
                          <p className={styles.noteLabel}>{note.label}</p>
                          <p className={styles.noteMeta}>
                            {note.recordedAtLabel} · {note.authorLabel}
                          </p>
                        </div>
                        <p className={styles.detailBody}>{note.body}</p>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            ) : null}
          </section>

          <aside className={styles.sideColumn}>
            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>오늘 액션 보드</p>
                  <h2 className={styles.panelTitle}>
                    수업 전 끝낼 행동을 큐로 관리합니다
                  </h2>
                </div>
              </div>
              <div className={styles.actionList}>
                {todayActionBoard.map((action) => {
                  const student = studentMap.get(action.studentId);

                  return (
                    <article key={action.id} className={styles.actionCard}>
                      <div className={styles.actionCardHeader}>
                        <div>
                          <p className={styles.actionStudentName}>
                            {student?.name ?? "학생"}
                          </p>
                          <h3 className={styles.actionTitle}>{action.title}</h3>
                        </div>
                        <span
                          className={`${styles.actionStatus} ${actionStatusClassNameMap[action.status]}`}
                        >
                          {actionStatusLabelMap[action.status]}
                        </span>
                      </div>
                      <p className={styles.detailBody}>{action.summary}</p>
                      <div className={styles.actionMetaList}>
                        <span>{action.dueLabel}</span>
                        <span>{action.channelLabel}</span>
                        <span>{action.ownerLabel}</span>
                      </div>
                      <div className={styles.inlineActions}>
                        <button
                          className={styles.secondaryButton}
                          type="button"
                          disabled={isMutating}
                          onClick={() => {
                            handleActionFocus(action);
                          }}
                        >
                          학생 보기
                        </button>
                        <button
                          className={styles.primaryButton}
                          type="button"
                          disabled={action.status === "done" || isMutating}
                          onClick={() => {
                            handleActionComplete(action.id);
                          }}
                        >
                          완료 처리
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>코호트 상태</p>
                  <h2 className={styles.panelTitle}>
                    반 단위 리스크를 같이 봅니다
                  </h2>
                </div>
              </div>
              <div className={styles.cohortGrid}>
                {workspaceSnapshot.cohorts.map((cohort) => (
                  <article key={cohort.id} className={styles.cohortCard}>
                    <p className={styles.cohortStage}>{cohort.stageLabel}</p>
                    <h3 className={styles.cohortTitle}>{cohort.name}</h3>
                    <p className={styles.detailBody}>{cohort.agenda}</p>
                    <div className={styles.cohortStats}>
                      <span>학생 {cohort.studentCount}명</span>
                      <span>즉시 케어 {cohort.needsCareCount}명</span>
                      <span>후속 확인 {cohort.followUpCount}명</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>최근 개입 기록</p>
                  <h2 className={styles.panelTitle}>
                    운영 로그가 끊기지 않게 유지합니다
                  </h2>
                </div>
              </div>
              <div className={styles.historyList}>
                {careHistory.map((entry) => (
                  <article
                    key={`${entry.studentName}-${entry.actionLabel}-${entry.recordedAtLabel}`}
                    className={styles.historyCard}
                  >
                    <p className={styles.historyTitle}>
                      {entry.studentName} · {entry.actionLabel}
                    </p>
                    <p className={styles.detailBody}>{entry.outcome}</p>
                    <p className={styles.historyMeta}>
                      {entry.recordedAtLabel}
                      {entry.nextCheckLabel
                        ? ` · 다음 확인 ${entry.nextCheckLabel}`
                        : ""}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            <section className={styles.sidePanel}>
              <div className={styles.panelHeader}>
                <div>
                  <p className={styles.panelEyebrow}>주간 포커스</p>
                  <h2 className={styles.panelTitle}>
                    반 전체 흐름도 같이 관리합니다
                  </h2>
                </div>
              </div>
              <p className={styles.detailBody}>
                {workspaceSnapshot.weeklyReport.summary}
              </p>
              <div className={styles.checklistCard}>
                <p className={styles.detailLabel}>오늘 확인할 포인트</p>
                <ul className={styles.pointList}>
                  {workspaceSnapshot.weeklyReport.todayFocus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className={styles.focusList}>
                {workspaceSnapshot.weeklyReport.conceptFocuses.map((focus) => (
                  <article key={focus.concept} className={styles.focusCard}>
                    <p className={styles.focusMetric}>
                      {focus.concept} · {focus.affectedStudentCount}명
                    </p>
                    <p className={styles.detailBody}>{focus.reason}</p>
                  </article>
                ))}
              </div>
              <p className={styles.coachMemo}>
                {workspaceSnapshot.weeklyReport.coachMemo}
              </p>
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
}
