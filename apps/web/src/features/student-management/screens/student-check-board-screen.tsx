"use client";

import Link from "next/link";
import { ArrowLeft, ClipboardCheck } from "lucide-react";
import { CheckBoardTutorial } from "@/components/tutorial";
import { useRegisterTutorialPolicy } from "@/app/home/_components/home-sidebar-layout-context";
import { useAppRoute } from "@/lib/app-route-context";

import { useStudentManagement } from "../student-management-provider";
import { StudentCheckBoardPanel } from "../components/student-check-board-panel";

export function StudentCheckBoardScreen() {
  const { resolveAppHref } = useAppRoute();
  const { selectedSpaceId, members, membersLoading, membersError } =
    useStudentManagement();
  const checkBoardTutorialPolicy = !selectedSpaceId
    ? { mode: "empty" as const, showTrigger: false }
    : !membersLoading && !membersError
      ? { mode: "full" as const, showTrigger: true }
      : { mode: "disabled" as const, showTrigger: false };

  useRegisterTutorialPolicy("check-board", checkBoardTutorialPolicy);

  if (!selectedSpaceId) {
    return (
      <div className="space-y-5">
        <div
          className="rounded-2xl border border-border bg-surface p-5 text-center sm:p-8"
          data-tutorial="check-board-no-space"
        >
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ClipboardCheck size={22} />
          </div>
          <h2 className="text-xl font-semibold text-text">
            스페이스를 먼저 선택해 주세요
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            출석·과제 체크보드는 특정 스페이스 기준으로만 관리됩니다.
          </p>
          <Link
            href={resolveAppHref("/home/student-management")}
            data-tutorial="check-board-back-link"
            className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-light hover:text-text"
          >
            <ArrowLeft size={16} />
            학생관리로 돌아가기
          </Link>
        </div>
        <CheckBoardTutorial />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href={resolveAppHref("/home/student-management")}
        className="inline-flex w-fit items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm text-text-secondary transition-colors hover:border-border-light hover:text-text"
      >
        <ArrowLeft size={16} />
        학생관리로 돌아가기
      </Link>

      {membersLoading ? (
        <div className="rounded-2xl border border-border bg-surface p-6 text-sm text-text-secondary">
          수강생과 보드 정보를 불러오는 중...
        </div>
      ) : null}

      {membersError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
          {membersError}
        </div>
      ) : null}

      <StudentCheckBoardPanel spaceId={selectedSpaceId} members={members} />
      <CheckBoardTutorial />
    </div>
  );
}
