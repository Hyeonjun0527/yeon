"use client";

import Link from "next/link";
import { AlertTriangle, Plus, Search, Upload, User } from "lucide-react";
import { useMemberList } from "../hooks/use-member-list";
import { useStudentManagement } from "../student-management-provider";
import { MEMBER_STATUS_META, RISK_LEVEL_META } from "../constants";
import type { RiskLevel } from "../types";

export function StudentListScreen() {
  const { spaces, selectedSpaceId, enterImportMode } = useStudentManagement();

  const {
    filteredMembers,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    riskLevelFilter,
    setRiskLevelFilter,
    loading,
    error,
  } = useMemberList();

  const spaceName =
    spaces.find((s) => s.id === selectedSpaceId)?.name ?? null;

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4 md:flex-row flex-col md:items-center items-start">
        <div>
          <h2 className="text-2xl font-bold text-text tracking-[-0.02em]">
            {spaceName ?? "전체 수강생"}
          </h2>
          {!loading && (
            <p className="text-sm text-text-secondary mt-0.5">{filteredMembers.length}명</p>
          )}
        </div>
        <div className="flex items-center gap-[10px] md:w-auto w-full flex-wrap">
          <Link
            href="/home/student-management/members/new"
            className="flex items-center gap-1.5 py-2 px-4 bg-accent text-white border-none rounded-sm text-sm font-semibold cursor-pointer transition-[opacity,box-shadow] duration-150 hover:opacity-90 hover:shadow-[0_8px_32px_rgba(129,140,248,0.25)]"
          >
            <Plus size={16} />
            수강생 추가
          </Link>
        </div>
      </div>

      {/* 필터 바 */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 10,
              color: "var(--text-dim)",
              pointerEvents: "none",
            }}
          />
          <input
            className="py-2 px-[14px] border border-border rounded-lg text-sm w-[220px] outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-dim)]"
            style={{ paddingLeft: 30 }}
            placeholder="이름, 이메일, 전화번호"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="py-1.5 px-3 border border-border rounded-sm text-[13px] text-text-secondary bg-surface-2 cursor-pointer outline-none transition-[border-color] duration-150 hover:border-border-light focus:border-accent-border"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">전체 상태</option>
          <option value="active">수강중</option>
          <option value="withdrawn">중도포기</option>
          <option value="graduated">수료</option>
        </select>
        <select
          className="py-1.5 px-3 border border-border rounded-sm text-[13px] text-text-secondary bg-surface-2 cursor-pointer outline-none transition-[border-color] duration-150 hover:border-border-light focus:border-accent-border"
          value={riskLevelFilter}
          onChange={(e) =>
            setRiskLevelFilter(e.target.value as RiskLevel | "all")
          }
        >
          <option value="all">전체 위험도</option>
          <option value="low">낮음</option>
          <option value="medium">보통</option>
          <option value="high">높음</option>
        </select>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
          <p style={{ color: "var(--text-dim)", fontSize: 14 }}>
            불러오는 중...
          </p>
        </div>
      )}

      {/* 에러 */}
      {!loading && error && (
        <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
          <p style={{ color: "var(--red)", fontSize: 14 }}>{error}</p>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && filteredMembers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 px-5 text-center">
          <User
            size={40}
            className="text-text-dim mb-4"
          />
          <p className="text-lg font-semibold text-text mb-2">
            {search || statusFilter !== "all" || riskLevelFilter !== "all"
              ? "검색 결과가 없습니다."
              : "수강생이 없습니다."}
          </p>
          {!search && statusFilter === "all" && riskLevelFilter === "all" && (
            <>
              <p className="text-sm text-text-secondary mb-6">
                왼쪽에서 스페이스를 선택하거나 수강생을 추가해보세요.
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "center" }}>
                <Link
                  href="/home/student-management/members/new"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    border: "1px solid var(--border)",
                    background: "transparent",
                    color: "var(--text-secondary)",
                    textDecoration: "none",
                    cursor: "pointer",
                  }}
                >
                  <Plus size={14} />
                  수강생 직접 추가
                </Link>
                <button
                  onClick={() => enterImportMode("onedrive")}
                  type="button"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 500,
                    border: "none",
                    background: "var(--accent)",
                    color: "#fff",
                    cursor: "pointer",
                  }}
                >
                  <Upload size={14} />
                  스프레드시트로 가져오기
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* 수강생 목록 */}
      {!loading && !error && filteredMembers.length > 0 && (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))] max-md:grid-cols-1">
          {filteredMembers.map((member) => {
            const statusMeta =
              MEMBER_STATUS_META[member.status] ?? MEMBER_STATUS_META.active;
            const riskMeta = member.initialRiskLevel
              ? RISK_LEVEL_META[member.initialRiskLevel as RiskLevel]
              : null;

            return (
              <Link
                key={member.id}
                href={`/home/student-management/${member.id}`}
                className="bg-surface-2 border border-border rounded p-5 cursor-pointer transition-all duration-150 relative hover:border-border-light hover:bg-surface-3"
                style={{ textDecoration: "none", display: "block" }}
              >
                <div className="flex items-center gap-3 mb-3">
                  {/* 아바타 */}
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      background:
                        "linear-gradient(135deg, var(--accent), var(--cyan))",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                      fontWeight: 700,
                      color: "#fff",
                      flexShrink: 0,
                    }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-[15px] font-semibold text-text">{member.name}</div>
                    <div className="text-xs text-text-dim mt-0.5">
                      {member.email ?? member.phone ?? "연락처 없음"}
                    </div>
                  </div>
                </div>

                {/* 뱃지 */}
                <div
                  style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
                >
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: 10,
                      fontSize: 11,
                      fontWeight: 600,
                      color: statusMeta.color,
                      background: statusMeta.bgColor,
                    }}
                  >
                    {statusMeta.label}
                  </span>
                  {riskMeta && (
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 600,
                        color: riskMeta.color,
                        background: riskMeta.bgColor,
                        border: `1px solid ${riskMeta.borderColor}`,
                      }}
                    >
                      <AlertTriangle size={10} />
                      {riskMeta.label}
                    </span>
                  )}
                  {member.counselingRecordId && (
                    <span
                      style={{
                        padding: "2px 8px",
                        borderRadius: 10,
                        fontSize: 11,
                        fontWeight: 500,
                        color: "#34d399",
                        background: "rgba(52,211,153,0.1)",
                      }}
                    >
                      상담연결
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
