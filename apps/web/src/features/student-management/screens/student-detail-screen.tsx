"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import React from "react";
import { createSpaceTab } from "../../space-settings/space-settings-api";
import { useStudentManagement } from "../student-management-provider";
import { isProtectedMemberTab } from "@/lib/member-tab-policy";
import { useMemberDetail } from "../hooks/use-member-detail";
import { useStudentDetail } from "../hooks/use-student-detail";
import { useStudentMemos } from "../hooks/use-student-memos";
import { useMemberMemos } from "../hooks/use-member-memos";
import { useDynamicMemberTabs } from "../hooks/use-dynamic-member-tabs";
import { useMemberTabActions } from "../hooks/use-member-tab-actions";
import type { Member } from "../types";
import { StudentDetailHeader } from "../components/student-detail-header";
import { StudentDetailTabs } from "../components/student-detail-tabs";
import { MemberBoardSlotCard } from "../components/member-board-slot-card";
import { TabOverview } from "../components/tab-overview";
import { TabCounseling } from "../components/tab-counseling";
import { TabCounselingRecords } from "../components/tab-counseling-records";
import { TabMemberOverview } from "../components/tab-member-overview";
import { TabMemberStudentBoard } from "../components/tab-member-student-board";
import { TabMemos } from "../components/tab-memos";
import { TabReport } from "../components/tab-report";
import { CustomTabContent } from "../components/custom-tab-content";
import {
  MemberFieldContextMenu,
  MemberFieldDeleteModal,
  MemberFieldEditModal,
} from "../components/member-field-action-overlays";
import {
  MemberTabContextMenu,
  MemberTabDeleteModal,
  MemberTabRenameModal,
} from "../components/member-tab-action-overlays";
import { AddCustomFieldModal } from "../components/add-custom-field-modal";
import { getFieldChoiceOptions } from "../member-field-edit-policy";
import { useAppRoute } from "@/lib/app-route-context";
import { createPatchedHref } from "@/lib/route-state/search-params";
import { formatSpacePeriodLabel } from "@/lib/space-period";
import { customTabFieldsQueryKey } from "../hooks/use-custom-tab-fields";
import { useMemberFieldActions } from "../hooks/use-member-field-actions";

const REMOVED_SYSTEM_TAB_KEYS = new Set(["courses", "guardian"]);

interface StudentDetailScreenProps {
  paramsPromise: Promise<{ studentId: string }>;
}

