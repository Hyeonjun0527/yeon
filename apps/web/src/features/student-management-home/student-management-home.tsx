"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type {
  InstructorDashboardResponse,
  InstructorRiskLevel,
  LearningSignalEventType,
  PriorityStudentCard,
  StudentCareSegment,
} from "@yeon/api-contract";

import type { ContestOverview } from "@/lib/contest-overview";

import styles from "./student-management-home.module.css";

type StudentManagementHomeProps = {
  overview: ContestOverview;
  dashboard: InstructorDashboardResponse;
  initialScenario?: string;
};

type StudentManagementScenario =
  | "live"
  | "loading"
  | "empty"
  | "error"
  | "missing";

type StatePanelProps = {
  label: string;
  title: string;
  body: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
  hints: string[];
  compact?: boolean;
};

const riskLevelLabelMap: Record<InstructorRiskLevel, string> = {
  high: "위험도 상",
  medium: "위험도 중",
  low: "위험도 하",
};

const careSegmentLabelMap: Record<StudentCareSegment, string> = {
  "needs-care": "즉시 케어",
  "follow-up": "후속 확인",
  watch: "관찰 유지",
  stable: "안정",
};

const riskLevelClassNameMap: Record<InstructorRiskLevel, string> = {
  high: styles.riskHigh,
  medium: styles.riskMedium,
  low: styles.riskLow,
};

const signalTypeClassNameMap: Record<LearningSignalEventType, string> = {
  attendance: styles.signalAttendance,
  assignment: styles.signalAssignment,
  question: styles.signalQuestion,
  "coaching-note": styles.signalCoachingNote,
};

function normalizeScenario(value?: string): StudentManagementScenario {
  switch (value) {
    case "loading":
    case "empty":
    case "error":
    case "missing":
      return value;
    default:
      return "live";
  }
}

function buildStatePanelCopy(
  scenario: Exclude<StudentManagementScenario, "live">,
): Omit<StatePanelProps, "compact"> {
  switch (scenario) {
    case "loading":
      return {
        label: "로딩 상태",
        title: "학생 신호와 오늘 브리핑을 다시 불러오는 중입니다.",
        body: "수업 전 30분 안에 바로 움직일 수 있도록 핵심 카드만 먼저 고정하고, 상세 신호와 케어 이력은 이어서 채웁니다.",
        primaryHref: "/student-management",
        primaryLabel: "기본 화면 보기",
        secondaryHref: "/api/v1/instructor-dashboard",
        secondaryLabel: "API JSON 확인",
        hints: [
          "브리핑, 우선 학생 큐, 상세 패널 순서로 체감 속도를 맞춥니다.",
          "모바일에서는 한 열 구조와 44px 이상 터치 타깃을 유지합니다.",
        ],
      };
    case "empty":
      return {
        label: "비어 있음",
        title: "아직 오늘 챙길 학생 신호가 없습니다.",
        body: "학생함이 비어 있을 때는 빈 여백을 보여주지 않고, 언제 어떤 신호가 들어오면 큐가 채워지는지와 다음 행동을 먼저 안내합니다.",
        primaryHref: "/student-management",
        primaryLabel: "기본 화면으로 돌아가기",
        secondaryHref: "/api/v1/instructor-dashboard",
        secondaryLabel: "현재 API 확인",
        hints: [
          "출석, 과제, 질문, 상담 메모 중 하나라도 들어오면 우선 학생 큐가 다시 열립니다.",
          "운영팀이 아직 동기화를 끝내지 않았다면 오전 브리핑 이후 다시 새로고침합니다.",
        ],
      };
    case "error":
      return {
        label: "API 실패",
        title: "대시보드 데이터를 불러오지 못했습니다.",
        body: "실패 상태에서는 원인을 숨기지 않고 재시도 CTA와 원본 JSON 확인 경로를 함께 둬 교강사가 바로 복구 동선을 탈 수 있게 합니다.",
        primaryHref: "/student-management",
        primaryLabel: "다시 시도하기",
        secondaryHref: "/api/v1/instructor-dashboard",
        secondaryLabel: "응답 계약 확인",
        hints: [
          "실패 메시지는 학생에게 책임을 돌리지 않고 시스템 상태를 분명히 설명합니다.",
          "Primary CTA는 항상 재시도 또는 정상 화면 복귀입니다.",
        ],
      };
    case "missing":
      return {
        label: "데이터 누락",
        title: "학생 상세 패널을 만들 핵심 신호가 빠져 있습니다.",
        body: "카드 목록은 있지만 타임라인이나 개입 근거가 누락되면, 억지로 빈 패널을 채우지 않고 어떤 데이터가 빠졌는지와 확인 경로를 먼저 보여줍니다.",
        primaryHref: "/student-management",
        primaryLabel: "정상 학생 보기",
        secondaryHref: "/api/v1/instructor-dashboard",
        secondaryLabel: "누락 데이터 확인",
        hints: [
          "지금은 상단 기준 학생 1명만 상세 신호와 타임라인이 연결되어 있습니다.",
          "다른 학생을 눌렀을 때는 누락 상태 패널로 안전하게 떨어집니다.",
        ],
      };
  }
}

