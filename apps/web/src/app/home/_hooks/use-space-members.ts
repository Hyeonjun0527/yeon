"use client";

import { useState, useEffect } from "react";
import type { RecordItem } from "../_lib/types";

export interface SpaceMember {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  status: string;
}

export interface MemberWithStatus {
  id: string;
  name: string;
  status: string;
  counselingCount: number;
  lastCounselingAt: string | null; /* ISO string */
  /** 마지막 상담 경과 일수 (null = 상담 없음) */
  daysSinceLast: number | null;
  /** "recent" < 14일 | "warning" 14~30일 | "none" 상담 없음 또는 30일 초과 */
  indicator: "recent" | "warning" | "none";
}

function computeIndicator(daysSinceLast: number | null): MemberWithStatus["indicator"] {
  if (daysSinceLast === null) return "none";
  if (daysSinceLast <= 14) return "recent";
  if (daysSinceLast <= 30) return "warning";
  return "none";
}

export function useSpaceMembers(
  spaceId: string | null,
  records: RecordItem[],
): {
  members: MemberWithStatus[];
  loading: boolean;
} {
  const [rawMembers, setRawMembers] = useState<SpaceMember[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!spaceId) {
      setRawMembers([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/v1/spaces/${spaceId}/members`)
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as { members: SpaceMember[] };
        if (!cancelled) setRawMembers(data.members);
      })
      .catch(() => {/* 무시 */})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  /* records에서 memberId별 마지막 상담 날짜 계산 */
  const members: MemberWithStatus[] = rawMembers.map((member) => {
    const memberRecords = records.filter(
      (r) => r.memberId === member.id && r.status === "ready",
    );

    if (memberRecords.length === 0) {
      return {
        ...member,
        counselingCount: 0,
        lastCounselingAt: null,
        daysSinceLast: null,
        indicator: "none",
      };
    }

    /* 가장 최근 기록 */
    const sorted = [...memberRecords].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const lastDate = sorted[0].createdAt;
    const daysSinceLast = Math.floor(
      (Date.now() - new Date(lastDate).getTime()) / 86400000,
    );

    return {
      ...member,
      counselingCount: memberRecords.length,
      lastCounselingAt: lastDate,
      daysSinceLast,
      indicator: computeIndicator(daysSinceLast),
    };
  });

  return { members, loading };
}
