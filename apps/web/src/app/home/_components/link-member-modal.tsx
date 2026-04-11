"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2, Search, UserPlus, Users } from "lucide-react";

import { detectRecordMemberMismatch } from "../_lib/record-member-mismatch";
import type { RecordItem } from "../_lib/types";

const LAST_SPACE_KEY = "yeon_last_space_id";

interface Space {
  id: string;
  name: string;
}

interface Member {
  id: string;
  name: string;
  email?: string | null;
  status: string;
}

interface LinkMemberModalProps {
  recordId: string;
  record: RecordItem;
  studentName: string;
  currentMemberId: string | null;
  onClose: () => void;
  onLinked: (memberId: string | null) => void;
}

export function LinkMemberModal({
  recordId,
  record,
  studentName,
  currentMemberId,
  onClose,
  onLinked,
}: LinkMemberModalProps) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(
    currentMemberId,
  );
  const [newName, setNewName] = useState(studentName || "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: spacesData, isPending: spacesLoading } = useQuery({
    queryKey: ["spaces"],
    queryFn: async () => {
      const res = await fetch("/api/v1/spaces");
      if (!res.ok) return { spaces: [] as Space[] };
      return res.json() as Promise<{ spaces: Space[] }>;
    },
  });
  const spaces = spacesData ? spacesData.spaces : ([] as Space[]);

  // spaces 로드 완료 시 localStorage 기반으로 초기 spaceId 설정
  useEffect(() => {
    if (!spacesData || spaces.length === 0) return;
    const lastId = localStorage.getItem(LAST_SPACE_KEY);
    const defaultId =
      lastId && spaces.some((s) => s.id === lastId)
        ? lastId
        : (spaces[0]?.id ?? "");
    setSelectedSpaceId(defaultId);
  }, [spacesData, spaces]);

  const { data: membersData, isPending: membersLoading } = useQuery({
    queryKey: ["modal-space-members", selectedSpaceId],
    queryFn: async () => {
      const res = await fetch(`/api/v1/spaces/${selectedSpaceId}/members`);
      if (!res.ok) return { members: [] as Member[] };
      return res.json() as Promise<{ members: Member[] }>;
    },
    enabled: !!selectedSpaceId,
  });
  const members = membersData ? membersData.members : ([] as Member[]);

  const filteredMembers = query.trim()
    ? members.filter((m) =>
        m.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : members;

  const mismatchWarning = detectRecordMemberMismatch(
    record,
    members,
    mode === "existing" ? selectedMemberId : currentMemberId,
  );

  const patchMember = async (memberId: string | null) => {
    const res = await fetch(`/api/v1/counseling-records/${recordId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) throw new Error("연결에 실패했습니다.");
  };

  const handleLinkExisting = async () => {
    if (!selectedMemberId) return;
    setError(null);
    setSubmitting(true);
    try {
      await patchMember(selectedMemberId);
      if (selectedSpaceId)
        localStorage.setItem(LAST_SPACE_KEY, selectedSpaceId);
      onLinked(selectedMemberId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateAndLink = async () => {
    if (!newName.trim() || !selectedSpaceId) return;
    setError(null);
    setSubmitting(true);
    try {
      /* 수강생 생성 */
      const createRes = await fetch(
        `/api/v1/spaces/${selectedSpaceId}/members`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: newName.trim() }),
        },
      );
      if (!createRes.ok) throw new Error("수강생 등록에 실패했습니다.");
      const { member } = (await createRes.json()) as { member: Member };

      /* 상담 기록에 연결 */
      await patchMember(member.id);
      localStorage.setItem(LAST_SPACE_KEY, selectedSpaceId);
      onLinked(member.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlink = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await patchMember(null);
      onLinked(null);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="absolute inset-0 bg-[rgba(0,0,0,0.6)]" />

      <div className="relative z-10 w-full max-w-[480px] mx-4 bg-surface-2 border border-border rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-[15px] font-semibold">수강생 연결</h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-surface-3 text-text-dim hover:text-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {currentMemberId && (
          <div className="mx-5 mt-4 px-4 py-3 bg-accent-dim border border-accent-border rounded-lg flex items-center justify-between flex-shrink-0">
            <span className="text-[13px] text-accent font-medium">
              이미 수강생에 연결되어 있습니다
            </span>
            <button
              onClick={handleUnlink}
              disabled={submitting}
              className="text-[12px] text-text-dim hover:text-error transition-colors disabled:opacity-50"
            >
              연결 해제
            </button>
          </div>
        )}

        <div className="flex gap-0 mx-5 mt-4 flex-shrink-0 border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setMode("existing")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-medium transition-colors ${
              mode === "existing"
                ? "bg-accent text-bg"
                : "text-text-secondary hover:text-text hover:bg-surface-3"
            }`}
          >
            <Users size={13} />
            기존 수강생
          </button>
          <button
            onClick={() => setMode("new")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-medium transition-colors ${
              mode === "new"
                ? "bg-accent text-bg"
                : "text-text-secondary hover:text-text hover:bg-surface-3"
            }`}
          >
            <UserPlus size={13} />
            새로 등록
          </button>
        </div>

        <div className="px-5 mt-4 flex-shrink-0">
          <label className="block text-[12px] text-text-dim mb-1">
            스페이스
          </label>
          {spacesLoading ? (
            <div className="flex items-center gap-2 text-[13px] text-text-dim py-2">
              <Loader2 size={13} className="animate-spin" />
              불러오는 중...
            </div>
          ) : spaces.length === 0 ? (
            <p className="text-[13px] text-text-dim py-2">
              스페이스가 없습니다. 학생관리에서 먼저 스페이스를 만들어 주세요.
            </p>
          ) : (
            <select
              value={selectedSpaceId}
              onChange={(e) => {
                setSelectedSpaceId(e.target.value);
                setSelectedMemberId(null);
              }}
              className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-[13px] text-text outline-none focus:border-accent transition-colors"
            >
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {mode === "existing" && (
          <div className="px-5 mt-3 flex flex-col gap-3 overflow-hidden flex-1 min-h-0">
            <div className="relative flex-shrink-0">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim"
              />
              <input
                type="text"
                placeholder="수강생 이름 검색"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-surface-3 border border-border rounded-lg pl-8 pr-3 py-2 text-[13px] text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors"
              />
            </div>

            <div className="scrollbar-subtle overflow-y-auto flex-1 min-h-0 flex flex-col gap-1">
              {membersLoading ? (
                <div className="flex items-center gap-2 text-[13px] text-text-dim py-4 justify-center">
                  <Loader2 size={13} className="animate-spin" />
                  수강생 목록 불러오는 중...
                </div>
              ) : filteredMembers.length === 0 ? (
                <p className="text-[13px] text-text-dim py-4 text-center">
                  {query
                    ? "검색 결과가 없습니다"
                    : "이 스페이스에 수강생이 없습니다"}
                </p>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedMemberId(m.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-[13px] transition-colors flex items-center justify-between ${
                      selectedMemberId === m.id
                        ? "bg-accent text-bg"
                        : "hover:bg-surface-3 text-text"
                    }`}
                  >
                    <span className="font-medium">{m.name}</span>
                    {m.email && (
                      <span
                        className={`text-[11px] ${
                          selectedMemberId === m.id
                            ? "text-bg opacity-70"
                            : "text-text-dim"
                        }`}
                      >
                        {m.email}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {mode === "new" && (
          <div className="px-5 mt-3 flex-shrink-0">
            <label className="block text-[12px] text-text-dim mb-1">이름</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="수강생 이름"
              className="w-full bg-surface-3 border border-border rounded-lg px-3 py-2 text-[13px] text-text placeholder:text-text-dim outline-none focus:border-accent transition-colors"
            />
          </div>
        )}

        {error && (
          <p className="mx-5 mt-3 text-[12px] text-error flex-shrink-0">
            {error}
          </p>
        )}

        {mismatchWarning && (
          <div className="mx-5 mt-3 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 flex-shrink-0">
            <p className="m-0 text-[12px] font-semibold text-amber">
              {mismatchWarning.title}
            </p>
            <p className="mt-1 mb-0 text-[12px] leading-relaxed text-text-secondary">
              {mismatchWarning.description}
            </p>
            <ul className="mt-2 mb-0 pl-4 text-[11px] leading-relaxed text-text-dim">
              {mismatchWarning.evidence.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="px-5 py-4 border-t border-border mt-4 flex gap-2 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-border text-[13px] text-text-secondary hover:text-text hover:bg-surface-3 transition-colors"
          >
            취소
          </button>
          {mode === "existing" ? (
            <button
              onClick={handleLinkExisting}
              disabled={!selectedMemberId || submitting || spaces.length === 0}
              className="flex-1 py-2 rounded-lg bg-accent text-bg text-[13px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              {mismatchWarning ? "확인 후 연결하기" : "연결하기"}
            </button>
          ) : (
            <button
              onClick={handleCreateAndLink}
              disabled={!newName.trim() || !selectedSpaceId || submitting}
              className="flex-1 py-2 rounded-lg bg-accent text-bg text-[13px] font-medium disabled:opacity-40 hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              {submitting && <Loader2 size={13} className="animate-spin" />}
              등록 후 연결
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
