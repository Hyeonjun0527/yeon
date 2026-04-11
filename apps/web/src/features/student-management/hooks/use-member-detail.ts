"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useStudentManagement } from "../student-management-provider";
import type { Member } from "../types";

interface UseMemberDetailParams {
  memberId: string;
}

export function useMemberDetail({ memberId }: UseMemberDetailParams) {
  const { members, selectedSpaceId, setSelectedSpaceId } =
    useStudentManagement();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const hasAlignedFetchedMemberSpaceRef = useRef(false);

  const contextMember: Member | undefined = members.find(
    (m) => m.id === memberId,
  );

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
    if (memberData?.member && !hasAlignedFetchedMemberSpaceRef.current) {
      hasAlignedFetchedMemberSpaceRef.current = true;
      setSelectedSpaceId(memberData.member.spaceId);
    }
  }, [memberData, setSelectedSpaceId]);

  const member: Member | undefined =
    contextMember ??
    (memberData?.member && selectedSpaceId === memberData.member.spaceId
      ? memberData.member
      : undefined);

  return {
    member,
    activeTab,
    setActiveTab,
  };
}
