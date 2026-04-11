"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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

function computeIndicator(
  daysSinceLast: number | null,
): MemberWithStatus["indicator"] {
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
  const { data, isPending } = useQuery({
    queryKey: ["space-members", spaceId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/spaces/${spaceId}/members`);
      if (!res.ok) return { members: [] as SpaceMember[] };
      return res.json() as Promise<{ members: SpaceMember[] }>;
    },
    enabled: !!spaceId,
  });

  const rawMembers = data ? data.members : ([] as SpaceMember[]);
  // spaceId가 없으면 쿼리가 disabled → isPending=true 고정이므로 !!spaceId로 가드
  const loading = !!spaceId && isPending;

  const members = useMemo(
    (): MemberWithStatus[] =>
      rawMembers.map((member) => {
        const memberRecords = records.filter((r) => r.memberId === member.id);

        if (memberRecords.length === 0) {
          return {
            ...member,
            counselingCount: 0,
            lastCounselingAt: null,
            daysSinceLast: null,
            indicator: "none" as const,
          };
        }

        const sorted = [...memberRecords].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
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
      }),
    [rawMembers, records],
  );

  return { members, loading };
}
