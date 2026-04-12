"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useStudentManagement } from "../student-management-provider";
import type { Member, RiskLevel, ViewMode } from "../types";
import { createPatchedHref, isOneOf } from "@/lib/route-state/search-params";

type MemberSortKey = "name" | "createdAt" | "status";
const MEMBER_LIST_VIEW_STORAGE_KEY = "yeon_member_list_view_mode";

function isViewMode(value: string | null): value is ViewMode {
  return value === "card" || value === "dense" || value === "table";
}

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
    result = result.filter(
      (m) => (m.aiRiskLevel ?? m.initialRiskLevel) === filters.riskLevel,
    );
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
  const router = useRouter();
  const pathname = usePathname();
  const getCurrentSearchParams = useCallback(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const { members, membersLoading, membersError, spacesLoading } =
    useStudentManagement();

  const [fallbackViewMode, setFallbackViewMode] = useState<ViewMode>("card");

  useEffect(() => {
    const savedViewMode = window.localStorage.getItem(
      MEMBER_LIST_VIEW_STORAGE_KEY,
    );

    if (!isViewMode(savedViewMode)) {
      return;
    }

    setFallbackViewMode(savedViewMode === "table" ? "card" : savedViewMode);
  }, []);

  const currentSearchParams = getCurrentSearchParams();
  const search = currentSearchParams.get("q") ?? "";
  const statusFilter = currentSearchParams.get("status") ?? "all";
  const riskParam = currentSearchParams.get("risk");
  const riskLevelFilter: RiskLevel | "all" = isOneOf(riskParam, [
    "high",
    "medium",
    "low",
  ] as const)
    ? riskParam
    : "all";
  const viewParam = currentSearchParams.get("view");
  const viewMode = isViewMode(viewParam)
    ? viewParam === "table"
      ? "card"
      : viewParam
    : fallbackViewMode;
  const sortParam = currentSearchParams.get("sort");
  const sortKey: MemberSortKey = isOneOf(sortParam, [
    "name",
    "createdAt",
    "status",
  ] as const)
    ? sortParam
    : "createdAt";

  const updateRouteState = useCallback(
    (patch: Record<string, string | null>) => {
      router.replace(
        createPatchedHref(pathname, getCurrentSearchParams(), patch),
      );
    },
    [getCurrentSearchParams, pathname, router],
  );

  const setSearch = useCallback(
    (value: string) => {
      updateRouteState({ q: value || null });
    },
    [updateRouteState],
  );

  const setStatusFilter = useCallback(
    (value: string | "all") => {
      updateRouteState({ status: value === "all" ? null : value });
    },
    [updateRouteState],
  );

  const setRiskLevelFilter = useCallback(
    (value: RiskLevel | "all") => {
      updateRouteState({ risk: value === "all" ? null : value });
    },
    [updateRouteState],
  );

  const setViewMode = useCallback(
    (value: ViewMode) => {
      window.localStorage.setItem(MEMBER_LIST_VIEW_STORAGE_KEY, value);
      setFallbackViewMode(value);
      updateRouteState({ view: value === "card" ? null : value });
    },
    [updateRouteState],
  );

  const setSortKey = useCallback(
    (value: MemberSortKey) => {
      updateRouteState({ sort: value === "createdAt" ? null : value });
    },
    [updateRouteState],
  );

  useEffect(() => {
    window.localStorage.setItem(MEMBER_LIST_VIEW_STORAGE_KEY, viewMode);
  }, [viewMode]);

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
