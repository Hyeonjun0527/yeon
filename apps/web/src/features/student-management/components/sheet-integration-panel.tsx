"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import type { SheetIntegration } from "../types";

interface SheetIntegrationPanelProps {
  spaceId: string;
}

export function SheetIntegrationPanel({ spaceId }: SheetIntegrationPanelProps) {
  const [integrations, setIntegrations] = useState<SheetIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ── 폼 상태 ── */
  const [showForm, setShowForm] = useState(false);
  const [sheetUrl, setSheetUrl] = useState("");
  const [dataType, setDataType] = useState<"attendance" | "assignment">(
    "attendance",
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  /* ── 동기화 상태 (integrationId → loading) ── */
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [syncResults, setSyncResults] = useState<
    Record<string, { synced: number; errors: number }>
  >({});

  /* ── 목록 조회 ── */
  const fetchIntegrations = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/v1/spaces/${spaceId}/sheet-integrations`)
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "시트 연동 목록을 불러오지 못했습니다.");
        }
        return res.json() as Promise<{ integrations: SheetIntegration[] }>;
      })
      .then((data) => {
        if (cancelled) return;
        setIntegrations(data.integrations);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "시트 연동 목록을 불러오지 못했습니다.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [spaceId]);

  useEffect(() => {
    const cleanup = fetchIntegrations();
    return cleanup;
  }, [fetchIntegrations]);

  /* ── 새 연동 추가 ── */
  const handleSubmit = useCallback(async () => {
    if (!sheetUrl.trim()) {
      setFormError("시트 URL을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch(`/api/v1/spaces/${spaceId}/sheet-integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim(), dataType }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "시트 연동을 추가하지 못했습니다.");
      }

      setSheetUrl("");
      setDataType("attendance");
      setShowForm(false);
      fetchIntegrations();
    } catch (err: unknown) {
      setFormError(
        err instanceof Error ? err.message : "시트 연동을 추가하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [spaceId, sheetUrl, dataType, fetchIntegrations]);

  /* ── 동기화 ── */
  const handleSync = useCallback(
    async (integrationId: string) => {
      setSyncingIds((prev) => new Set(prev).add(integrationId));
      setSyncResults((prev) => {
        const next = { ...prev };
        delete next[integrationId];
        return next;
      });

      try {
        const res = await fetch(
          `/api/v1/spaces/${spaceId}/sheet-integrations/${integrationId}/sync`,
          { method: "POST" },
        );

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          throw new Error(text || "동기화를 처리하지 못했습니다.");
        }

        const data = (await res.json()) as { synced: number; errors: number };
        setSyncResults((prev) => ({ ...prev, [integrationId]: data }));
        fetchIntegrations();
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "동기화를 처리하지 못했습니다.";
        setSyncResults((prev) => ({
          ...prev,
          [integrationId]: { synced: -1, errors: 0 },
        }));
        setError(message);
      } finally {
        setSyncingIds((prev) => {
          const next = new Set(prev);
          next.delete(integrationId);
          return next;
        });
      }
    },
    [spaceId, fetchIntegrations],
  );

  return (
    <div style={{ marginTop: 32 }}>
      <div className="flex items-center justify-between mb-4">
        <div className="text-base font-semibold text-text">
          데이터 연동
        </div>
        <button
          className="flex items-center gap-1.5 py-1.5 px-[14px] bg-accent text-white border-none rounded-sm text-[13px] font-medium cursor-pointer transition-opacity duration-150 hover:opacity-90"
          onClick={() => setShowForm((v) => !v)}
        >
          <Plus size={14} />
          시트 추가
        </button>
      </div>

      {error && (
        <div className="text-red text-[13px] mb-3 py-2 px-3 bg-red-dim rounded-sm">
          {error}
        </div>
      )}

      {/* 새 연동 폼 */}
      {showForm && (
        <div
          className="p-4 bg-surface-3 rounded border border-border mb-4"
        >
          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">구글 시트 URL</label>
            <input
              type="url"
              className="w-full py-2 px-3 border border-border rounded-sm text-sm outline-none transition-[border-color] duration-150 bg-surface-2 text-text placeholder:text-text-dim focus:border-accent-border"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
          </div>
          <div className="mb-3">
            <label className="block text-[13px] font-medium text-text-dim mb-1">데이터 유형</label>
            <select
              className="w-full py-2 px-3 border border-border rounded-sm text-sm bg-surface-2 text-text cursor-pointer outline-none"
              value={dataType}
              onChange={(e) =>
                setDataType(e.target.value as "attendance" | "assignment")
              }
            >
              <option value="attendance">출결</option>
              <option value="assignment">과제</option>
            </select>
          </div>
          {formError && (
            <div className="text-xs text-red mb-2">{formError}</div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className="py-2 px-4 border border-border rounded-lg bg-surface-2 text-text-secondary text-sm cursor-pointer transition-[background] duration-150 hover:bg-surface-3"
              onClick={() => {
                setShowForm(false);
                setFormError(null);
                setSheetUrl("");
              }}
            >
              취소
            </button>
            <button
              className="py-2 px-5 bg-accent text-white border-none rounded-lg text-sm font-semibold cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? "추가 중..." : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* 연동 목록 */}
      {loading && (
        <div style={{ color: "var(--text-dim)", fontSize: 14 }}>
          불러오는 중...
        </div>
      )}

      {!loading && integrations.length === 0 && (
        <div
          className="py-6 px-4 text-center text-text-dim text-sm bg-surface-2 border border-border rounded"
        >
          연동된 시트가 없습니다.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {integrations.map((integ) => {
          const isSyncing = syncingIds.has(integ.id);
          const result = syncResults[integ.id];

          return (
            <div
              key={integ.id}
              className="flex items-center justify-between py-3 px-4 bg-surface-2 border border-border rounded-lg text-sm transition-[border-color] duration-150 hover:border-border-light"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="font-medium text-text-secondary" style={{ marginBottom: 2 }}>
                  {integ.dataType === "attendance" ? "출결" : "과제"} 연동
                </div>
                <div
                  className="text-[13px] text-text-dim"
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    maxWidth: 300,
                  }}
                  title={integ.sheetUrl}
                >
                  {integ.sheetUrl}
                </div>
                {integ.lastSyncedAt && (
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--text-dim)",
                      marginTop: 2,
                    }}
                  >
                    마지막 동기화:{" "}
                    {new Date(integ.lastSyncedAt).toLocaleString("ko-KR")}
                  </div>
                )}
                {result && result.synced >= 0 && (
                  <div
                    style={{ fontSize: 12, color: "#34d399", marginTop: 2 }}
                  >
                    동기화 완료 — {result.synced}건 반영
                    {result.errors > 0 ? `, ${result.errors}건 오류` : ""}
                  </div>
                )}
                {result && result.synced === -1 && (
                  <div
                    style={{ fontSize: 12, color: "var(--red)", marginTop: 2 }}
                  >
                    동기화 실패
                  </div>
                )}
              </div>
              <button
                className="flex items-center gap-1.5 py-1.5 px-[14px] bg-accent text-white border-none rounded-sm text-[13px] font-medium cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 flex-shrink-0"
                onClick={() => handleSync(integ.id)}
                disabled={isSyncing}
              >
                <RefreshCw
                  size={13}
                  style={
                    isSyncing
                      ? { animation: "spin 1s linear infinite" }
                      : undefined
                  }
                />
                {isSyncing ? "동기화 중..." : "동기화"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