export function StudentDetailScreen({
  paramsPromise,
}: StudentDetailScreenProps) {
  const router = useRouter();
  const { resolveAppHref } = useAppRoute();
  const { studentId } = React.use(paramsPromise);
  const { sheetMode, selectedSpaceId, spaces } = useStudentManagement();
  const [quickAddTabOpen, setQuickAddTabOpen] = React.useState(false);
  const [fieldAddTargetTabId, setFieldAddTargetTabId] = React.useState<
    string | null
  >(null);
  const [newTabName, setNewTabName] = React.useState("");
  const [addingTab, setAddingTab] = React.useState(false);
  const [quickAddError, setQuickAddError] = React.useState<string | null>(null);

  /* ── API 기반 멤버 조회 ── */
  const { member, activeTab, setActiveTab } = useMemberDetail({
    memberId: studentId,
  });
  const detailSpaceId = member?.spaceId ?? selectedSpaceId;
  const backHref = detailSpaceId
    ? `${resolveAppHref("/counseling-service/student-management")}?spaceId=${detailSpaceId}`
    : resolveAppHref("/counseling-service/student-management");
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
    spaceId: detailSpaceId ?? null,
    memberId: member?.id ?? null,
  });

  /* ── 동적 탭 목록 ── */
  const { tabs: dynamicTabs, refetch: refetchTabs } =
    useDynamicMemberTabs(detailSpaceId);

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

  function handleOpenAddFieldModal(tabId: string | null | undefined) {
    if (!member?.spaceId || !tabId) return;
    setFieldAddTargetTabId(tabId);
  }

  const handleOpenMemberRecordEntry = React.useCallback(
    (memberId: string, memberName: string, spaceId: string) => {
      router.push(
        createPatchedHref(
          resolveAppHref("/counseling-service"),
          new URLSearchParams(),
          {
            spaceId,
            memberId,
            studentName: memberName,
            newRecordEntry: "true",
          },
        ),
      );
    },
    [resolveAppHref, router],
  );
  const visibleDynamicTabs = dynamicTabs.filter(
    (tab) => !REMOVED_SYSTEM_TAB_KEYS.has(tab.systemKey ?? ""),
  );
  const tabItems =
    visibleDynamicTabs.length > 0
      ? visibleDynamicTabs.map((t) => ({
          id: t.systemKey ?? t.id,
          label: t.name,
          isEditable: t.tabType === "custom" && !isProtectedMemberTab(t),
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
  const activeCustomTabQueryKey =
    member && activeCustomTab
      ? customTabFieldsQueryKey(member.spaceId, member.id, activeCustomTab.id)
      : null;
  const memberTabActions = useMemberTabActions({
    spaceId: detailSpaceId,
    tabs: visibleDynamicTabs,
    activeTab,
    setActiveTab,
  });
  const customFieldActions = useMemberFieldActions({
    member:
      member ??
      ({
        id: "",
        spaceId: "",
        name: "",
        email: null,
        phone: null,
        status: "active",
        createdAt: "",
        updatedAt: "",
      } as Member),
    queryKey: activeCustomTabQueryKey,
  });

  React.useEffect(() => {
    if (activeTab === "courses" || activeTab === "guardian") {
      setActiveTab("overview");
    }
  }, [activeTab, setActiveTab]);

  React.useEffect(() => {
    if (visibleDynamicTabs.length === 0) {
      return;
    }

    const isKnownTab = visibleDynamicTabs.some((tab) => {
      return (tab.systemKey ?? tab.id) === activeTab;
    });

    if (!isKnownTab) {
      setActiveTab("overview");
    }
  }, [activeTab, setActiveTab, visibleDynamicTabs]);

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
    const memberSpace =
      spaces.find((space) => space.id === member.spaceId) ?? null;
    const memberSpacePeriodLabel = formatSpacePeriodLabel(
      memberSpace?.startDate ?? null,
      memberSpace?.endDate ?? null,
    );

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

        <div className="mb-6 rounded-2xl border border-border bg-surface-2 p-5 lg:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[22px] font-bold text-text">
                    {member.name}
                  </div>
                  <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] text-text-dim">
                    {memberSpace?.name ?? "스페이스 미확인"}
                  </span>
                  <span className="rounded-full border border-border bg-surface px-2.5 py-1 text-[12px] text-text-dim">
                    {memberSpacePeriodLabel ?? "진행기간 미설정"}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-text-secondary">
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

            <MemberBoardSlotCard
              spaceId={member.spaceId}
              memberId={member.id}
              startDate={memberSpace?.startDate ?? null}
              endDate={memberSpace?.endDate ?? null}
            />
          </div>
        </div>

        <StudentDetailTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          tabs={tabItems}
          onRequestAddTab={selectedSpaceId ? handleRequestAddTab : undefined}
          onRequestTabMenu={(tabId, position) => {
            const targetTab = visibleDynamicTabs.find(
              (tab) => tab.tabType === "custom" && tab.id === tabId,
            );
            if (!targetTab) {
              return;
            }

            memberTabActions.openTabMenu(
              {
                id: targetTab.id,
                name: targetTab.name,
              },
              position,
            );
          }}
        />

        {activeTab === "overview" && (
          <TabMemberOverview
            member={member}
            overviewTabId={overviewTab?.id}
            guardianTabId={legacyGuardianTab?.id}
            memos={memberMemos}
            memosLoading={memberMemosLoading}
            memosError={memberMemosError}
            totalMemoCount={memberMemoCount}
            onAddField={
              overviewTab?.id
                ? () => handleOpenAddFieldModal(overviewTab.id)
                : undefined
            }
          />
        )}

        {activeTab === "student_board" && (
          <TabMemberStudentBoard
            spaceId={member.spaceId}
            memberId={member.id}
          />
        )}

        {activeTab === "report" && <TabReport member={member} />}

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
            onRequestRecordEntry={() =>
              handleOpenMemberRecordEntry(
                member.id,
                member.name,
                member.spaceId,
              )
            }
          />
        )}

        {/* 커스텀 탭 */}
        {activeCustomTab && selectedSpaceId && (
          <CustomTabContent
            spaceId={selectedSpaceId}
            memberId={member.id}
            tabId={activeCustomTab.id}
            title={activeCustomTab.name}
            onRequestAddField={() =>
              handleOpenAddFieldModal(activeCustomTab.id)
            }
            onRequestFieldMenu={({ field, value, position }) =>
              customFieldActions.openFieldMenu(
                {
                  field,
                  value,
                  valueFieldType: field.fieldType,
                  valueOptions: getFieldChoiceOptions(
                    field.fieldType,
                    field.options,
                  ),
                  valueScope: "fieldValue",
                },
                position,
              )
            }
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
                  현재 스페이스 수강생에게 공통으로 보일 탭을 빠르게 추가합니다.
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

        {fieldAddTargetTabId ? (
          <AddCustomFieldModal
            spaceId={member.spaceId}
            memberId={member.id}
            tabId={fieldAddTargetTabId}
            onClose={() => setFieldAddTargetTabId(null)}
          />
        ) : null}

        {memberTabActions.contextMenu ? (
          <MemberTabContextMenu
            x={memberTabActions.contextMenu.x}
            y={memberTabActions.contextMenu.y}
            onRename={() =>
              memberTabActions.openRenameModal(
                memberTabActions.contextMenu!.target,
              )
            }
            onDelete={() =>
              memberTabActions.openDeleteModal(
                memberTabActions.contextMenu!.target,
              )
            }
          />
        ) : null}

        <MemberTabRenameModal
          target={memberTabActions.renameTarget}
          isSubmitting={memberTabActions.isRenaming}
          errorMessage={memberTabActions.renameErrorMessage}
          onClose={memberTabActions.closeRenameModal}
          onSubmit={memberTabActions.submitRename}
        />

        <MemberTabDeleteModal
          target={memberTabActions.deleteTarget}
          isDeleting={memberTabActions.isDeleting}
          errorMessage={memberTabActions.deleteErrorMessage}
          onClose={memberTabActions.closeDeleteModal}
          onDelete={memberTabActions.confirmDelete}
        />

        {customFieldActions.contextMenu ? (
          <MemberFieldContextMenu
            x={customFieldActions.contextMenu.x}
            y={customFieldActions.contextMenu.y}
            onRename={() =>
              customFieldActions.openEditModal(
                customFieldActions.contextMenu!.target,
              )
            }
            onDelete={() =>
              customFieldActions.openDeleteModal(
                customFieldActions.contextMenu!.target,
              )
            }
          />
        ) : null}

        <MemberFieldEditModal
          target={customFieldActions.editTarget}
          isSubmitting={customFieldActions.isEditing}
          errorMessage={customFieldActions.editErrorMessage}
          onClose={customFieldActions.closeEditModal}
          onSubmit={customFieldActions.submitEdit}
        />

        <MemberFieldDeleteModal
          target={customFieldActions.deleteTarget}
          isDeleting={customFieldActions.isDeleting}
          errorMessage={customFieldActions.deleteErrorMessage}
          onClose={customFieldActions.closeDeleteModal}
          onDelete={customFieldActions.confirmDelete}
        />

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
      {activeTab === "student_board" && <TabMemberStudentBoard />}
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
