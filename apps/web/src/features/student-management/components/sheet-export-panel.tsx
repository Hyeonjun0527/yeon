"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Link2Off, RefreshCw } from "lucide-react";

interface SheetExportPanelProps {
  spaceId: string;
}

interface ExportIntegration {
  id: string;
  sheetUrl: string;
  sheetId: string;
  lastSyncedAt: string | null;
}

type PanelState =
  | { kind: "loading" }
  | { kind: "drive-disconnected" }
  | { kind: "ready"; integration: ExportIntegration | null };

export function SheetExportPanel({ spaceId }: SheetExportPanelProps) {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);

  const [sheetUrl, setSheetUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    exported: number;
    lastSyncedAt: string;
  } | null>(null);

  const [disconnecting, setDisconnecting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    setState({ kind: "loading" });

    try {
      const driveRes = await fetch("/api/v1/integrations/googledrive/status");
      if (!driveRes.ok) {
        throw new Error("Google 연결 상태를 확인하지 못했습니다.");
      }
      const driveData = (await driveRes.json()) as { connected: boolean };

      if (!driveData.connected) {
        setState({ kind: "drive-disconnected" });
        return;
      }

      const res = await fetch(`/api/v1/spaces/${spaceId}/sheet-export`);
      if (!res.ok) {
        throw new Error("시트 익스포트 설정을 불러오지 못했습니다.");
      }
      const data = (await res.json()) as {
        integration: ExportIntegration | null;
      };
      setState({ kind: "ready", integration: data.integration });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "시트 익스포트 패널을 초기화하지 못했습니다.",
      );
      setState({ kind: "ready", integration: null });
    }
  }, [spaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleConnectSheet = useCallback(async () => {
    if (!sheetUrl.trim()) {
      setFormError("시트 URL을 입력해주세요.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSyncResult(null);

    try {
      const res = await fetch(`/api/v1/spaces/${spaceId}/sheet-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "시트를 연결하지 못했습니다.");
      }

      setSheetUrl("");
      await load();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "시트를 연결하지 못했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [spaceId, sheetUrl, load]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/v1/spaces/${spaceId}/sheet-export/sync`, {
        method: "POST",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "동기화에 실패했습니다.");
      }

      const data = (await res.json()) as {
        exported: number;
        lastSyncedAt: string;
      };
      setSyncResult(data);
      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "동기화에 실패했습니다.",
      );
    } finally {
      setSyncing(false);
    }
  }, [spaceId, load]);

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    setError(null);
    setSyncResult(null);

    try {
      const res = await fetch(`/api/v1/spaces/${spaceId}/sheet-export`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "연결을 해제하지 못했습니다.");
      }

      await load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "연결을 해제하지 못했습니다.",
      );
    } finally {
      setDisconnecting(false);
    }
  }, [spaceId, load]);

  return (
    <section className="mt-8 rounded-lg border border-border bg-surface-2 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-text">
            구글 시트 익스포트
          </h3>
          <p className="mt-1 text-[13px] text-text-dim">
            이 스페이스의 수강생 데이터를 구글 시트로 내보냅니다. 동기화 시
            시트 전체를 최신 데이터로 덮어씁니다.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-sm bg-red-dim px-3 py-2 text-[13px] text-red">
          {error}
        </div>
      )}

      {state.kind === "loading" && (
        <div className="text-sm text-text-dim">불러오는 중...</div>
      )}

      {state.kind === "drive-disconnected" && (
        <div className="flex flex-col gap-3">
          <div className="text-sm text-text-secondary">
            Google 계정이 연결되어 있지 않습니다. 먼저 Google 계정을 연결해
            주세요.
          </div>
          <div>
            <a
              href="/api/v1/integrations/googledrive/auth"
              className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90"
            >
              Google 계정 연결
            </a>
          </div>
        </div>
      )}

      {state.kind === "ready" && !state.integration && (
        <div className="flex flex-col gap-3">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-text-dim">
              구글 시트 URL
            </span>
            <input
              type="url"
              className="w-full rounded-sm border border-border bg-surface-3 px-3 py-2 text-sm text-text outline-none transition-[border-color] duration-150 placeholder:text-text-dim focus:border-accent-border"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
            />
          </label>
          {formError && (
            <div className="text-[13px] text-red">{formError}</div>
          )}
          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
              onClick={handleConnectSheet}
              disabled={submitting}
            >
              {submitting ? "연결 중..." : "연결"}
            </button>
          </div>
        </div>
      )}

      {state.kind === "ready" && state.integration && (
        <div className="flex flex-col gap-4">
          <div className="rounded border border-border bg-surface-3 p-4">
            <div className="mb-1 text-[12px] font-medium text-text-dim">
              연결된 시트
            </div>
            <a
              href={state.integration.sheetUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 break-all text-sm text-accent hover:underline"
              title={state.integration.sheetUrl}
            >
              {state.integration.sheetUrl}
              <ExternalLink size={12} className="flex-shrink-0" />
            </a>
            {state.integration.lastSyncedAt && (
              <div className="mt-2 text-[12px] text-text-dim">
                마지막 동기화:{" "}
                {new Date(state.integration.lastSyncedAt).toLocaleString(
                  "ko-KR",
                )}
              </div>
            )}
            {syncResult && (
              <div className="mt-2 text-[12px] text-green-400">
                동기화 완료 — {syncResult.exported}명 내보냄
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-sm border border-border bg-surface-3 px-3 py-2 text-[13px] text-text-secondary transition-colors duration-150 hover:border-border-light disabled:opacity-50"
              onClick={handleDisconnect}
              disabled={disconnecting || syncing}
            >
              <Link2Off size={13} />
              {disconnecting ? "해제 중..." : "연결 해제"}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
              onClick={handleSync}
              disabled={syncing || disconnecting}
            >
              <RefreshCw
                size={13}
                className={syncing ? "animate-spin" : undefined}
              />
              {syncing ? "동기화 중..." : "동기화"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
