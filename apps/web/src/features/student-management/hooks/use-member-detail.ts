"use client";

import { useEffect, useState } from "react";
import { useStudentManagement } from "../student-management-provider";
import type { ActivityLog, Member } from "../types";

interface UseMemberDetailParams {
  memberId: string;
}

export function useMemberDetail({ memberId }: UseMemberDetailParams) {
  const { members, selectedSpaceId, setSelectedSpaceId } = useStudentManagement();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);
  const [fetchedMember, setFetchedMember] = useState<Member | null>(null);

  const contextMember: Member | undefined = members.find((m) => m.id === memberId);
  const member: Member | undefined = contextMember ?? fetchedMember ?? undefined;

  // context에 없으면 API에서 직접 fetch (직접 URL 접근 시)
  useEffect(() => {
    if (contextMember) return;
    let cancelled = false;

    fetch(`/api/v1/members/${memberId}`)
      .then((res) => res.ok ? res.json() as Promise<{ member: Member }> : Promise.reject())
      .then((data) => {
        if (cancelled) return;
        setFetchedMember(data.member);
        // 사이드바에서 해당 스페이스가 선택되도록 자동 설정
        setSelectedSpaceId(data.member.spaceId);
      })
      .catch(() => {/* 조회 실패는 무시 — member undefined로 처리됨 */});

    return () => { cancelled = true; };
  }, [memberId, contextMember, setSelectedSpaceId]);

  const spaceId = member?.spaceId ?? selectedSpaceId;

  useEffect(() => {
    if (!spaceId || !memberId) return;

    let cancelled = false;
    setLogsLoading(true);
    setLogsError(null);

    fetch(`/api/v1/spaces/${spaceId}/members/${memberId}/activity-logs`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "활동 로그를 불러오지 못했습니다.");
        }
        return res.json() as Promise<{ logs: ActivityLog[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setActivityLogs(data.logs);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // activity-logs 엔드포인트가 아직 없을 수 있으므로 에러를 무시하고 빈 배열로 유지
        const message =
          err instanceof Error ? err.message : "활동 로그를 불러오지 못했습니다.";
        setLogsError(message);
      })
      .finally(() => {
        if (!cancelled) setLogsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [spaceId, memberId]);

  return {
    member,
    activeTab,
    setActiveTab,
    activityLogs,
    logsLoading,
    logsError,
  };
}
