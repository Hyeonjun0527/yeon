"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Link2,
  MapPin,
  QrCode,
} from "lucide-react";
import type {
  CreatePublicCheckSessionBody,
  StudentBoardResponse,
  StudentAssignmentStatus,
  StudentAttendanceStatus,
} from "@yeon/api-contract";

import type { Member } from "../types";
import { useSpaceStudentBoard } from "../hooks/use-space-student-board";

interface StudentCheckBoardPanelProps {
  spaceId: string;
  members: Member[];
}

type DraftRow = {
  attendanceStatus: StudentAttendanceStatus;
  assignmentStatus: StudentAssignmentStatus;
  assignmentLink: string;
};

function getCheckModeLabel(mode: CreatePublicCheckSessionBody["checkMode"]) {
  switch (mode) {
    case "attendance_only":
      return "출석";
    case "assignment_only":
      return "과제";
    case "attendance_and_assignment":
      return "출석+과제";
  }
}

function buildAbsoluteUrl(publicPath: string) {
  if (typeof window === "undefined") {
    return publicPath;
  }

  return `${window.location.origin}${publicPath}`;
}

function toBoardRows(data: StudentBoardResponse | undefined) {
  if (!data) {
    return [];
  }

  return data.rows;
}

function toBoardSessions(data: StudentBoardResponse | undefined) {
  if (!data) {
    return [];
  }

  return data.sessions;
}

function MethodToggleIndicator({ active }: { active: boolean }) {
  return (
    <div
      className={`relative flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors ${
        active ? "border-accent/60 bg-accent/20" : "border-border bg-surface-2"
      }`}
    >
      <div
        className={`h-4 w-4 rounded-full transition-transform ${
          active
            ? "translate-x-[22px] bg-accent"
            : "translate-x-[3px] bg-text-dim/60"
        }`}
      />
    </div>
  );
}

