"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useStudentManagement } from "../student-management-provider";
import type { Member } from "../types";
import { createPatchedHref } from "@/lib/route-state/search-params";

interface UseMemberDetailParams {
  memberId: string;
}

function readActiveTabFromUrl() {
  if (typeof window === "undefined") {
    return "overview";
  }

  return new URLSearchParams(window.location.search).get("tab") ?? "overview";
}

export function useMemberDetail({ memberId }: UseMemberDetailParams) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const getCurrentSearchParams = useCallback(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const { members, selectedSpaceId, setSelectedSpaceId } =
    useStudentManagement();
  const [activeTab, setActiveTabState] = useState(readActiveTabFromUrl);

  const contextMember: Member | undefined = members.find(
    (m) => m.id === memberId,
  );
  const cachedMember = useMemo(() => {
    const cachedMemberLists = queryClient.getQueriesData<{ members: Member[] }>(
      {
        queryKey: ["members"],
      },
    );

    for (const [, payload] of cachedMemberLists) {
      const matchedMember = payload?.members.find(
        (member) => member.id === memberId,
      );
      if (matchedMember) {
        return matchedMember;
      }
    }

    return undefined;
  }, [memberId, queryClient]);
  const fallbackMember = contextMember ?? cachedMember;

  // context에 없으면 API에서 직접 fetch (직접 URL 접근 시)
  const { data: memberData } = useQuery({
    queryKey: ["member", memberId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/members/${memberId}`);
      if (!res.ok) return null;
      return res.json() as Promise<{ member: Member }>;
    },
    enabled: !contextMember,
    initialData: cachedMember ? { member: cachedMember } : undefined,
  });

  // 사이드바에서 해당 스페이스가 선택되도록 자동 설정
  useEffect(() => {
    const nextSpaceId = contextMember?.spaceId ?? memberData?.member?.spaceId;

    if (nextSpaceId && selectedSpaceId !== nextSpaceId) {
      setSelectedSpaceId(nextSpaceId);
    }
  }, [
    contextMember?.spaceId,
    memberData?.member?.spaceId,
    selectedSpaceId,
    setSelectedSpaceId,
  ]);

  useEffect(() => {
    const syncActiveTabFromUrl = () => {
      const nextActiveTab = readActiveTabFromUrl();
      setActiveTabState((current) =>
        current === nextActiveTab ? current : nextActiveTab,
      );
    };

    syncActiveTabFromUrl();

    if (typeof window === "undefined") {
      return;
    }

    window.addEventListener("popstate", syncActiveTabFromUrl);

    return () => {
      window.removeEventListener("popstate", syncActiveTabFromUrl);
    };
  }, [memberId, pathname]);

  const member: Member | undefined =
    contextMember ??
    (memberData?.member && selectedSpaceId === memberData.member.spaceId
      ? memberData.member
      : fallbackMember);

  const setActiveTab = useCallback(
    (tab: string) => {
      setActiveTabState((current) => (current === tab ? current : tab));

      const nextHref = createPatchedHref(pathname, getCurrentSearchParams(), {
        tab,
      });

      if (typeof window !== "undefined") {
        const currentHref = `${window.location.pathname}${window.location.search}`;

        if (currentHref === nextHref) {
          return;
        }
      }

      router.replace(nextHref);
    },
    [getCurrentSearchParams, pathname, router],
  );

  return {
    member,
    activeTab,
    setActiveTab,
  };
}
