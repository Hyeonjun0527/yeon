"use client";

import { useState } from "react";
import type { RecordItem } from "../_lib/types";
import type { Space } from "../_hooks/use-current-space";
import type { MemberWithStatus } from "../_hooks/use-space-members";
import { useClickOutside } from "../_hooks";
import { CreateSpaceModal } from "./create-space-modal";

export interface SidebarProps {
  records: RecordItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onStartRecording: () => void;
  onFileUpload: () => void;
  spaces: Space[];
  currentSpace: Space | null;
  onSpaceChange: (id: string) => void;
  onSpaceCreated: (space: Space) => void;
  members: MemberWithStatus[];
  membersLoading: boolean;
  selectedMemberId: string | null;
  onSelectMember: (id: string) => void;
  onOpenQuickMemo: () => void;
}

function fmtDaysSince(days: number | null): string {
  if (days === null) return "상담 없음";
  if (days === 0) return "오늘";
  return `${days}일 전`;
}

function fmtMonthDay(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${m}-${day}`;
}

export function Sidebar({
  records,
  selectedId,
  onSelect,
  onStartRecording,
  onFileUpload,
  spaces,
  currentSpace,
  onSpaceChange,
  onSpaceCreated,
  members,
  membersLoading,
  selectedMemberId,
  onSelectMember,
  onOpenQuickMemo,
}: SidebarProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSpaceDropdown, setShowSpaceDropdown] = useState(false);
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);
  const [showCreateSpace, setShowCreateSpace] = useState(false);

  const menuRef = useClickOutside<HTMLDivElement>(
    () => setShowMenu(false),
    showMenu,
  );
  const spaceRef = useClickOutside<HTMLDivElement>(
    () => setShowSpaceDropdown(false),
    showSpaceDropdown,
  );

  const getMemberRecords = (memberId: string) =>
    records.filter((r) => r.memberId === memberId);

  const unlinkedRecords = records.filter((r) => r.memberId === null);

  const toggleMember = (id: string) =>
    setExpandedMemberId((prev) => (prev === id ? null : id));

  return (
    <div className="w-64 border-r border-border flex flex-col bg-surface overflow-hidden">
      {/* 스페이스 셀렉터 */}
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <div className="relative" ref={spaceRef}>
          <button
            className="w-full flex items-center justify-between gap-2 px-3 py-[7px] rounded-md bg-surface-3 border border-border-light text-sm font-medium text-text hover:bg-surface-4 transition-colors cursor-pointer"
            onClick={() => setShowSpaceDropdown((p) => !p)}
          >
            <span className="truncate">
              {currentSpace?.name ?? "스페이스 선택"}
            </span>
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`flex-shrink-0 text-text-dim transition-transform duration-150 ${showSpaceDropdown ? "rotate-180" : ""}`}
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {showSpaceDropdown && (
            <div className="absolute top-[calc(100%+4px)] left-0 right-0 bg-surface-3 border border-border-light rounded-md py-1 z-50 shadow-[0_8px_24px_rgba(0,0,0,0.35)] max-h-48 overflow-y-auto">
              {spaces.length === 0 ? (
                <div className="px-3 py-2 text-xs text-text-dim">
                  스페이스 없음
                </div>
              ) : (
                spaces.map((space) => (
                  <button
                    key={space.id}
                    className={`w-full px-3 py-[7px] text-left text-sm hover:bg-surface-4 transition-colors cursor-pointer font-[inherit] border-none bg-transparent ${
                      space.id === currentSpace?.id
                        ? "text-accent"
                        : "text-text"
                    }`}
                    onClick={() => {
                      onSpaceChange(space.id);
                      setShowSpaceDropdown(false);
                    }}
                  >
                    {space.name}
                  </button>
                ))
              )}
              <div className="border-t border-border mt-1 pt-1">
                <button
                  className="w-full px-3 py-[7px] text-left text-xs text-accent hover:bg-surface-4 transition-colors cursor-pointer font-[inherit] border-none bg-transparent"
                  onClick={() => {
                    setShowSpaceDropdown(false);
                    setShowCreateSpace(true);
                  }}
                >
                  + 새 스페이스 만들기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 스크롤 영역 */}
      <div className="flex-1 overflow-y-auto">
        {/* 수강생 섹션 */}
        <div className="px-2 py-2">
          <div
            className="flex items-center justify-between px-2 py-1 mb-0.5"
            data-tutorial="members-section"
          >
            <span className="text-[10px] font-semibold text-text-dim uppercase tracking-widest">
              수강생
            </span>
            {!membersLoading && (
              <span className="text-[10px] text-text-dim">
                {members.length}명
              </span>
            )}
          </div>

          {membersLoading ? (
            <div className="px-3 py-3 text-xs text-text-dim text-center">
              불러오는 중…
            </div>
          ) : members.length === 0 ? (
            <div className="px-3 py-3 text-xs text-text-dim">
              {currentSpace
                ? "등록된 수강생이 없습니다"
                : "스페이스를 선택하세요"}
            </div>
          ) : (
            members.map((member) => {
              const mRecords = getMemberRecords(member.id);
              const isExpanded = expandedMemberId === member.id;

              return (
                <div key={member.id}>
                  <button
                    className={`w-full flex items-center gap-2 px-2 py-[7px] rounded-md text-left transition-colors cursor-pointer font-[inherit] border-none ${
                      member.id === selectedMemberId
                        ? "bg-surface-3 border border-border-light"
                        : "bg-transparent hover:bg-surface-3"
                    }`}
                    onClick={() => {
                      onSelectMember(member.id);
                      toggleMember(member.id);
                    }}
                  >
                    {/* 상태 인디케이터 */}
                    {member.indicator === "recent" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green flex-shrink-0" />
                    )}
                    {member.indicator === "warning" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber flex-shrink-0" />
                    )}
                    {member.indicator === "none" && (
                      <span className="w-1.5 h-1.5 rounded-full bg-surface-4 border border-border flex-shrink-0" />
                    )}

                    <span className="flex-1 text-sm truncate text-text">
                      {member.name}
                    </span>

                    <span
                      className={`text-[10px] flex-shrink-0 tabular-nums ${
                        member.indicator === "recent"
                          ? "text-green"
                          : member.indicator === "warning"
                            ? "text-amber"
                            : "text-text-dim"
                      }`}
                    >
                      {fmtDaysSince(member.daysSinceLast)}
                    </span>

                    {mRecords.length > 0 && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 10 10"
                        fill="none"
                        className={`flex-shrink-0 text-text-dim transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
                      >
                        <path
                          d="M3 2l4 3-4 3"
                          stroke="currentColor"
                          strokeWidth="1.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  {isExpanded && mRecords.length > 0 && (
                    <div className="ml-4 border-l border-border pl-2 mb-1">
                      {mRecords.map((rec) => (
                        <button
                          key={rec.id}
                          className={`w-full text-left px-2 py-[5px] rounded text-xs truncate transition-colors cursor-pointer font-[inherit] border-none ${
                            rec.id === selectedId
                              ? "bg-surface-3 text-accent"
                              : "bg-transparent text-text-dim hover:text-text hover:bg-surface-3"
                          }`}
                          onClick={() => onSelect(rec.id)}
                        >
                          {rec.title}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* 미분류 섹션 */}
        {unlinkedRecords.length > 0 && (
          <div className="px-2 py-2 border-t border-border">
            <div className="flex items-center justify-between px-2 py-1 mb-0.5">
              <span className="text-[10px] font-semibold text-text-dim uppercase tracking-widest">
                미분류
              </span>
              <span className="text-[10px] text-text-dim">
                {unlinkedRecords.length}
              </span>
            </div>

            {unlinkedRecords.map((rec) => (
              <button
                key={rec.id}
                className={`w-full flex items-center gap-2 px-2 py-[7px] rounded-md text-left text-xs transition-colors cursor-pointer font-[inherit] border-none ${
                  rec.id === selectedId
                    ? "bg-surface-3 border border-border-light text-text"
                    : "bg-transparent text-text-dim hover:text-text hover:bg-surface-3"
                }`}
                onClick={() => onSelect(rec.id)}
              >
                <span className="text-[10px] text-text-dim flex-shrink-0 w-9 tabular-nums">
                  {fmtMonthDay(rec.createdAt)}
                </span>
                <span className="truncate">{rec.title}</span>
                {rec.status === "processing" && (
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-amber animate-pulse" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {showCreateSpace && (
        <CreateSpaceModal
          onClose={() => setShowCreateSpace(false)}
          onCreated={(space) => {
            onSpaceCreated(space);
            setShowCreateSpace(false);
          }}
        />
      )}

      {/* 하단 버튼 */}
      <div className="px-3 py-3 border-t border-border">
        <div className="relative" ref={menuRef}>
          <button
            className="w-full bg-accent text-white py-[8px] rounded-md text-[12px] font-medium cursor-pointer hover:opacity-90 transition-opacity font-[inherit] border-none"
            onClick={() => setShowMenu((p) => !p)}
            data-tutorial="new-record-btn"
          >
            + 새 상담 기록
          </button>

          {showMenu && (
            <div className="absolute bottom-[calc(100%+4px)] left-0 right-0 bg-surface-3 border border-border-light rounded-md py-1 z-50 shadow-[0_8px_24px_rgba(0,0,0,0.35)]">
              <button
                className="flex items-center gap-2 w-full px-3 py-[7px] bg-transparent border-none text-text text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4 transition-colors"
                onClick={() => {
                  setShowMenu(false);
                  onStartRecording();
                }}
              >
                🎙 바로 녹음
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-[7px] bg-transparent border-none text-text text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4 transition-colors"
                onClick={() => {
                  setShowMenu(false);
                  onFileUpload();
                }}
              >
                📁 파일 업로드
              </button>
              <button
                className="flex items-center gap-2 w-full px-3 py-[7px] bg-transparent border-none text-text text-xs font-[inherit] cursor-pointer text-left hover:bg-surface-4 transition-colors"
                onClick={() => {
                  setShowMenu(false);
                  onOpenQuickMemo();
                }}
              >
                ✏️ 텍스트 메모
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