function StatePanel({
  label,
  title,
  body,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  hints,
  compact = false,
}: StatePanelProps) {
  return (
    <article
      className={`${styles.statePanel} ${compact ? styles.statePanelCompact : ""}`}
    >
      <p className={styles.stateLabel}>{label}</p>
      <h2 className={styles.stateTitle}>{title}</h2>
      <p className={styles.stateBody}>{body}</p>
      <div className={styles.stateActionRow}>
        <Link className={styles.primaryAction} href={primaryHref}>
          {primaryLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link className={styles.secondaryAction} href={secondaryHref}>
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
      <div className={styles.stateHintList}>
        {hints.map((hint) => (
          <p key={hint} className={styles.stateHintItem}>
            {hint}
          </p>
        ))}
      </div>
    </article>
  );
}

function getSelectedStudent(
  priorityStudents: PriorityStudentCard[],
  selectedStudentId: string,
) {
  return (
    priorityStudents.find((student) => student.id === selectedStudentId) ??
    priorityStudents[0]
  );
}

export function StudentManagementHome({
  overview,
  dashboard,
  initialScenario,
}: StudentManagementHomeProps) {
  const router = useRouter();
  const [isRefreshing, startRefresh] = useTransition();
  const [selectedStudentId, setSelectedStudentId] = useState(
    dashboard.highlightedStudentDetail.studentId,
  );
  const scenario = normalizeScenario(initialScenario);
  const priorityStudents = [...dashboard.priorityStudents].sort(
    (left, right) => left.priorityOrder - right.priorityOrder,
  );
  const selectedStudent = getSelectedStudent(
    priorityStudents,
    selectedStudentId,
  );
  const selectedDetail =
    selectedStudent?.id === dashboard.highlightedStudentDetail.studentId
      ? dashboard.highlightedStudentDetail
      : undefined;

  function handleRefresh() {
    startRefresh(() => {
      router.refresh();
    });
  }

  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>{overview.category}</p>
            <div className={styles.heroTitleRow}>
              <h1 className={styles.heroTitle}>학생관리 워크스페이스</h1>
              {scenario !== "live" ? (
                <span className={styles.previewBadge}>
                  {buildStatePanelCopy(scenario).label}
                </span>
              ) : null}
            </div>
            <p className={styles.heroSummary}>{overview.summary}</p>
            <div className={styles.chipRow}>
              {overview.targetUsers.map((user) => (
                <span key={user} className={styles.chip}>
                  {user}
                </span>
              ))}
            </div>
          </div>

          <div className={styles.heroMetaGrid}>
            <article className={styles.heroMetaCard}>
              <p className={styles.metaLabel}>오늘 아침 브리핑</p>
              <h2 className={styles.metaTitle}>
                {dashboard.briefing.headline}
              </h2>
              <p className={styles.metaBody}>{dashboard.briefing.summary}</p>
            </article>
            <article className={styles.heroMetaCard}>
              <p className={styles.metaLabel}>갱신 기준</p>
              <h2 className={styles.metaTitle}>{dashboard.generatedLabel}</h2>
              <p className={styles.metaBody}>
                수업 전 30분 안에 누구를 먼저 챙길지 같은 화면에서 닫습니다.
              </p>
            </article>
          </div>

          <div className={styles.heroActions}>
            <button
              className={styles.primaryAction}
              onClick={handleRefresh}
              type="button"
            >
              {isRefreshing ? "새로고침 중..." : "오늘 브리핑 새로고침"}
            </button>
            <Link
              className={styles.secondaryAction}
              href="/api/v1/instructor-dashboard"
            >
              학생함 API 보기
            </Link>
          </div>
        </section>

        {scenario !== "live" ? (
          <section className={styles.stateSection}>
            <StatePanel {...buildStatePanelCopy(scenario)} />
          </section>
        ) : (
          <>
            <section className={styles.metricGrid}>
              {dashboard.metrics.map((metric) => (
                <article key={metric.label} className={styles.metricCard}>
                  <p className={styles.metricLabel}>{metric.label}</p>
                  <p className={styles.metricValue}>{metric.value}</p>
                  <p className={styles.metricBody}>{metric.description}</p>
                </article>
              ))}
            </section>

            <section className={styles.briefingGrid}>
              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>
                      {dashboard.briefing.label}
                    </p>
                    <h2 className={styles.panelTitle}>오늘 바로 실행할 행동</h2>
                  </div>
                  <p className={styles.panelMeta}>{dashboard.generatedLabel}</p>
                </div>
                <div className={styles.actionChecklist}>
                  {dashboard.briefing.actionItems.map((item, index) => (
                    <p key={item} className={styles.actionItem}>
                      <span
                        className={styles.actionOrder}
                      >{`행동 ${index + 1}`}</span>
                      <span>{item}</span>
                    </p>
                  ))}
                </div>
              </article>

              <article className={styles.panel}>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>학생 세그먼트</p>
                    <h2 className={styles.panelTitle}>오늘 큐를 여는 기준</h2>
                  </div>
                  <p className={styles.panelMeta}>상태별 밀도 요약</p>
                </div>
                <div className={styles.segmentGrid}>
                  {dashboard.segments.map((segment) => (
                    <article key={segment.key} className={styles.segmentCard}>
                      <p className={styles.segmentLabel}>{segment.label}</p>
                      <p className={styles.segmentCount}>{segment.count}명</p>
                      <p className={styles.segmentBody}>
                        {segment.description}
                      </p>
                    </article>
                  ))}
                </div>
              </article>
            </section>

            <section className={styles.contentGrid}>
              <div className={styles.mainColumn}>
                <article className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <p className={styles.panelEyebrow}>우선순위 학생 큐</p>
                      <h2 className={styles.panelTitle}>
                        누가 왜 먼저 케어 대상인지 카드 한 장에서 닫습니다
                      </h2>
                    </div>
                    <p className={styles.panelMeta}>우선 1부터 순서대로 확인</p>
                  </div>
                  <div className={styles.priorityList}>
                    {priorityStudents.map((student) => {
                      const isActive = student.id === selectedStudent?.id;

                      return (
                        <button
                          key={student.id}
                          className={`${styles.priorityCard} ${
                            isActive ? styles.priorityCardActive : ""
                          }`}
                          onClick={() => setSelectedStudentId(student.id)}
                          type="button"
                        >
                          <div className={styles.priorityCardHeader}>
                            <div className={styles.priorityCardHeading}>
                              <div className={styles.priorityMetaRow}>
                                <span
                                  className={styles.priorityOrder}
                                >{`우선 ${student.priorityOrder}`}</span>
                                <span className={styles.cohortLabel}>
                                  {student.cohortName}
                                </span>
                              </div>
                              <h3 className={styles.priorityName}>
                                {student.name}
                              </h3>
                            </div>
                            <div className={styles.badgeRow}>
                              <span
                                className={`${styles.badge} ${riskLevelClassNameMap[student.riskLevel]}`}
                              >
                                {riskLevelLabelMap[student.riskLevel]}
                              </span>
                              <span
                                className={`${styles.badge} ${styles.segmentBadge}`}
                              >
                                {careSegmentLabelMap[student.careSegment]}
                              </span>
                            </div>
                          </div>
                          <div className={styles.priorityDetailGrid}>
                            <article className={styles.priorityDetailCard}>
                              <p className={styles.detailLabel}>위험 이유</p>
                              <p className={styles.detailText}>
                                {student.riskSummary}
                              </p>
                            </article>
                            <article className={styles.priorityDetailCard}>
                              <p className={styles.detailLabel}>최근 변화</p>
                              <p className={styles.detailText}>
                                {student.recentChange}
                              </p>
                            </article>
                            <article className={styles.priorityDetailCard}>
                              <p className={styles.detailLabel}>다음 행동</p>
                              <p className={styles.detailAction}>
                                {student.recommendedAction}
                              </p>
                            </article>
                          </div>
                          <div className={styles.priorityFooter}>
                            <div className={styles.tagRow}>
                              {student.tags.map((tag) => (
                                <span key={tag} className={styles.tagChip}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <p className={styles.nextCheckLabel}>
                              다음 확인 {student.nextCheckLabel}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </article>

                <article className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <p className={styles.panelEyebrow}>학생 상세 패널</p>
                      <h2 className={styles.panelTitle}>
                        {selectedStudent
                          ? `${selectedStudent.name} · ${selectedStudent.cohortName}`
                          : "상세 학생 없음"}
                      </h2>
                    </div>
                    {selectedStudent ? (
                      <div className={styles.badgeRow}>
                        <span
                          className={`${styles.badge} ${riskLevelClassNameMap[selectedStudent.riskLevel]}`}
                        >
                          {riskLevelLabelMap[selectedStudent.riskLevel]}
                        </span>
                        <span
                          className={`${styles.badge} ${styles.segmentBadge}`}
                        >
                          {careSegmentLabelMap[selectedStudent.careSegment]}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {selectedStudent && selectedDetail ? (
                    <div className={styles.detailPanelGrid}>
                      <div className={styles.detailSummaryGrid}>
                        <article className={styles.detailSummaryCard}>
                          <p className={styles.detailLabel}>상태 요약</p>
                          <p className={styles.detailText}>
                            {selectedDetail.statusHeadline}
                          </p>
                        </article>
                        <article className={styles.detailSummaryCard}>
                          <p className={styles.detailLabel}>AI 위험 해석</p>
                          <p className={styles.detailText}>
                            {selectedDetail.aiInterpretation}
                          </p>
                        </article>
                        <article className={styles.detailSummaryCard}>
                          <p className={styles.detailLabel}>
                            교강사 개입 포인트
                          </p>
                          <p className={styles.detailAction}>
                            {selectedDetail.coachFocus}
                          </p>
                        </article>
                      </div>

                      <div className={styles.timelinePanel}>
                        <div className={styles.panelHeader}>
                          <div>
                            <p className={styles.panelEyebrow}>
                              최근 학습 신호 타임라인
                            </p>
                            <h3 className={styles.timelineTitle}>
                              개입 근거를 시간 순서로 바로 확인합니다
                            </h3>
                          </div>
                        </div>
                        <ol className={styles.timelineList}>
                          {selectedDetail.timeline.map((event) => (
                            <li key={event.id} className={styles.timelineItem}>
                              <span
                                className={`${styles.timelineBadge} ${signalTypeClassNameMap[event.type]}`}
                              >
                                {event.typeLabel}
                              </span>
                              <div className={styles.timelineContent}>
                                <p className={styles.timelineTime}>
                                  {event.occurredAtLabel}
                                </p>
                                <p className={styles.timelineEventTitle}>
                                  {event.title}
                                </p>
                                <p className={styles.detailText}>
                                  {event.summary}
                                </p>
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <StatePanel compact {...buildStatePanelCopy("missing")} />
                  )}
                </article>
              </div>

              <aside className={styles.sidebar}>
                <article className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <p className={styles.panelEyebrow}>최근 케어 이력</p>
                      <h2 className={styles.panelTitle}>
                        개입과 후속관리 흐름이 끊기지 않는 기록
                      </h2>
                    </div>
                  </div>
                  <div className={styles.historyList}>
                    {dashboard.careHistory.map((entry) => (
                      <article
                        key={`${entry.studentName}-${entry.actionLabel}`}
                        className={styles.historyItem}
                      >
                        <p className={styles.historyTitle}>
                          {entry.studentName} · {entry.actionLabel}
                        </p>
                        <p className={styles.detailText}>{entry.outcome}</p>
                        <p className={styles.historyMeta}>
                          {entry.recordedAtLabel}
                          {entry.nextCheckLabel
                            ? ` · 다음 확인 ${entry.nextCheckLabel}`
                            : ""}
                        </p>
                      </article>
                    ))}
                  </div>
                </article>

                <article className={styles.panel}>
                  <div className={styles.panelHeader}>
                    <div>
                      <p className={styles.panelEyebrow}>주간 리포트</p>
                      <h2 className={styles.panelTitle}>
                        오늘 수업 전에 함께 볼 반 단위 맥락
                      </h2>
                    </div>
                  </div>
                  <p className={styles.panelDescription}>
                    {dashboard.weeklyReport.summary}
                  </p>
                  <div className={styles.reportChecklist}>
                    {dashboard.weeklyReport.todayFocus.map((item) => (
                      <p key={item} className={styles.reportChecklistItem}>
                        {item}
                      </p>
                    ))}
                  </div>
                  <div className={styles.reportConceptList}>
                    {dashboard.weeklyReport.conceptFocuses.map((focus) => (
                      <article
                        key={focus.concept}
                        className={styles.reportConceptCard}
                      >
                        <p className={styles.segmentLabel}>
                          {focus.concept} · {focus.affectedStudentCount}명
                        </p>
                        <p className={styles.detailText}>{focus.reason}</p>
                      </article>
                    ))}
                  </div>
                  <p className={styles.panelFootnote}>
                    {dashboard.weeklyReport.coachMemo}
                  </p>
                </article>
              </aside>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
