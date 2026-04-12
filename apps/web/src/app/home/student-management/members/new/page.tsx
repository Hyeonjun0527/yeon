"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useStudentManagement } from "@/features/student-management/student-management-provider";
import { useAppRoute } from "@/lib/app-route-context";

const STATUS_OPTIONS = [
  { value: "active", label: "수강중" },
  { value: "withdrawn", label: "중도포기" },
  { value: "graduated", label: "수료" },
];

const RISK_OPTIONS = [
  { value: "low", label: "낮음" },
  { value: "medium", label: "보통" },
  { value: "high", label: "높음" },
];

export default function MemberNewPage() {
  const router = useRouter();
  const { resolveAppHref } = useAppRoute();
  const { selectedSpaceId, refetchMembers } = useStudentManagement();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("active");
  const [riskLevel, setRiskLevel] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSpaceId) {
      setError("스페이스를 먼저 선택해주세요.");
      return;
    }
    if (!name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/spaces/${selectedSpaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
          status: status || null,
          initialRiskLevel: riskLevel || null,
        }),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? `오류가 발생했습니다. (${res.status})`);
      }

      refetchMembers();
      router.push(resolveAppHref("/home/student-management"));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "수강생을 추가하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      <div className="mb-6">
        <a
          href={resolveAppHref("/home/student-management")}
          className="text-sm text-text-dim hover:text-text-secondary transition-colors no-underline inline-flex items-center gap-1.5 mb-4"
        >
          ← 수강생 목록으로
        </a>
        <h1 className="text-xl font-bold text-text tracking-tight">
          수강생 추가
        </h1>
        {selectedSpaceId === null && (
          <p className="text-sm text-text-dim mt-1">
            왼쪽 사이드바에서 스페이스를 선택해주세요.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* 이름 */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 tracking-wide uppercase">
            이름 <span className="text-accent">*</span>
          </label>
          <input
            type="text"
            className="w-full py-2 px-3 bg-surface-2 border border-border rounded-lg text-sm text-text placeholder:text-text-dim outline-none focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-dim)] transition-[border-color,box-shadow]"
            placeholder="홍길동"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        {/* 이메일 */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 tracking-wide uppercase">
            이메일
          </label>
          <input
            type="email"
            className="w-full py-2 px-3 bg-surface-2 border border-border rounded-lg text-sm text-text placeholder:text-text-dim outline-none focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-dim)] transition-[border-color,box-shadow]"
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        {/* 전화번호 */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 tracking-wide uppercase">
            전화번호
          </label>
          <input
            type="tel"
            className="w-full py-2 px-3 bg-surface-2 border border-border rounded-lg text-sm text-text placeholder:text-text-dim outline-none focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-dim)] transition-[border-color,box-shadow]"
            placeholder="010-0000-0000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        {/* 수강 상태 */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 tracking-wide uppercase">
            수강 상태
          </label>
          <div className="relative">
            <select
              className="appearance-none w-full py-2 pl-3 pr-8 bg-surface-2 border border-border rounded-lg text-sm text-text outline-none focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-dim)] transition-[border-color,box-shadow] cursor-pointer"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* 위험도 */}
        <div>
          <label className="block text-xs font-semibold text-text-secondary mb-1.5 tracking-wide uppercase">
            위험도
          </label>
          <div className="relative">
            <select
              className="appearance-none w-full py-2 pl-3 pr-8 bg-surface-2 border border-border rounded-lg text-sm text-text outline-none focus:border-accent-border focus:shadow-[0_0_0_3px_var(--accent-dim)] transition-[border-color,box-shadow] cursor-pointer"
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)}
            >
              <option value="">선택 안 함</option>
              {RISK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <svg
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-text-dim"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
            >
              <path
                d="M2 4l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            className="flex-1 py-2.5 bg-accent text-white text-sm font-semibold rounded-lg border-none cursor-pointer hover:opacity-90 disabled:opacity-50 transition-opacity"
            disabled={submitting || !selectedSpaceId}
          >
            {submitting ? "추가 중..." : "수강생 추가"}
          </button>
          <button
            type="button"
            className="px-4 py-2.5 bg-surface-2 border border-border text-text-secondary text-sm font-medium rounded-lg cursor-pointer hover:border-border-light transition-colors"
            onClick={() =>
              router.push(resolveAppHref("/home/student-management"))
            }
          >
            취소
          </button>
        </div>
      </form>
    </div>
  );
}
