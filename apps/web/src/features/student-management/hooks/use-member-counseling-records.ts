"use client";

import { useQuery } from "@tanstack/react-query";
import type { CounselingRecordListItem } from "@yeon/api-contract/counseling-records";
import { resolveApiHrefForCurrentPath } from "@/lib/app-route-paths";

export function useMemberCounselingRecords(
  spaceId: string | null,
  memberId: string | null,
) {
  return useQuery({
    queryKey: ["member-counseling-records", spaceId, memberId],
    enabled: !!spaceId && !!memberId,
    queryFn: async () => {
      const res = await fetch(
        resolveApiHrefForCurrentPath(
          `/api/v1/spaces/${spaceId}/members/${memberId}/counseling-records`,
        ),
      );

      if (!res.ok) {
        throw new Error("상담 기록을 불러오지 못했습니다.");
      }

      return res.json() as Promise<{ records: CounselingRecordListItem[] }>;
    },
  });
}