export function StudentCheckBoardPanel({
  spaceId,
  members,
}: StudentCheckBoardPanelProps) {
  const {
    data,
    loading,
    error,
    updateMemberBoard,
    createSession,
    updateSession,
  } = useSpaceStudentBoard(spaceId);
  const boardRows = useMemo(() => toBoardRows(data), [data]);
  const boardSessions = useMemo(() => toBoardSessions(data), [data]);
  const rowMap = useMemo(
    () => new Map(boardRows.map((row) => [row.memberId, row])),
    [boardRows],
  );
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [isExpanded, setIsExpanded] = useState(true);
  const [isComposerOpen, setIsComposerOpen] = useState(
    boardSessions.length === 0,
  );
  const [sessionForm, setSessionForm] = useState<CreatePublicCheckSessionBody>({
    title: "오늘 출석/과제 체크",
    checkMode: "attendance_and_assignment",
    enabledMethods: ["qr"],
    opensAt: null,
    closesAt: null,
    locationLabel: null,
    latitude: null,
    longitude: null,
    radiusMeters: 100,
  });

  useEffect(() => {
    if (boardRows.length === 0) return;

    setDrafts((prev) => {
      const next = { ...prev };
      for (const row of boardRows) {
        next[row.memberId] = {
          attendanceStatus: row.attendanceStatus,
          assignmentStatus: row.assignmentStatus,
          assignmentLink: row.assignmentLink ?? "",
        };
      }
      return next;
    });
  }, [boardRows]);

  const readyCount = boardRows.filter((row) => row.isSelfCheckReady).length;
  const presentCount = boardRows.filter(
    (row) => row.attendanceStatus === "present",
  ).length;
  const assignmentDoneCount = boardRows.filter(
    (row) => row.assignmentStatus === "done",
  ).length;

  const isCreatingSession = createSession.isPending;
  const isUpdatingBoard = updateMemberBoard.isPending;
  const isUpdatingSession = updateSession.isPending;

  const handleDraftChange = (memberId: string, patch: Partial<DraftRow>) => {
    setDrafts((prev) => ({
      ...prev,
      [memberId]: {
        attendanceStatus: prev[memberId]?.attendanceStatus ?? "unknown",
        assignmentStatus: prev[memberId]?.assignmentStatus ?? "unknown",
        assignmentLink: prev[memberId]?.assignmentLink ?? "",
        ...patch,
      },
    }));
  };

  const toggleEnabledMethod = (
    method: CreatePublicCheckSessionBody["enabledMethods"][number],
  ) => {
    setSessionForm((prev) => ({
      ...prev,
      enabledMethods: prev.enabledMethods.includes(method)
        ? prev.enabledMethods.filter((item) => item !== method)
        : [...prev.enabledMethods, method],
    }));
  };

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-3 sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-text sm:text-base">
            출석 · 과제 체크 보드
          </h3>
          <p className="mt-1 text-[11px] text-text-dim">
            운영용 상태 관리 · 공개 체크인 세션
          </p>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-text-secondary transition-colors hover:border-border-light hover:text-text"
          onClick={() => setIsExpanded((prev) => !prev)}
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isExpanded ? "접기" : "열기"}
        </button>
      </div>

      <div
        className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6"
        data-tutorial="check-board-summary"
      >
        <div className="rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
            전체 학생
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text">
            {members.length}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
            셀프체크 준비
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text">
            {readyCount}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
            출석
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text">
            {presentCount}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-3 py-3">
          <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
            과제 완료
          </div>
          <div className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text">
            {assignmentDoneCount}
          </div>
        </div>
        <div className="col-span-2 rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(129,140,248,0.08),rgba(129,140,248,0.02))] px-3 py-3 sm:col-span-1 xl:col-span-2">
          <div className="text-[10px] uppercase tracking-[0.14em] text-text-dim">
            활성 세션
          </div>
          <div className="mt-2 text-xl font-semibold tracking-[-0.03em] text-text">
            {
              boardSessions.filter((session) => session.status === "active")
                .length
            }
            개 열림
          </div>
        </div>
      </div>

      {isExpanded ? (
        <div className="space-y-4">
          <div
            className="rounded-2xl border border-border bg-surface-2 p-3 sm:p-4"
            data-tutorial="check-board-session-panel"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-text">
                  공개 체크인 세션
                </div>
                <p className="mt-1 text-[11px] text-text-dim">
                  QR / 위치 기반 세션 운영
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                disabled={isCreatingSession}
                onClick={() => setIsComposerOpen((prev) => !prev)}
              >
                {isComposerOpen ? (
                  <ChevronUp size={14} />
                ) : (
                  <ChevronDown size={14} />
                )}
                {isComposerOpen ? "입력 닫기" : "세션 만들기"}
              </button>
            </div>

            {isComposerOpen ? (
              <div className="mt-3 grid gap-2 sm:gap-3">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[1.5fr_1fr_1fr_1fr]">
                  <input
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
                    value={sessionForm.title}
                    onChange={(event) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        title: event.target.value,
                      }))
                    }
                    placeholder="세션 제목"
                  />
                  <select
                    className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
                    value={sessionForm.checkMode}
                    onChange={(event) =>
                      setSessionForm((prev) => ({
                        ...prev,
                        checkMode: event.target
                          .value as CreatePublicCheckSessionBody["checkMode"],
                      }))
                    }
                  >
                    <option value="attendance_and_assignment">
                      출석 + 과제
                    </option>
                    <option value="attendance_only">출석만</option>
                  </select>
                  <button
                    type="button"
                    aria-pressed={sessionForm.enabledMethods.includes("qr")}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      sessionForm.enabledMethods.includes("qr")
                        ? "border-accent/50 bg-accent/10 text-text"
                        : "border-border bg-surface text-text-secondary hover:border-border-light hover:text-text"
                    }`}
                    onClick={() => toggleEnabledMethod("qr")}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          sessionForm.enabledMethods.includes("qr")
                            ? "bg-accent/15 text-accent"
                            : "bg-surface-2 text-text-dim"
                        }`}
                      >
                        <QrCode size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium">QR 체크인</div>
                        <div className="mt-0.5 text-[11px] text-text-dim">
                          QR 스캔으로 출석·과제 제출 확인
                        </div>
                      </div>
                    </div>
                    <MethodToggleIndicator
                      active={sessionForm.enabledMethods.includes("qr")}
                    />
                  </button>
                  <button
                    type="button"
                    aria-pressed={sessionForm.enabledMethods.includes(
                      "location",
                    )}
                    className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      sessionForm.enabledMethods.includes("location")
                        ? "border-accent/50 bg-accent/10 text-text"
                        : "border-border bg-surface text-text-secondary hover:border-border-light hover:text-text"
                    }`}
                    onClick={() => toggleEnabledMethod("location")}
                  >
                    <div className="flex min-w-0 items-center gap-2.5">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          sessionForm.enabledMethods.includes("location")
                            ? "bg-accent/15 text-accent"
                            : "bg-surface-2 text-text-dim"
                        }`}
                      >
                        <MapPin size={15} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-medium">위치 인증</div>
                        <div className="mt-0.5 text-[11px] text-text-dim">
                          지정 위치에서 출석·과제 제출 허용
                        </div>
                      </div>
                    </div>
                    <MethodToggleIndicator
                      active={sessionForm.enabledMethods.includes("location")}
                    />
                  </button>
                </div>

                {sessionForm.enabledMethods.includes("location") ? (
                  <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                    <input
                      className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
                      value={sessionForm.locationLabel ?? ""}
                      onChange={(event) =>
                        setSessionForm((prev) => ({
                          ...prev,
                          locationLabel: event.target.value || null,
                        }))
                      }
                      placeholder="위치명"
                    />
                    <input
                      className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
                      value={sessionForm.latitude ?? ""}
                      onChange={(event) =>
                        setSessionForm((prev) => ({
                          ...prev,
                          latitude: event.target.value
                            ? Number(event.target.value)
                            : null,
                        }))
                      }
                      placeholder="위도"
                    />
                    <input
                      className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
                      value={sessionForm.longitude ?? ""}
                      onChange={(event) =>
                        setSessionForm((prev) => ({
                          ...prev,
                          longitude: event.target.value
                            ? Number(event.target.value)
                            : null,
                        }))
                      }
                      placeholder="경도"
                    />
                    <input
                      className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text outline-none"
                      value={sessionForm.radiusMeters ?? ""}
                      onChange={(event) =>
                        setSessionForm((prev) => ({
                          ...prev,
                          radiusMeters: event.target.value
                            ? Number(event.target.value)
                            : null,
                        }))
                      }
                      placeholder="반경(m)"
                    />
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <button
                    className="rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    disabled={
                      isCreatingSession ||
                      sessionForm.enabledMethods.length === 0
                    }
                    onClick={() => createSession.mutate(sessionForm)}
                  >
                    {isCreatingSession ? "생성 중..." : "체크인 세션 생성"}
                  </button>
                </div>
                {createSession.error instanceof Error ? (
                  <p className="text-sm text-red-300">
                    {createSession.error.message}
                  </p>
                ) : null}
              </div>
            ) : null}

            {boardSessions.length > 0 ? (
              <div className="mt-3 flex snap-x gap-2 overflow-x-auto pb-1">
                {boardSessions.map((session) => {
                  const publicUrl = buildAbsoluteUrl(session.publicPath);
                  return (
                    <div
                      key={session.id}
                      className="min-w-[260px] snap-start rounded-2xl border border-border bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-3 sm:min-w-[320px]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-text">
                            {session.title}
                          </div>
                          <div className="mt-1 text-[11px] text-text-secondary">
                            {session.enabledMethods.join(" + ")} ·{" "}
                            {getCheckModeLabel(session.checkMode)}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="rounded-lg border border-border px-2 py-1 text-[11px] text-text-secondary"
                          disabled={isUpdatingSession}
                          onClick={() =>
                            updateSession.mutate({
                              sessionId: session.id,
                              body: {
                                status:
                                  session.status === "active"
                                    ? "closed"
                                    : "active",
                              },
                            })
                          }
                        >
                          {session.status === "active" ? "닫기" : "열기"}
                        </button>
                      </div>

                      <div className="mt-3 min-w-0 flex-1 space-y-2">
                        <div className="break-all rounded-xl bg-surface-2 px-2.5 py-2 text-[11px] text-text-secondary">
                          {publicUrl}
                        </div>
                        {session.locationLabel ? (
                          <div className="text-[11px] text-text-secondary">
                            위치 기준: {session.locationLabel}
                            {session.radiusMeters
                              ? ` · ${session.radiusMeters}m`
                              : ""}
                          </div>
                        ) : null}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-text-secondary"
                            onClick={() =>
                              void navigator.clipboard.writeText(publicUrl)
                            }
                          >
                            <Copy size={12} /> 링크
                          </button>
                          <a
                            className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-[11px] text-text-secondary"
                            href={publicUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <ExternalLink size={12} /> 열기
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-text-secondary">
              학생 보드를 불러오는 중...
            </p>
          ) : null}
          {error ? <p className="text-sm text-red-300">{error}</p> : null}

          {!loading && !error ? (
            <div
              className="space-y-3 sm:hidden"
              data-tutorial="check-board-member-board"
            >
              {members.map((member) => {
                const row = rowMap.get(member.id);
                const draft = drafts[member.id] ?? {
                  attendanceStatus: "unknown",
                  assignmentStatus: "unknown",
                  assignmentLink: "",
                };

                return (
                  <article
                    key={member.id}
                    className="rounded-2xl border border-border bg-surface-2 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-text">
                          {member.name}
                        </div>
                        <div className="mt-1 text-[11px] text-text-dim">
                          {member.phone ?? "전화번호 없음"}
                        </div>
                      </div>
                      {row?.isSelfCheckReady ? (
                        <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[11px] text-emerald-300">
                          셀프체크 가능
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] text-amber-300">
                          전화번호 필요
                        </span>
                      )}
                    </div>

                    <div className="mt-3 grid gap-2">
                      <select
                        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
                        value={draft.attendanceStatus}
                        onChange={(event) =>
                          handleDraftChange(member.id, {
                            attendanceStatus: event.target
                              .value as StudentAttendanceStatus,
                          })
                        }
                      >
                        <option value="unknown">출석 상태 · 미정</option>
                        <option value="present">출석</option>
                        <option value="absent">미출석</option>
                      </select>
                      <select
                        className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-text"
                        value={draft.assignmentStatus}
                        onChange={(event) =>
                          handleDraftChange(member.id, {
                            assignmentStatus: event.target
                              .value as StudentAssignmentStatus,
                          })
                        }
                      >
                        <option value="unknown">과제 상태 · 미정</option>
                        <option value="done">과제 완료</option>
                        <option value="not_done">과제 미완료</option>
                      </select>
                      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                        <Link2 size={14} className="shrink-0 text-text-dim" />
                        <input
                          className="w-full bg-transparent text-sm text-text outline-none"
                          value={draft.assignmentLink}
                          onChange={(event) =>
                            handleDraftChange(member.id, {
                              assignmentLink: event.target.value,
                            })
                          }
                          placeholder="과제 링크"
                        />
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-text-secondary">
                      <span>
                        최근 공개체크:{" "}
                        {row?.lastPublicCheckAt
                          ? new Date(row.lastPublicCheckAt).toLocaleString(
                              "ko-KR",
                            )
                          : "-"}
                      </span>
                      <button
                        className="rounded-lg border border-border px-3 py-1.5 text-[11px] font-medium text-text-secondary disabled:opacity-50"
                        disabled={isUpdatingBoard}
                        onClick={() =>
                          updateMemberBoard.mutate({
                            memberId: member.id,
                            body: {
                              attendanceStatus: draft.attendanceStatus,
                              assignmentStatus: draft.assignmentStatus,
                              assignmentLink: draft.assignmentLink || null,
                            },
                          })
                        }
                      >
                        저장
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}

          {!loading && !error ? (
            <div
              className="hidden overflow-x-auto rounded-2xl border border-border sm:block"
              data-tutorial="check-board-member-board"
            >
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-surface text-left text-text-secondary">
                  <tr>
                    <th className="px-3 py-2.5">수강생</th>
                    <th className="px-3 py-2.5">셀프체크</th>
                    <th className="px-3 py-2.5">출석</th>
                    <th className="px-3 py-2.5">과제</th>
                    <th className="px-3 py-2.5 min-w-[220px]">과제 링크</th>
                    <th className="px-3 py-2.5">최근 공개체크</th>
                    <th className="px-3 py-2.5">저장</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-surface-2">
                  {members.map((member) => {
                    const row = rowMap.get(member.id);
                    const draft = drafts[member.id] ?? {
                      attendanceStatus: "unknown",
                      assignmentStatus: "unknown",
                      assignmentLink: "",
                    };

                    return (
                      <tr key={member.id}>
                        <td className="px-3 py-3">
                          <div className="font-medium text-text">
                            {member.name}
                          </div>
                          <div className="mt-0.5 text-[11px] text-text-dim">
                            {member.phone ?? "전화번호 없음"}
                          </div>
                        </td>
                        <td className="px-3 py-3 text-xs">
                          {row?.isSelfCheckReady ? (
                            <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-300">
                              가능
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-500/10 px-2 py-1 text-amber-300">
                              전화번호 필요
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <select
                            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text"
                            value={draft.attendanceStatus}
                            onChange={(event) =>
                              handleDraftChange(member.id, {
                                attendanceStatus: event.target
                                  .value as StudentAttendanceStatus,
                              })
                            }
                          >
                            <option value="unknown">미정</option>
                            <option value="present">출석</option>
                            <option value="absent">미출석</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <select
                            className="rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text"
                            value={draft.assignmentStatus}
                            onChange={(event) =>
                              handleDraftChange(member.id, {
                                assignmentStatus: event.target
                                  .value as StudentAssignmentStatus,
                              })
                            }
                          >
                            <option value="unknown">미정</option>
                            <option value="done">완료</option>
                            <option value="not_done">미완료</option>
                          </select>
                        </td>
                        <td className="px-3 py-3">
                          <input
                            className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm text-text"
                            value={draft.assignmentLink}
                            onChange={(event) =>
                              handleDraftChange(member.id, {
                                assignmentLink: event.target.value,
                              })
                            }
                            placeholder="과제 링크"
                          />
                        </td>
                        <td className="px-3 py-3 text-xs text-text-secondary">
                          {row?.lastPublicCheckAt
                            ? new Date(row.lastPublicCheckAt).toLocaleString(
                                "ko-KR",
                              )
                            : "-"}
                        </td>
                        <td className="px-3 py-3">
                          <button
                            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-text-secondary disabled:opacity-50"
                            disabled={isUpdatingBoard}
                            onClick={() =>
                              updateMemberBoard.mutate({
                                memberId: member.id,
                                body: {
                                  attendanceStatus: draft.attendanceStatus,
                                  assignmentStatus: draft.assignmentStatus,
                                  assignmentLink: draft.assignmentLink || null,
                                },
                              })
                            }
                          >
                            저장
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-300">{error}</p> : null}
    </section>
  );
}
