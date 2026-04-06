import Link from "next/link";
import type {
  InstructorDashboardResponse,
  InstructorRiskLevel,
  StudentCareSegment,
} from "@yeon/api-contract";

import type { ContestOverview } from "@/lib/contest-overview";

import styles from "./contest-home.module.css";

type ContestHomeProps = {
  overview: ContestOverview;
  dashboard: InstructorDashboardResponse;
};

type SectionHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
};

function SectionHeading({ eyebrow, title, description }: SectionHeadingProps) {
  return (
    <div className={styles.sectionHeading}>
      <p className={styles.eyebrow}>{eyebrow}</p>
      <h2 className={styles.sectionTitle}>{title}</h2>
      <p className={styles.sectionDescription}>{description}</p>
    </div>
  );
}

const riskLevelLabelMap: Record<InstructorRiskLevel, string> = {
  high: "즉시 확인",
  medium: "관찰 필요",
  low: "안정 흐름",
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

export function ContestHome({ overview, dashboard }: ContestHomeProps) {
  return (
    <main className={styles.page}>
      <div className={styles.shell}>
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <p className={styles.heroEyebrow}>{overview.category}</p>
            <h1 className={styles.heroTitle}>{overview.headline}</h1>
            <p className={styles.heroSummary}>{overview.summary}</p>
            <div className={styles.userChips}>
              {overview.targetUsers.map((user) => (
                <span key={user} className={styles.userChip}>
                  {user}
                </span>
              ))}
            </div>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#round-one-preview">
                오늘 케어 브리핑 보기
              </a>
              <Link
                className={styles.secondaryAction}
                href="/api/v1/contest/overview"
              >
                공용 JSON 보기
              </Link>
            </div>
          </div>

          <aside className={styles.signalPanel}>
            <p className={styles.panelLabel}>현장 신호</p>
            <ul className={styles.signalList}>
              {overview.learningSignals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
            <div className={styles.problemBox}>
              <span className={styles.problemLabel}>핵심 문제</span>
              <p>{overview.problemStatement}</p>
            </div>
          </aside>
        </section>

        <section className={styles.metricStrip} aria-label="예상 개선 지표">
          {overview.expectedImpacts.slice(0, 3).map((impact) => (
            <article key={impact.metric} className={styles.metricCard}>
              <p className={styles.metricLabel}>{impact.metric}</p>
              <p className={styles.metricTarget}>{impact.targetState}</p>
              <p className={styles.metricCurrent}>
                기존: {impact.currentState}
              </p>
            </article>
          ))}
        </section>

        <section className={styles.section} id="round-one-preview">
          <SectionHeading
            eyebrow="라운드 1 프리뷰"
            title={dashboard.headline}
            description={dashboard.summary}
          />
          <div className={styles.dashboardPreview}>
            <div className={styles.dashboardMain}>
              <div className={styles.dashboardMetricGrid}>
                {dashboard.metrics.map((metric) => (
                  <article
                    key={metric.label}
                    className={styles.dashboardMetricCard}
                  >
                    <p className={styles.metricLabel}>{metric.label}</p>
                    <p className={styles.dashboardMetricValue}>
                      {metric.value}
                    </p>
                    <p className={styles.cardBody}>{metric.description}</p>
                  </article>
                ))}
              </div>

              <article className={styles.segmentPanel}>
                <div className={styles.segmentPanelHeader}>
                  <div>
                    <p className={styles.personaListLabel}>학생함 세그먼트</p>
                    <h3 className={styles.cardTitle}>
                      누구를 왜 먼저 챙길지 바로 갈라내는 구조
                    </h3>
                  </div>
                  <p className={styles.segmentGeneratedAt}>
                    기준 시각 {dashboard.generatedAt.slice(11, 16)}
                  </p>
                </div>
                <div className={styles.segmentGrid}>
                  {dashboard.segments.map((segment) => (
                    <article
                      key={segment.key}
                      className={styles.segmentSummaryCard}
                    >
                      <p className={styles.roleLabel}>{segment.label}</p>
                      <p className={styles.segmentCount}>{segment.count}명</p>
                      <p className={styles.cardBody}>{segment.description}</p>
                    </article>
                  ))}
                </div>
              </article>

              <div className={styles.priorityStudentGrid}>
                {dashboard.priorityStudents.map((student) => (
                  <article
                    key={student.id}
                    className={styles.priorityStudentCard}
                  >
                    <div className={styles.priorityStudentHeader}>
                      <div className={styles.priorityStudentHeading}>
                        <p className={styles.roleLabel}>{student.cohortName}</p>
                        <h3 className={styles.cardTitle}>{student.name}</h3>
                      </div>
                      <div className={styles.priorityStudentBadges}>
                        <span
                          className={`${styles.riskBadge} ${riskLevelClassNameMap[student.riskLevel]}`}
                        >
                          {riskLevelLabelMap[student.riskLevel]}
                        </span>
                        <span className={styles.segmentBadge}>
                          {careSegmentLabelMap[student.careSegment]}
                        </span>
                      </div>
                    </div>
                    <p className={styles.cardBody}>{student.riskSummary}</p>
                    <p className={styles.studentRecentChange}>
                      최근 변화: {student.recentChange}
                    </p>
                    <p className={styles.studentAction}>
                      다음 행동: {student.recommendedAction}
                    </p>
                    <div className={styles.studentFooter}>
                      <div className={styles.tagList}>
                        {student.tags.map((tag) => (
                          <span key={tag} className={styles.tagChip}>
                            {tag}
                          </span>
                        ))}
                      </div>
                      <span className={styles.deadlineLabel}>
                        {student.nextCheckLabel}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <aside className={styles.dashboardSidebar}>
              <article className={styles.dashboardSideCard}>
                <div className={styles.dashboardSideHeader}>
                  <p className={styles.personaListLabel}>최근 케어 이력</p>
                  <h3 className={styles.cardTitle}>
                    개입과 후속관리가 끊기지 않는 기록
                  </h3>
                </div>
                <ul className={styles.dashboardList}>
                  {dashboard.careHistory.map((entry) => (
                    <li key={`${entry.studentName}-${entry.actionLabel}`}>
                      <p className={styles.dashboardListTitle}>
                        {entry.studentName} · {entry.actionLabel}
                      </p>
                      <p className={styles.cardBody}>{entry.outcome}</p>
                      <p className={styles.dashboardListMeta}>
                        {entry.recordedAtLabel}
                        {entry.nextCheckLabel
                          ? ` · 다음 확인 ${entry.nextCheckLabel}`
                          : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </article>

              <article className={styles.dashboardSideCard}>
                <div className={styles.dashboardSideHeader}>
                  <p className={styles.personaListLabel}>주간 리포트</p>
                  <h3 className={styles.cardTitle}>
                    오늘 수업 전에 같이 봐야 할 반 단위 맥락
                  </h3>
                </div>
                <p className={styles.cardBody}>
                  {dashboard.weeklyReport.summary}
                </p>
                <div className={styles.focusChecklist}>
                  {dashboard.weeklyReport.todayFocus.map((item) => (
                    <p key={item} className={styles.focusChecklistItem}>
                      {item}
                    </p>
                  ))}
                </div>
                <div className={styles.conceptFocusList}>
                  {dashboard.weeklyReport.conceptFocuses.map((focus) => (
                    <article
                      key={focus.concept}
                      className={styles.conceptFocusCard}
                    >
                      <p className={styles.roleLabel}>
                        {focus.concept} · {focus.affectedStudentCount}명
                      </p>
                      <p className={styles.cardBody}>{focus.reason}</p>
                    </article>
                  ))}
                </div>
                <p className={styles.coachMemo}>
                  {dashboard.weeklyReport.coachMemo}
                </p>
                <div className={styles.heroActions}>
                  <Link
                    className={styles.secondaryAction}
                    href="/api/v1/instructor-dashboard"
                  >
                    대시보드 JSON 보기
                  </Link>
                  <Link
                    className={styles.primaryAction}
                    href="/api/v1/contest/overview"
                  >
                    공모전 개요 JSON 보기
                  </Link>
                </div>
              </article>
            </aside>
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="제출용 문구"
            title="3차~5차에서는 수업 전 준비 시간, 위험 신호 우선순위, 제품 포지셔닝을 한 문장으로 고정했습니다"
            description="기획 문서, API, 랜딩 카피가 모두 같은 제출용 문구를 바라보게 만들어 심사자에게 흐릿한 표현이 남지 않게 합니다."
          />
          <div className={styles.submissionPanel}>
            <article className={styles.submissionPrimary}>
              <p className={styles.personaListLabel}>한 줄 설명</p>
              <h3 className={styles.submissionOneLiner}>
                {overview.submissionCopy.oneLiner}
              </h3>
            </article>
            <article className={styles.submissionSide}>
              <p className={styles.personaListLabel}>문제 정의</p>
              <p className={styles.cardBody}>
                {overview.submissionCopy.problemDefinition}
              </p>
              <p className={styles.submissionPositioning}>
                포지셔닝: {overview.submissionCopy.positioning}
              </p>
            </article>
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="대표 페르소나"
            title="이번 MVP는 운영 조직 소속 교강사 한 명의 바쁜 수업 전 30분에서 출발합니다"
            description="대표 페르소나가 실제로 어떤 규모의 코호트를 맡고, 어떤 도구를 오가며, 무엇 때문에 학생관리가 끊기는지를 먼저 고정해야 서비스 범위가 선명해집니다."
          />
          <div className={styles.personaLayout}>
            <article className={styles.personaPrimary}>
              <div className={styles.personaHeader}>
                <p className={styles.roleLabel}>
                  {overview.primaryPersona.roleTitle}
                </p>
                <h3 className={styles.personaName}>
                  {overview.primaryPersona.name}
                </h3>
                <p className={styles.cardBody}>
                  {overview.primaryPersona.summary}
                </p>
              </div>
              <dl className={styles.personaFacts}>
                <div className={styles.personaFact}>
                  <dt>담당 범위</dt>
                  <dd>{overview.primaryPersona.cohortScope}</dd>
                </div>
                <div className={styles.personaFact}>
                  <dt>관리 시간</dt>
                  <dd>{overview.primaryPersona.workingWindow}</dd>
                </div>
              </dl>
            </article>
            <div className={styles.personaSupportGrid}>
              <article className={styles.personaListCard}>
                <p className={styles.personaListLabel}>핵심 책임</p>
                <ul className={styles.personaList}>
                  {overview.primaryPersona.responsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className={styles.personaListCard}>
                <p className={styles.personaListLabel}>현재 도구</p>
                <ul className={styles.personaList}>
                  {overview.primaryPersona.currentTools.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
              <article className={styles.personaListCard}>
                <p className={styles.personaListLabel}>성공 기준</p>
                <ul className={styles.personaList}>
                  {overview.primaryPersona.successCriteria.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
          </div>
          <article className={styles.personaPainCard}>
            <p className={styles.personaListLabel}>대표 문제</p>
            <ul className={styles.personaPainList}>
              {overview.primaryPersona.painPoints.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="하루 업무 흐름"
            title="교강사의 하루를 수업 전, 수업 중, 수업 후로 나누고 MVP는 수업 전 준비부터 해결합니다"
            description="누가 위험한지 찾는 기능만으로는 부족합니다. 교강사의 실제 업무 순서 안에서 가장 압박이 큰 순간을 먼저 줄여야 합니다."
          />
          <div className={styles.dailyFlowGrid}>
            {overview.dailyWorkflow.map((stage) => (
              <article key={stage.stage} className={styles.dailyFlowCard}>
                <div className={styles.dailyFlowHeader}>
                  <p className={styles.workflowStep}>{stage.stage}</p>
                  {stage.isMvpFocus ? (
                    <span className={styles.priorityChip}>MVP 우선</span>
                  ) : null}
                </div>
                <h3 className={styles.cardTitle}>{stage.title}</h3>
                <p className={styles.cardBody}>{stage.summary}</p>
                <p className={styles.dailyFlowQuestion}>{stage.keyQuestion}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="위험 신호 우선순위"
            title="위험도 숫자보다 어떤 신호를 먼저 볼지 우선순위를 명확히 둡니다"
            description="MVP는 시험 점수보다 조기 개입이 가능한 신호를 먼저 본다는 기준을 고정했습니다."
          />
          <div className={styles.riskGrid}>
            {overview.riskSignals.map((signal) => (
              <article key={signal.priority} className={styles.riskCard}>
                <div className={styles.dailyFlowHeader}>
                  <p className={styles.workflowStep}>{signal.priority}</p>
                  <p className={styles.riskIndicator}>{signal.indicator}</p>
                </div>
                <h3 className={styles.cardTitle}>{signal.title}</h3>
                <p className={styles.cardBody}>{signal.reason}</p>
                <p className={styles.riskAction}>{signal.recommendedAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="문제 정의"
            title="교강사에게 필요한 건 위험 학생 알림판이 아니라 학생관리 서비스입니다"
            description="서비스가 쓸모 있으려면 전체 학생을 보고, 상태를 파악하고, 개입하고, 기록하고, 다시 확인하는 흐름이 닫혀야 합니다."
          />
          <div className={styles.cardGrid}>
            {overview.painPoints.map((painPoint) => (
              <article key={painPoint.title} className={styles.problemCard}>
                <p className={styles.roleLabel}>{painPoint.roleLabel}</p>
                <h3 className={styles.cardTitle}>{painPoint.title}</h3>
                <p className={styles.cardBody}>{painPoint.description}</p>
                <p className={styles.cardFootnote}>{painPoint.currentState}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} id="workflow">
          <SectionHeading
            eyebrow="관리 흐름"
            title="YEON은 교강사의 학생관리 파이프라인을 서비스로 묶습니다"
            description="중요한 건 한 번 위험 학생을 찾는 게 아니라, 전체 학생 관리가 끊기지 않게 하는 것입니다."
          />
          <div className={styles.workflowGrid}>
            {overview.workflow.map((step) => (
              <article key={step.step} className={styles.workflowCard}>
                <p className={styles.workflowStep}>{step.step}</p>
                <h3 className={styles.cardTitle}>{step.title}</h3>
                <p className={styles.cardBody}>{step.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="핵심 기능"
            title="핵심 기능은 학생관리 CRM처럼 전체 흐름을 닫는 데 집중합니다"
            description="학생함, 학생 상세, AI 진단, 후속관리, 반 운영 리포트까지 이어져야 학생관리서비스로 보입니다."
          />
          <div className={styles.featureGrid}>
            {overview.coreFeatures.map((feature) => (
              <article key={feature.name} className={styles.featureCard}>
                <h3 className={styles.cardTitle}>{feature.name}</h3>
                <p className={styles.cardBody}>{feature.summary}</p>
                <p className={styles.featureDeliverable}>
                  MVP 산출: {feature.deliverable}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="운영 UX"
            title="UX는 탐지보다 관리가 쉬워야 합니다"
            description="교강사는 바쁜 상황에서 학생을 계속 관리해야 하므로, 전체 학생 상태와 후속관리 큐가 바로 보이는 구조가 더 중요합니다."
          />
          <div className={styles.featureGrid}>
            {overview.uxPrinciples.map((principle) => (
              <article key={principle.title} className={styles.featureCard}>
                <h3 className={styles.cardTitle}>{principle.title}</h3>
                <p className={styles.cardBody}>{principle.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="역할별 관점"
            title="주 사용자는 교강사 학생함이고, 나머지는 그 관리 흐름의 결과를 받습니다"
            description="수강생과 운영자 경험도 중요하지만, 출발점은 교강사가 학생을 끝까지 관리하는 흐름이어야 합니다."
          />
          <div className={styles.snapshotGrid}>
            {overview.roleSnapshots.map((snapshot) => (
              <article key={snapshot.roleLabel} className={styles.snapshotCard}>
                <p className={styles.roleLabel}>{snapshot.roleLabel}</p>
                <h3 className={styles.cardTitle}>{snapshot.heading}</h3>
                <p className={styles.cardBody}>{snapshot.summary}</p>
                <ul className={styles.actionList}>
                  {snapshot.actions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="기대 효과"
            title="심사에서는 AI보다 학생관리 운영이 어떻게 좋아지는지가 먼저 보여야 합니다"
            description="실측 수치가 아직 없더라도, 관리 누락이 어떻게 줄고 후속관리가 어떻게 이어지는지는 명확해야 합니다."
          />
          <div className={styles.impactList}>
            {overview.expectedImpacts.map((impact) => (
              <article key={impact.metric} className={styles.impactCard}>
                <div>
                  <p className={styles.metricLabel}>{impact.metric}</p>
                  <p className={styles.cardBody}>{impact.measurement}</p>
                </div>
                <div className={styles.impactStates}>
                  <p>
                    <span className={styles.stateLabel}>기존</span>
                    {impact.currentState}
                  </p>
                  <p>
                    <span className={styles.stateLabel}>목표</span>
                    {impact.targetState}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <SectionHeading
            eyebrow="AI 활용 전략"
            title="AI는 교강사를 대체하지 않고, 진단과 초안 작성을 보조하는 데 집중합니다"
            description="실무 적용성을 높이려면 자동 판단보다 사람이 최종 선택하고 승인하는 구조가 더 설득력 있습니다."
          />
          <div className={styles.aiGrid}>
            {overview.aiStack.map((item) => (
              <article
                key={`${item.tool}-${item.model}`}
                className={styles.aiCard}
              >
                <p className={styles.roleLabel}>{item.tool}</p>
                <h3 className={styles.cardTitle}>{item.model}</h3>
                <p className={styles.aiPurpose}>{item.purpose}</p>
                <p className={styles.cardBody}>{item.reason}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.footerCallout}>
          <div>
            <p className={styles.heroEyebrow}>MVP 범위</p>
            <h2 className={styles.footerTitle}>
              이번 차수는 학생관리 CRM 관점의 제출 문서 + 공용 API + 설명형 웹
              MVP까지 정리합니다
            </h2>
            <p className={styles.footerBody}>
              다음 차수에서는 학생함, 상세 관리 카드, 피드백 초안, 후속관리
              인터랙션을 실제로 붙이면 됩니다.
            </p>
          </div>
          <div className={styles.heroActions}>
            <Link className={styles.secondaryAction} href="/api/health">
              헬스체크 보기
            </Link>
            <Link
              className={styles.primaryAction}
              href="/api/v1/contest/overview"
            >
              공모전 개요 JSON 보기
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
