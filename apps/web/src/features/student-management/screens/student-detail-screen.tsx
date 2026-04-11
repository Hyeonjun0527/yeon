"use client";

import React from "react";
import { useStudentManagement } from "../student-management-provider";
import { useMemberDetail } from "../hooks/use-member-detail";
import { useStudentDetail } from "../hooks/use-student-detail";
import { useStudentMemos } from "../hooks/use-student-memos";
import { useDynamicMemberTabs } from "../hooks/use-dynamic-member-tabs";
import { StudentDetailHeader } from "../components/student-detail-header";
import { StudentDetailTabs } from "../components/student-detail-tabs";
import { TabOverview } from "../components/tab-overview";
import { TabCounseling } from "../components/tab-counseling";
import { TabCounselingRecords } from "../components/tab-counseling-records";
import { TabMemberOverview } from "../components/tab-member-overview";
import { TabCourses } from "../components/tab-courses";
import { TabGuardian } from "../components/tab-guardian";
import { TabMemos } from "../components/tab-memos";
import { TabReport } from "../components/tab-report";
import { CustomTabContent } from "../components/custom-tab-content";
import { useSpaceSettingsDrawer } from "../../space-settings";

interface StudentDetailScreenProps {
  paramsPromise: Promise<{ studentId: string }>;
}

export function StudentDetailScreen({
  paramsPromise,
}: StudentDetailScreenProps) {
  const { studentId } = React.use(paramsPromise);
  const { sheetMode, selectedSpaceId, refetchMembers } = useStudentManagement();
  const { openSpaceSettings } = useSpaceSettingsDrawer();

  /* ── API 기반 멤버 조회 ── */
  const {
    member,
    activeTab,
    setActiveTab,
    activityLogs,
    logsLoading,
    logsError,
  } = useMemberDetail({ memberId: studentId });

  /* ── 동적 탭 목록 ── */
  const { tabs: dynamicTabs, refetch: refetchTabs } = useDynamicMemberTabs(selectedSpaceId);

function handleRequestAddTab() {
    if (!selectedSpaceId) return;
    openSpaceSettings({ spaceId: selectedSpaceId, onAfterClose: refetchTabs });
  }

  function handleManageFields() {
    const spaceId = member?.spaceId ?? selectedSpaceId;
    if (!spaceId) return;
    openSpaceSettings({
      spaceId,
      initialTabId: overviewTab?.id,
      onAfterClose: refetchTabs,
    });
  }
  const tabItems = dynamicTabs.length > 0
    ? dynamicTabs.map((t) => ({ id: t.systemKey ?? t.id, label: t.name }))
    : undefined;
  // 현재 탭이 시스템 키가 아닌 UUID이면 커스텀 탭
  const activeCustomTab = dynamicTabs.find(
    (t) => t.tabType === "custom" && t.id === activeTab,
  );
  const overviewTab = dynamicTabs.find((t) => t.systemKey === "overview");

  /* ── 레거시 mock 학생 조회 (member가 없을 때 폴백) ── */
  const { student } = useStudentDetail({ studentId });
  const { memos, newMemoText, setNewMemoText, addMemo } = useStudentMemos({
    studentId,
  });

  /* ── member가 있으면 API 데이터, 없으면 mock 폴백 ── */
  if (!member && !student) {
    return (
      <div
        style={{
          padding: "48px 0",
          textAlign: "center",
          color: "#94a3b8",
          fontSize: 16,
        }}
      >
        수강생을 찾을 수 없습니다.
      </div>
    );
  }

  /* member가 있는 경우 API 기반 렌더 */
  if (member) {
    return (
      <div>
        {/* 이름/상태 헤더 — Member 기반 */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 20,
          }}
        >
          <a
            href="/home/student-management"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--text-dim)",
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            ← 수강생 목록으로
          </a>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 20,
            padding: 24,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            marginBottom: 24,
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--text)",
                marginBottom: 4,
              }}
            >
              {member.name}
            </div>
            <div
              style={{
                fontSize: 14,
                color: "var(--text-secondary)",
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {member.phone && <span>{member.phone}</span>}
              {member.email && (
                <>
                  {member.phone && <span>·</span>}
                  <span>{member.email}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <StudentDetailTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabItems}
          onRequestAddTab={selectedSpaceId ? handleRequestAddTab : undefined}
        />

        {activeTab === "overview" && (
          <TabMemberOverview
            member={member}
            onMemberUpdated={refetchMembers}
            overviewTabId={overviewTab?.id}
            onManageFields={overviewTab ? handleManageFields : undefined}
          />
        )}

        {activeTab === "report" && (
          <TabReport
            member={member}
            activityLogs={activityLogs}
            logsLoading={logsLoading}
            logsError={logsError}
          />
        )}

        {activeTab === "memos" && (
          <TabMemos
            memos={memos}
            newMemoText={newMemoText}
            setNewMemoText={setNewMemoText}
            addMemo={addMemo}
          />
        )}

        {activeTab === "counseling" && (
          <TabCounselingRecords
            spaceId={member.spaceId}
            memberId={member.id}
          />
        )}

        {/* courses / guardian 탭은 미구현 안내 */}
        {(activeTab === "courses" || activeTab === "guardian") && (
          <div
            style={{
              padding: "32px 0",
              textAlign: "center",
              color: "var(--text-dim)",
              fontSize: 14,
            }}
          >
            해당 탭은 준비 중입니다.
          </div>
        )}

        {/* 커스텀 탭 */}
        {activeCustomTab && selectedSpaceId && (
          <CustomTabContent
            spaceId={selectedSpaceId}
            memberId={member.id}
            tabId={activeCustomTab.id}
          />
        )}

        {sheetMode !== null && (
          <div suppressHydrationWarning />
        )}

      </div>
    );
  }

  /* ── 레거시 mock 기반 렌더 (API member 없을 때 폴백) ── */
  return (
    <div>
      <StudentDetailHeader student={student!} />
      <StudentDetailTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {activeTab === "overview" && <TabOverview student={student!} />}
      {activeTab === "counseling" && (
        <TabCounseling history={student!.counselingHistory} />
      )}
      {activeTab === "courses" && (
        <TabCourses history={student!.courseHistory} />
      )}
      {activeTab === "guardian" && (
        <TabGuardian guardians={student!.guardians} />
      )}
      {activeTab === "memos" && (
        <TabMemos
          memos={memos}
          newMemoText={newMemoText}
          setNewMemoText={setNewMemoText}
          addMemo={addMemo}
        />
      )}
      {activeTab === "report" && student && (
        <TabReport
          member={{
            id: student.id,
            spaceId: "",
            name: student.name,
            email: student.email,
            phone: student.phone,
            status: student.status,
            initialRiskLevel: null,
            createdAt: student.registeredAt,
            updatedAt: student.registeredAt,
          }}
          activityLogs={[]}
          logsLoading={false}
          logsError={null}
        />
      )}

      {sheetMode !== null && (
        <div suppressHydrationWarning />
      )}
    </div>
  );
}
