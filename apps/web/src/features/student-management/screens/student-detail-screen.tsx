"use client";

import Link from "next/link";
import React from "react";
import { createSpaceTab } from "../../space-settings/space-settings-api";
import { useStudentManagement } from "../student-management-provider";
import { useMemberDetail } from "../hooks/use-member-detail";
import { useStudentDetail } from "../hooks/use-student-detail";
import { useStudentMemos } from "../hooks/use-student-memos";
import { useMemberMemos } from "../hooks/use-member-memos";
import { useDynamicMemberTabs } from "../hooks/use-dynamic-member-tabs";
import { StudentDetailHeader } from "../components/student-detail-header";
import { StudentDetailTabs } from "../components/student-detail-tabs";
import { TabOverview } from "../components/tab-overview";
import { TabCounseling } from "../components/tab-counseling";
import { TabCounselingRecords } from "../components/tab-counseling-records";
import { TabMemberOverview } from "../components/tab-member-overview";
import { TabMemos } from "../components/tab-memos";
import { TabReport } from "../components/tab-report";
import { CustomTabContent } from "../components/custom-tab-content";
import { useSpaceSettingsDrawer } from "../../space-settings";
import type { Member } from "../types";
import { useAppRoute } from "@/lib/app-route-context";

const REMOVED_SYSTEM_TAB_KEYS = new Set(["courses", "guardian"]);

interface StudentDetailScreenProps {
  paramsPromise: Promise<{ studentId: string }>;
}

