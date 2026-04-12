import {
  listCounselingRecordsResponseSchema,
  type CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";
import {
  useEffect,
  useDeferredValue,
  useMemo,
  useState,
  startTransition,
  useCallback,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { RecordFilter, SidebarViewMode } from "../types";
import { fetchApi, upsertRecordList } from "../utils";
import { PROCESSING_REFRESH_INTERVAL_MS } from "../constants";
import {
  createPatchedHref,
  isOneOf,
  parseCsvParam,
  serializeCsvParam,
} from "@/lib/route-state/search-params";

export function useRecordList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<CounselingRecordListItem[]>([]);
  const [selectedRecordIdState, setSelectedRecordIdState] = useState<
    string | null
  >(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const routeRecordId = searchParams.get("recordId");
  const searchTerm = searchParams.get("q") ?? "";
  const rawRecordFilter = searchParams.get("filter");
  const recordFilter: RecordFilter = isOneOf(rawRecordFilter, [
    "all",
    "ready",
    "processing",
    "error",
  ] as const)
    ? rawRecordFilter
    : "all";
  const rawSidebarViewMode = searchParams.get("view");
  const sidebarViewMode: SidebarViewMode = isOneOf(rawSidebarViewMode, [
    "all",
    "student",
  ] as const)
    ? rawSidebarViewMode
    : "all";
  const expandedStudents = useMemo(
    () => new Set(parseCsvParam(searchParams.get("expanded"))),
    [searchParams],
  );
  const selectedStudentName = searchParams.get("studentName");

  const replaceRouteState = useCallback(
    (patch: Record<string, string | null>) => {
      router.replace(createPatchedHref(pathname, searchParams, patch));
    },
    [pathname, router, searchParams],
  );

  const setSelectedRecordId = useCallback(
    (value: string | null | ((current: string | null) => string | null)) => {
      setSelectedRecordIdState((current) => {
        const next = typeof value === "function" ? value(current) : value;
        replaceRouteState({ recordId: next, studentName: null });
        return next;
      });
    },
    [replaceRouteState],
  );

  const setSearchTerm = useCallback(
    (value: string) => {
      replaceRouteState({ q: value || null });
    },
    [replaceRouteState],
  );

  const setRecordFilter = useCallback(
    (value: RecordFilter) => {
      replaceRouteState({ filter: value === "all" ? null : value });
    },
    [replaceRouteState],
  );

  const setSidebarViewMode = useCallback(
    (value: SidebarViewMode) => {
      replaceRouteState({ view: value === "all" ? null : value });
    },
    [replaceRouteState],
  );

  const setExpandedStudents = useCallback(
    (value: Set<string> | ((current: Set<string>) => Set<string>)) => {
      const next =
        typeof value === "function" ? value(expandedStudents) : value;
      replaceRouteState({ expanded: serializeCsvParam(next) });
    },
    [expandedStudents, replaceRouteState],
  );

  const setSelectedStudentName = useCallback(
    (value: string | null) => {
      replaceRouteState({ studentName: value, recordId: null });
    },
    [replaceRouteState],
  );

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();

  // 초기 목록 로드
  useEffect(() => {
    if (!routeRecordId) return;

    setSelectedRecordIdState((current) =>
      current === routeRecordId ? current : routeRecordId,
    );
  }, [routeRecordId]);

  useEffect(() => {
    let ignore = false;

    async function loadList() {
      setIsLoadingList(true);
      setLoadError(null);

      try {
        const data = await fetchApi(
          "/api/v1/counseling-records",
          {
            method: "GET",
          },
          listCounselingRecordsResponseSchema.parse,
        );

        if (ignore) {
          return;
        }

        startTransition(() => {
          setRecords(data.records);
          setSelectedRecordIdState(
            (current) =>
              routeRecordId ?? current ?? data.records[0]?.id ?? null,
          );
        });
      } catch (error) {
        if (ignore) {
          return;
        }

        const message =
          error instanceof Error
            ? error.message
            : "상담 기록 목록을 불러오지 못했습니다.";
        setLoadError(message);
      } finally {
        if (!ignore) {
          setIsLoadingList(false);
        }
      }
    }

    void loadList();

    return () => {
      ignore = true;
    };
  }, [routeRecordId]);

  useEffect(() => {
    if (
      !records.some(
        (record) =>
          record.status === "processing" ||
          ["queued", "processing"].includes(record.analysisStatus),
      )
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const data = await fetchApi(
            "/api/v1/counseling-records",
            {
              method: "GET",
            },
            listCounselingRecordsResponseSchema.parse,
          );

          startTransition(() => {
            setRecords(data.records);
          });
        } catch {
          // ignore polling errors
        }
      })();
    }, PROCESSING_REFRESH_INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [records]);

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        if (recordFilter !== "all" && record.status !== recordFilter) {
          return false;
        }

        if (!normalizedSearchTerm) {
          return true;
        }

        return [
          record.studentName,
          record.sessionTitle,
          record.preview,
          ...record.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedSearchTerm);
      }),
    [records, recordFilter, normalizedSearchTerm],
  );

  // 필터 보정: 선택된 레코드가 필터에서 안 보이면 첫 번째로 이동
  useEffect(() => {
    if (filteredRecords.length === 0) {
      return;
    }

    const selectedRecordIsVisible = filteredRecords.some(
      (record) => record.id === selectedRecordIdState,
    );

    if (selectedRecordIsVisible) {
      return;
    }

    startTransition(() => {
      setSelectedRecordId(filteredRecords[0].id);
    });
  }, [filteredRecords, selectedRecordIdState, setSelectedRecordId]);

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedRecordIdState) ??
    records.find((record) => record.id === selectedRecordIdState) ??
    null;

  useEffect(() => {
    if (
      routeRecordId === selectedRecordIdState &&
      searchParams.get("studentName") === selectedStudentName
    ) {
      return;
    }

    if (!selectedRecordIdState && !selectedStudentName) {
      return;
    }

    replaceRouteState({
      recordId: selectedStudentName ? null : selectedRecordIdState,
      studentName: selectedStudentName,
    });
  }, [
    replaceRouteState,
    routeRecordId,
    searchParams,
    selectedRecordIdState,
    selectedStudentName,
  ]);

  // 78차: 학생별 그룹
  const studentGroups = (() => {
    const map = new Map<
      string,
      { records: CounselingRecordListItem[]; lastCounselingAt: string }
    >();

    for (const record of filteredRecords) {
      const group = map.get(record.studentName);

      if (group) {
        group.records.push(record);

        if (record.createdAt > group.lastCounselingAt) {
          group.lastCounselingAt = record.createdAt;
        }
      } else {
        map.set(record.studentName, {
          records: [record],
          lastCounselingAt: record.createdAt,
        });
      }
    }

    return Array.from(map.entries())
      .map(([name, { records: groupRecords, lastCounselingAt }]) => ({
        studentName: name,
        records: groupRecords,
        recordCount: groupRecords.length,
        lastCounselingAt,
      }))
      .sort(
        (a, b) =>
          new Date(b.lastCounselingAt).getTime() -
          new Date(a.lastCounselingAt).getTime(),
      );
  })();

  function handleSelectRecord(recordId: string) {
    startTransition(() => {
      setSelectedRecordId(recordId);
    });
  }

  return {
    records,
    setRecords,
    selectedRecordId: selectedRecordIdState,
    setSelectedRecordId,
    searchTerm,
    setSearchTerm,
    recordFilter,
    setRecordFilter,
    sidebarViewMode,
    setSidebarViewMode,
    expandedStudents,
    setExpandedStudents,
    selectedStudentName,
    setSelectedStudentName,
    isFilterOpen,
    setIsFilterOpen,
    isLoadingList,
    loadError,
    filteredRecords,
    studentGroups,
    selectedRecord,
    handleSelectRecord,
    upsertRecordList,
  };
}
