"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStudentManagement } from "../student-management-provider";
import type { ActivityLog, Member } from "../types";

interface UseMemberDetailParams {
  memberId: string;
}

export function useMemberDetail({ memberId }: UseMemberDetailParams) {
  const { members, selectedSpaceId, setSelectedSpaceId } = useStudentManagement();
  const [activeTab, setActiveTab] = useState<string>("overview");

  const contextMember: Member | undefined = members.find((m) => m.id === memberId);

  // context에 없으면 API에서 직접 fetch (직접 URL 접근 시)
  const { data: memberData } = useQuery({
    queryKey: ["member", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/members/${memberId}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ member: Member }>;
    },
    enabled: !contextMember,
  });

  // 사이드바에서 해당 스페이스가 선택되도록 자동 설정
  useEffect(() => {
    if (memberData?.member) {
      setSelectedSpaceId(memberData.member.spaceId);
    }
  }, [memberData, setSelectedSpaceId]);

  const member: Member | undefined = contextMember ?? memberData?.member ?? undefined;
  const spaceId = member?.spaceId ?? selectedSpaceId;

  const { data: logsData, isPending: logsPending, error: logsQueryError } = useQuery({
    queryKey: ["activity-logs", spaceId, memberId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/spaces/${spaceId}/members/${memberId}/activity-logs`);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "활동 로그를 불러오지 못했습니다.");
      }
      return res.json() as Promise<{ logs: ActivityLog[] }>;
    },
    enabled: !!spaceId && !!memberId,
  });

  const activityLogs = logsData ? logsData.logs : ([] as ActivityLog[]);
  // spaceId/memberId 없으면 쿼리 disabled → isPending=true 고정이므로 가드
  const logsLoading = !!spaceId && !!memberId && logsPending;
  const logsError =
    logsQueryError instanceof Error
      ? logsQueryError.message
      : logsQueryError
        ? "활동 로그를 불러오지 못했습니다."
        : null;

  return {
    member,
    activeTab,
    setActiveTab,
    activityLogs,
    logsLoading,
    logsError,
  };
}
