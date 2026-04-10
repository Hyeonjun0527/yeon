"use client";

import { useEffect, useState } from "react";
import { useStudentManagement } from "../student-management-provider";
import type { ActivityLog, Member } from "../types";

interface UseMemberDetailParams {
  memberId: string;
}

export function useMemberDetail({ memberId }: UseMemberDetailParams) {
  const { members, selectedSpaceId } = useStudentManagement();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState<string | null>(null);

  const member: Member | undefined = members.find((m) => m.id === memberId);

  useEffect(() => {
    if (!selectedSpaceId || !memberId) return;

    let cancelled = false;
    setLogsLoading(true);
    setLogsError(null);

    fetch(`/api/v1/spaces/${selectedSpaceId}/members/${memberId}/activity-logs`)
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
  }, [selectedSpaceId, memberId]);

  return {
    member,
    activeTab,
    setActiveTab,
    activityLogs,
    logsLoading,
    logsError,
  };
}