export function StudentDetailScreen({
  paramsPromise,
}: StudentDetailScreenProps) {
  const { resolveAppHref } = useAppRoute();
  const { studentId } = React.use(paramsPromise);
  const { sheetMode, selectedSpaceId, patchMemberInCaches } =
    useStudentManagement();
  const { openSpaceSettings } = useSpaceSettingsDrawer();
  const [memberCounselingRecordCount, setMemberCounselingRecordCount] =
    React.useState<number | null>(null);
  const [quickAddTabOpen, setQuickAddTabOpen] = React.useState(false);
  const [newTabName, setNewTabName] = React.useState("");
  const [addingTab, setAddingTab] = React.useState(false);
  const [quickAddError, setQuickAddError] = React.useState<string | null>(null);
  const backHref = selectedSpaceId
    ? `${resolveAppHref("/home/student-management")}?spaceId=${selectedSpaceId}`
    : resolveAppHref("/home/student-management");

  /* ── API 기반 멤버 조회 ── */
  const { member, activeTab, setActiveTab } = useMemberDetail({
    memberId: studentId,
  });
  const {
    memos: memberMemos,
    newMemoText: memberMemoText,
    setNewMemoText: setMemberMemoText,
    addMemo: addMemberMemo,
    loading: memberMemosLoading,
    error: memberMemosError,
    isSaving: memberMemoSaving,
    totalCount: memberMemoCount,
  } = useMemberMemos({
    spaceId: member?.spaceId ?? null,
    memberId: member?.id ?? null,
  });

  /* ── 동적 탭 목록 ── */
  const { tabs: dynamicTabs, refetch: refetchTabs } =
    useDynamicMemberTabs(selectedSpaceId);

  function handleRequestAddTab() {
    if (!selectedSpaceId) return;
    setQuickAddError(null);
    setNewTabName("");
    setQuickAddTabOpen(true);
  }

  async function handleQuickAddTab() {
    if (!selectedSpaceId) return;
    const trimmed = newTabName.trim();
    if (!trimmed) {
      setQuickAddError("새 탭 이름을 입력해 주세요.");
      return;
    }

    setAddingTab(true);
    setQuickAddError(null);
    try {
      const result = await createSpaceTab(selectedSpaceId, trimmed);
      await refetchTabs();
      setActiveTab(result.tab.systemKey ?? result.tab.id);
      setQuickAddTabOpen(false);
      setNewTabName("");
    } catch (error) {
      setQuickAddError(
        error instanceof Error ? error.message : "탭을 추가하지 못했습니다.",
      );
    } finally {
      setAddingTab(false);
    }
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
  const visibleDynamicTabs = dynamicTabs.filter(
    (tab) => !REMOVED_SYSTEM_TAB_KEYS.has(tab.systemKey ?? ""),
  );
  const handleMemberPatched = React.useCallback(
    (updatedMember: Member) => {
      patchMemberInCaches(updatedMember.id, updatedMember);
    },
    [patchMemberInCaches],
  );
  const tabItems =
    visibleDynamicTabs.length > 0
      ? visibleDynamicTabs.map((t) => ({
          id: t.systemKey ?? t.id,
          label: t.name,
        }))
      : undefined;
  // 현재 탭이 시스템 키가 아닌 UUID이면 커스텀 탭
  const activeCustomTab = visibleDynamicTabs.find(
    (t) => t.tabType === "custom" && t.id === activeTab,
  );
  const overviewTab = visibleDynamicTabs.find(
    (t) => t.systemKey === "overview",
  );
  const legacyGuardianTab = dynamicTabs.find((t) => t.systemKey === "guardian");

  React.useEffect(() => {
    if (activeTab === "courses" || activeTab === "guardian") {
      setActiveTab("overview");
    }
  }, [activeTab, setActiveTab]);

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
          <Link
            href={backHref}
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
          </Link>
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

          {memberCounselingRecordCount === null ||
          memberCounselingRecordCount > 0 ? (
            <div style={{ display: "flex", gap: 12, flexShrink: 0 }}>
              <a
                href={resolveAppHref(`/home?memberId=${member.id}`)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 12,
                  background: "var(--surface3)",
                  color: "var(--text)",
                  fontSize: 14,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                + 새 상담 녹음
              </a>
            </div>
          ) : null}
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
            onMemberUpdated={handleMemberPatched}
            overviewTabId={overviewTab?.id}
            guardianTabId={legacyGuardianTab?.id}
            memos={memberMemos}
            memosLoading={memberMemosLoading}
            memosError={memberMemosError}
            totalMemoCount={memberMemoCount}
            onManageFields={overviewTab ? handleManageFields : undefined}
          />
        )}

        {activeTab === "report" && (
          <TabReport
            member={member}
            memos={memberMemos}
            memosLoading={memberMemosLoading}
            totalMemoCount={memberMemoCount}
          />
        )}

        {activeTab === "memos" && (
          <TabMemos
            memos={memberMemos}
            newMemoText={memberMemoText}
            setNewMemoText={setMemberMemoText}
            addMemo={addMemberMemo}
            loading={memberMemosLoading}
            error={memberMemosError}
            isSaving={memberMemoSaving}
          />
        )}

        {activeTab === "counseling" && (
          <TabCounselingRecords
            spaceId={member.spaceId}
            memberId={member.id}
            onRecordCountChange={setMemberCounselingRecordCount}
          />
        )}

        {/* 커스텀 탭 */}
        {activeCustomTab && selectedSpaceId && (
          <CustomTabContent
            spaceId={selectedSpaceId}
            memberId={member.id}
            tabId={activeCustomTab.id}
          />
        )}

        {quickAddTabOpen ? (
          <div
            className="fixed inset-0 z-[320] flex items-center justify-center bg-black/45 px-4 backdrop-blur-sm"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setQuickAddTabOpen(false);
              }
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface shadow-[0_24px_64px_rgba(0,0,0,0.5)]">
              <div className="border-b border-border px-5 py-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-dim">
                  quick add
                </p>
                <h3 className="mt-1 text-lg font-semibold text-text">
                  새 탭 추가
                </h3>
                <p className="mt-1 text-sm text-text-secondary">
                  전체 수강생에 공통으로 보일 탭을 빠르게 추가합니다.
                </p>
              </div>

              <div className="space-y-4 px-5 py-5">
                <div className="space-y-2">
                  <label className="block text-[12px] font-medium text-text-secondary">
                    탭 이름
                  </label>
                  <input
                    className="w-full rounded-xl border border-border bg-surface-2 px-4 py-3 text-sm text-text outline-none transition-colors placeholder:text-text-dim focus:border-accent-border"
                    placeholder="예: 출결, 포트폴리오, 상담노트"
                    value={newTabName}
                    onChange={(event) => setNewTabName(event.target.value)}
                    autoFocus
                  />
                </div>

                {quickAddError ? (
                  <div className="rounded-xl border border-red/20 bg-red/10 px-4 py-3 text-[13px] text-red">
                    {quickAddError}
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
                  <button
                    type="button"
                    className="rounded-lg border border-border bg-surface-3 px-4 py-2 text-[13px] font-medium text-text-secondary transition-colors hover:border-border-light hover:bg-surface-4 hover:text-text"
                    onClick={() => setQuickAddTabOpen(false)}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    className="rounded-lg bg-accent px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => void handleQuickAddTab()}
                    disabled={addingTab || !newTabName.trim()}
                  >
                    {addingTab ? "추가 중..." : "탭 추가"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {sheetMode !== null && <div suppressHydrationWarning />}
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
        />
      )}

      {sheetMode !== null && <div suppressHydrationWarning />}
    </div>
  );
}
