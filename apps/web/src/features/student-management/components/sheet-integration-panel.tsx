"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Plus } from "lucide-react";
import type { SheetIntegration } from "../types";
import styles from "../student-detail.module.css";

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div className={styles.sectionTitle} style={{ margin: 0 }}>
          데이터 연동
        </div>
        <button
          className={styles.assignBtn}
          onClick={() => setShowForm((v) => !v)}
          style={{ display: "flex", alignItems: "center", gap: 6 }}
        >
          <Plus size={14} />
          시트 추가
        </button>
      </div>

      {error && (
        <div
          style={{
            color: "var(--red)",
            fontSize: 13,
            marginBottom: 12,
            padding: "8px 12px",
            background: "var(--red-dim)",
            borderRadius: "var(--radius-sm)",
          }}
        >
          {error}
        </div>
      )}

      {/* 새 연동 폼 */}
      {showForm && (
        <div
          style={{
            padding: 16,
            background: "var(--surface3)",
            borderRadius: "var(--radius)",
            marginBottom: 16,
            border: "1px solid var(--border)",
          }}
        >
          <div className={styles.formField}>
            <label className={styles.formLabel}>구글 시트 URL</label>
            <input
              type="url"
              className={styles.formInput}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>데이터 유형</label>
            <select
              className={styles.formSelect}
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
            <div className={styles.formError} style={{ marginBottom: 8 }}>
              {formError}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              className={styles.cancelBtn}
              onClick={() => {
                setShowForm(false);
                setFormError(null);
                setSheetUrl("");
              }}
            >
              취소
            </button>
            <button
              className={styles.submitBtn}
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
          style={{
            padding: "24px 16px",
            textAlign: "center",
            color: "var(--text-dim)",
            fontSize: 14,
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          연동된 시트가 없습니다.
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {integrations.map((integ) => {
          const isSyncing = syncingIds.has(integ.id);
          const result = syncResults[integ.id];

          return (
            <div key={integ.id} className={styles.courseItem}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.courseItemName} style={{ marginBottom: 2 }}>
                  {integ.dataType === "attendance" ? "출결" : "과제"} 연동
                </div>
                <div
                  className={styles.courseItemMeta}
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
                className={styles.assignBtn}
                onClick={() => handleSync(integ.id)}
                disabled={isSyncing}
                style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}
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
