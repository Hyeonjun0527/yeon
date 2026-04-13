"use client";

import { useState } from "react";
import type {
  MemberStudentBoardResponse,
  StudentBoardHistoryPeriod,
} from "@yeon/api-contract";

import { useMemberStudentBoard } from "../hooks/use-space-student-board";
import { StudentBoardHistoryList } from "./student-board-history-list";

interface TabMemberStudentBoardProps {
  spaceId?: string | null;
  memberId?: string | null;
}

function toMemberBoardTabHistory(data: MemberStudentBoardResponse | undefined) {
  if (!data) {
    return [];
  }

  return data.history;
}

function toMemberBoardTabLoading(params: {
  status: string;
  fetchStatus: string;
}) {
  return params.status === "pending" && params.fetchStatus !== "idle";
}

export function TabMemberStudentBoard({
  spaceId,
  memberId,
}: TabMemberStudentBoardProps) {
  const [period, setPeriod] = useState<StudentBoardHistoryPeriod>("space");
  const historyQuery = useMemberStudentBoard(
    spaceId ?? null,
    memberId ?? null,
    period,
  );
  const history = toMemberBoardTabHistory(historyQuery.data);
  const loading = toMemberBoardTabLoading({
    status: historyQuery.status,
    fetchStatus: historyQuery.fetchStatus,
  });

  return (
    <div className="pt-1">
      <StudentBoardHistoryList
        period={period}
        history={history}
        onPeriodChange={setPeriod}
        loading={loading}
        error={
          historyQuery.error instanceof Error
            ? historyQuery.error.message
            : historyQuery.error
              ? "출석·과제 기록을 불러오지 못했습니다."
              : null
        }
        emptyMessage="출석·과제 기록이 없습니다."
        showMemberName={false}
      />
    </div>
  );
}
