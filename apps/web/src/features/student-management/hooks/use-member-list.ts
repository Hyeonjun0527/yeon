"use client";

import { useMemo, useState } from "react";
import { useStudentManagement } from "../student-management-provider";
import type { Member, RiskLevel, ViewMode } from "../types";

type MemberSortKey = "name" | "createdAt" | "status";

function filterMembers(
  members: Member[],
  filters: {
    search?: string;
    status?: string | "all";
    riskLevel?: RiskLevel | "all";
  },
): Member[] {
  let result = members;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.phone && m.phone.includes(q)),
    );
  }

  if (filters.status && filters.status !== "all") {
    result = result.filter((m) => m.status === filters.status);
  }

  if (filters.riskLevel && filters.riskLevel !== "all") {
    result = result.filter((m) => m.initialRiskLevel === filters.riskLevel);
  }

  return result;
}

function sortMembers(members: Member[], key: MemberSortKey): Member[] {
  const sorted = [...members];
  sorted.sort((a, b) => {
    if (key === "name") return a.name.localeCompare(b.name, "ko");
    if (key === "createdAt")
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    return a.status.localeCompare(b.status);
  });
  return sorted;
}

export function useMemberList() {
  const { members, membersLoading, membersError, spacesLoading } =
    useStudentManagement();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [riskLevelFilter, setRiskLevelFilter] = useState<RiskLevel | "all">(
    "all",
  );
  const [viewMode, setViewMode] = useState<ViewMode>("card");
  const [sortKey, setSortKey] = useState<MemberSortKey>("createdAt");

  const filteredMembers = useMemo(() => {
    const filtered = filterMembers(members, {
      search,
      status: statusFilter,
      riskLevel: riskLevelFilter,
    });
    return sortMembers(filtered, sortKey);
  }, [members, search, statusFilter, riskLevelFilter, sortKey]);

  return {
    filteredMembers,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    riskLevelFilter,
    setRiskLevelFilter,
    viewMode,
    setViewMode,
    sortKey,
    setSortKey,
    loading: spacesLoading || membersLoading,
    error: membersError,
  };
}
