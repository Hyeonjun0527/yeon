import {
  listCounselingRecordsResponseSchema,
  type CounselingRecordListItem,
} from "@yeon/api-contract/counseling-records";
import { useEffect, useDeferredValue, useMemo, useState, startTransition } from "react";
import type { RecordFilter, SidebarViewMode } from "../types";
import { fetchApi, upsertRecordList } from "../utils";

export function useRecordList() {
  const [records, setRecords] = useState<CounselingRecordListItem[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [recordFilter, setRecordFilter] = useState<RecordFilter>("all");
  const [sidebarViewMode, setSidebarViewMode] =
    useState<SidebarViewMode>("all");
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(
    new Set(),
  );
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(
    null,
  );
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const deferredSearchTerm = useDeferredValue(searchTerm);
  const normalizedSearchTerm = deferredSearchTerm.trim().toLowerCase();

  // 초기 목록 로드
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
          setSelectedRecordId(
            (current) => current ?? data.records[0]?.id ?? null,
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
  }, []);

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
      (record) => record.id === selectedRecordId,
    );

    if (selectedRecordIsVisible) {
      return;
    }

    startTransition(() => {
      setSelectedRecordId(filteredRecords[0].id);
    });
  }, [filteredRecords, selectedRecordId]);

  const selectedRecord =
    filteredRecords.find((record) => record.id === selectedRecordId) ??
    records.find((record) => record.id === selectedRecordId) ??
    null;

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
    selectedRecordId,
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
