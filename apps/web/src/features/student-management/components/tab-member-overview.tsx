"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Member } from "../types";
import { fmtDate, fmtRelative } from "../utils";
import { ProfileImportPanel } from "./profile-import-panel";
import { CustomTabContent } from "./custom-tab-content";

interface TabMemberOverviewProps {
  member: Member;
  onMemberUpdated?: () => void;
  overviewTabId?: string;
  /** 제공 시 "추가 정보" 섹션 헤더에 필드 관리 버튼 표시 */
  onManageFields?: () => void;
}

interface CounselingStats {
  count: number;
  lastDate: string | null;
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
        style={{ color: filled ? (valueColor ?? "var(--text)") : "rgba(255,255,255,0.2)" }}
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

export function TabMemberOverview({ member, onMemberUpdated, overviewTabId, onManageFields }: TabMemberOverviewProps) {
  const { data: counselingData } = useQuery({
    queryKey: ["member-counseling-stats", member.spaceId, member.id],
    queryFn: async () => {
      const res = await fetch(`/api/v1/spaces/${member.spaceId}/members/${member.id}/counseling-records`);
      if (!res.ok) return { records: [] as { createdAt: string }[] };
      return res.json() as Promise<{ records: { createdAt: string }[] }>;
    },
  });

  const counseling = useMemo((): CounselingStats | null => {
    if (!counselingData) return null;
    const sorted = [...counselingData.records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    return {
      count: sorted.length,
      lastDate: sorted[0]?.createdAt ?? null,
    };
  }, [counselingData]);

  const fields = [
    !!member.name,
    !!member.email,
    !!member.phone,
    !!member.status,
    !!member.initialRiskLevel,
    !!(counseling && counseling.count > 0),
  ];
  const filledCount = fields.filter(Boolean).length;
  const totalCount = fields.length;
  const pct = Math.round((filledCount / totalCount) * 100);

  const statusMeta = STATUS_LABEL[member.status] ?? {
    label: member.status,
    color: "var(--text)",
  };
  const riskMeta = member.initialRiskLevel
    ? (RISK_LABEL[member.initialRiskLevel] ?? {
        label: member.initialRiskLevel,
        color: "var(--text)",
      })
    : null;

  return (
    <div className="pt-1">
      {/* 완성도 헤더 */}
      <div className="mb-5 p-4 bg-surface-2 border border-border rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] font-semibold text-text-secondary tracking-tight">
            프로필 완성도
          </span>
          <span className="text-[13px] font-semibold font-mono" style={{ color: pct >= 80 ? "var(--accent)" : pct >= 50 ? "#fbbf24" : "#f87171" }}>
            {filledCount}/{totalCount} · {pct}%
          </span>
        </div>
        <div className="h-[3px] bg-surface-4 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${pct}%`,
              background: pct >= 80 ? "var(--accent)" : pct >= 50 ? "#fbbf24" : "#f87171",
            }}
          />
        </div>
        {pct < 100 && (
          <p className="text-[11px] text-text-dim mt-2">
            {totalCount - filledCount}개 항목이 미입력 상태입니다.
          </p>
        )}
      </div>

      {/* 연락처 & 기본 정보 */}
      <Section title="연락처">
        <DataRow label="이름" value={member.name} filled={!!member.name} />
        <DataRow label="이메일" value={member.email ?? ""} filled={!!member.email} />
        <DataRow label="전화번호" value={member.phone ?? ""} filled={!!member.phone} />
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
          value={riskMeta?.label ?? ""}
          filled={!!riskMeta}
          valueColor={riskMeta?.color}
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
          value={`${counseling?.count ?? "─"}건`}
          filled={!!(counseling && counseling.count > 0)}
          note={
            counseling?.lastDate
              ? fmtRelative(counseling.lastDate)
              : undefined
          }
        />
      </Section>

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
                  <path d="M5 1v8M1 5h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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

      {/* AI 프로필 자동완성 */}
      <ProfileImportPanel
        member={member}
        onSaved={() => onMemberUpdated?.()}
      />
    </div>
  );
}
