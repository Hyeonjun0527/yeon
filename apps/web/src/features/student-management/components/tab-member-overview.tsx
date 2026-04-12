"use client";

import type { Member, Memo } from "../types";
import { useCustomTabFields } from "../hooks/use-custom-tab-fields";
import { fmtDate, fmtRelative } from "../utils";
import { ProfileImportPanel } from "./profile-import-panel";
import { CustomTabContent } from "./custom-tab-content";

interface TabMemberOverviewProps {
  member: Member;
  onMemberUpdated?: (member: Member) => void;
  overviewTabId?: string;
  guardianTabId?: string;
  memos?: Memo[];
  memosLoading?: boolean;
  memosError?: string | null;
  totalMemoCount?: number;
  /** 제공 시 "추가 정보" 섹션 헤더에 필드 관리 버튼 표시 */
  onManageFields?: () => void;
}

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  active: { label: "수강중", color: "var(--accent)" },
  withdrawn: { label: "중도포기", color: "#f87171" },
  graduated: { label: "수료", color: "#34d399" },
};

const RISK_LABEL: Record<string, { label: string; color: string }> = {
  low: { label: "낮음", color: "#34d399" },
  medium: { label: "보통", color: "#fbbf24" },
  high: { label: "높음", color: "#f87171" },
};

function DataRow({
  label,
  value,
  filled,
  note,
  valueColor,
}: {
  label: string;
  value: string;
  filled: boolean;
  note?: string;
  valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-[10px] border-b border-[rgba(255,255,255,0.04)] last:border-0">
      {/* 상태 도트 */}
      <div
        className="w-[6px] h-[6px] rounded-full flex-shrink-0"
        style={{
          background: filled ? "var(--accent)" : "rgba(255,255,255,0.15)",
          boxShadow: filled ? "0 0 6px var(--accent)" : "none",
        }}
      />
      {/* 라벨 */}
      <span className="text-[12px] text-text-dim w-[88px] flex-shrink-0 font-mono tracking-tight">
        {label}
      </span>
      {/* 값 */}
      <span
        className="text-[13px] flex-1 truncate"
        style={{
          color: filled
            ? (valueColor ?? "var(--text)")
            : "rgba(255,255,255,0.2)",
        }}
      >
        {filled ? value : "─ 미입력"}
      </span>
      {/* 부가 정보 */}
      {note && filled && (
        <span className="text-[11px] text-text-dim flex-shrink-0">{note}</span>
      )}
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="text-[10px] font-semibold tracking-[0.8px] uppercase text-text-dim">
          {title}
        </div>
        {action}
      </div>
      <div className="bg-surface-2 border border-border rounded-lg px-4">
        {children}
      </div>
    </div>
  );
}

function LegacyGuardianFieldsSection({
  spaceId,
  memberId,
  guardianTabId,
}: {
  spaceId: string;
  memberId: string;
  guardianTabId?: string;
}) {
  const { fields, loading } = useCustomTabFields(
    spaceId,
    memberId,
    guardianTabId ?? "",
  );

  if (!guardianTabId || loading || fields.length === 0) {
    return null;
  }

  return (
    <Section title="비상 연락 정보">
      <CustomTabContent
        spaceId={spaceId}
        memberId={memberId}
        tabId={guardianTabId}
      />
    </Section>
  );
}

export function TabMemberOverview({
  member,
  onMemberUpdated,
  overviewTabId,
  guardianTabId,
  memos = [],
  memosLoading = false,
  memosError = null,
  totalMemoCount = memos.length,
  onManageFields,
}: TabMemberOverviewProps) {
  const counselingCount = member.counselingRecordCount ?? 0;
  const lastCounselingAt = member.lastCounselingAt ?? null;

  const resolvedRiskLevel = member.aiRiskLevel ?? member.initialRiskLevel;
  const statusMeta = STATUS_LABEL[member.status] ?? {
    label: member.status,
    color: "var(--text)",
  };
  const riskMeta = resolvedRiskLevel
    ? (RISK_LABEL[resolvedRiskLevel] ?? {
        label: resolvedRiskLevel,
        color: "var(--text)",
      })
    : null;
  const latestMemo = memos[0] ?? null;

  return (
    <div className="pt-1">
      {/* 연락처 & 기본 정보 */}
      <Section title="연락처">
        <DataRow label="이름" value={member.name} filled={!!member.name} />
        <DataRow
          label="이메일"
          value={member.email ?? ""}
          filled={!!member.email}
        />
        <DataRow
          label="전화번호"
          value={member.phone ?? ""}
          filled={!!member.phone}
        />
      </Section>

      {/* 운영 상태 */}
      <Section title="운영 상태">
        <DataRow
          label="수강 상태"
          value={statusMeta.label}
          filled={!!member.status}
          valueColor={statusMeta.color}
        />
        <DataRow
          label="위험도"
          value={
            riskMeta
              ? member.aiRiskLevel
                ? `${riskMeta.label} · 상담 AI 기준`
                : riskMeta.label
              : ""
          }
          filled={!!riskMeta}
          valueColor={riskMeta?.color}
          note={member.aiRiskSummary ?? undefined}
        />
        <DataRow
          label="등록일"
          value={fmtDate(member.createdAt)}
          filled={true}
        />
      </Section>

      {/* 상담 기록 */}
      <Section title="상담 기록">
        <DataRow
          label="연결된 상담"
          value={`${counselingCount}건`}
          filled={counselingCount > 0}
          note={lastCounselingAt ? fmtRelative(lastCounselingAt) : undefined}
        />
        <DataRow
          label="운영 메모"
          value={
            memosLoading
              ? "불러오는 중..."
              : memosError
                ? "불러오기 실패"
                : `${totalMemoCount}건`
          }
          filled={memosLoading || !!memosError || memos.length > 0}
          note={
            !memosLoading && !memosError && latestMemo
              ? latestMemo.date
              : undefined
          }
          valueColor={memosError ? "#f87171" : undefined}
        />
        <DataRow
          label="AI 위험 신호"
          value={
            member.aiRiskSignals?.length ? member.aiRiskSignals.join(", ") : ""
          }
          filled={!!(member.aiRiskSignals && member.aiRiskSignals.length > 0)}
        />
      </Section>

      {!memosLoading && !memosError && latestMemo ? (
        <Section title="최근 메모">
          <div className="py-3 text-[13px] leading-[1.7] text-text-secondary">
            <div className="mb-1 text-[11px] text-text-dim">
              {latestMemo.date}
              {latestMemo.author ? ` · ${latestMemo.author}` : ""}
            </div>
            <div>{latestMemo.text}</div>
          </div>
        </Section>
      ) : null}

      {/* 커스텀 필드 (개요 탭에 연결된 필드) */}
      {overviewTabId && (
        <Section
          title="추가 정보"
          action={
            onManageFields && (
              <button
                className="flex items-center gap-1 text-[10px] text-text-dim hover:text-text-secondary border-none bg-transparent cursor-pointer transition-colors p-0"
                onClick={onManageFields}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M5 1v8M1 5h8"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                  />
                </svg>
                필드 추가
              </button>
            )
          }
        >
          <CustomTabContent
            spaceId={member.spaceId}
            memberId={member.id}
            tabId={overviewTabId}
          />
        </Section>
      )}

      {guardianTabId && (
        <LegacyGuardianFieldsSection
          spaceId={member.spaceId}
          memberId={member.id}
          guardianTabId={guardianTabId}
        />
      )}

      {/* AI 프로필 자동완성 */}
      <ProfileImportPanel member={member} onSaved={onMemberUpdated} />
    </div>
  );
}
