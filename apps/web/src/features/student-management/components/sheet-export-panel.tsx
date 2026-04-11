"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Download,
  ExternalLink,
  Link2,
  Link2Off,
  RefreshCw,
  Undo2,
} from "lucide-react";

interface SheetExportPanelProps {
  spaceId: string;
}

interface ExportIntegration {
  id: string;
  sheetUrl: string;
  sheetId: string;
  lastSyncedAt: string | null;
}

type SheetConflict = {
  type: string;
  rowNumber: number | null;
  memberId: string | null;
  memberName: string | null;
  changedFields: string[];
  message: string;
};

type PanelState =
  | { kind: "loading" }
  | { kind: "drive-disconnected" }
  | {
      kind: "ready";
      integration: ExportIntegration | null;
      sheetSyncReady: boolean;
    };

async function readErrorMessage(
  res: Response,
  fallbackMessage: string,
): Promise<string> {
  const contentType = res.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const data = (await res.json().catch(() => null)) as {
      message?: string;
    } | null;

    if (typeof data?.message === "string" && data.message.trim()) {
      return data.message;
    }
  }

  const text = await res.text().catch(() => "");
  return text || fallbackMessage;
}

export function SheetExportPanel({ spaceId }: SheetExportPanelProps) {
  const [state, setState] = useState<PanelState>({ kind: "loading" });
  const [error, setError] = useState<string | null>(null);

  const [sheetUrl, setSheetUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showSheetConnectForm, setShowSheetConnectForm] = useState(false);

  const [syncing, setSyncing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    exported: number;
    lastSyncedAt: string;
  } | null>(null);
  const [importResult, setImportResult] = useState<{
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
    conflicts: number;
    lastSyncedAt: string;
  } | null>(null);
  const [importConflicts, setImportConflicts] = useState<SheetConflict[]>([]);

  const [disconnecting, setDisconnecting] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState<
    "csv" | "xlsx" | null
  >(null);

  const integrationStatusLabel =
    state.kind === "drive-disconnected"
      ? "Google 미연결"
      : state.kind === "ready" && !state.sheetSyncReady
        ? "Google Sheets 재연결 필요"
        : state.kind === "ready" && state.integration
          ? "Google Sheets 연결됨"
          : "시트 연동 준비";

  const integrationStatusTone =
    state.kind === "drive-disconnected"
      ? "text-text-dim bg-surface-3 border-border"
      : state.kind === "ready" && !state.sheetSyncReady
        ? "text-yellow-200 bg-yellow-500/10 border-yellow-500/20"
        : state.kind === "ready" && state.integration
          ? "text-green bg-[rgba(34,197,94,0.12)] border-[rgba(34,197,94,0.22)]"
          : "text-accent bg-accent-dim border-accent-border";

  const primaryActionClass =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-[12px] font-semibold text-white transition-opacity duration-150 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45";
  const secondaryActionClass =
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-3 px-3 py-2 text-[12px] text-text-secondary transition-colors duration-150 hover:border-border-light hover:bg-surface-4 hover:text-text disabled:cursor-not-allowed disabled:opacity-50";

  const load = useCallback(async () => {
    setError(null);
    setState({ kind: "loading" });

    try {
      const driveRes = await fetch("/api/v1/integrations/googledrive/status");
      if (!driveRes.ok) {
        throw new Error("Google 연결 상태를 확인하지 못했습니다.");
      }
      const driveData = (await driveRes.json()) as {
        connected: boolean;
        sheetSyncReady?: boolean;
      };

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
      setState({
        kind: "ready",
        integration: data.integration,
        sheetSyncReady: driveData.sheetSyncReady ?? true,
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "시트 익스포트 패널을 초기화하지 못했습니다.",
      );
      setState({ kind: "ready", integration: null, sheetSyncReady: false });
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
    setImportResult(null);
    setImportConflicts([]);

    try {
      const res = await fetch(`/api/v1/spaces/${spaceId}/sheet-export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sheetUrl: sheetUrl.trim() }),
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "시트를 연결하지 못했습니다."),
        );
      }

      setSheetUrl("");
      setShowSheetConnectForm(false);
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
    setImportResult(null);
    setImportConflicts([]);
    setError(null);

    try {
      const res = await fetch(`/api/v1/spaces/${spaceId}/sheet-export/sync`, {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "동기화에 실패했습니다."));
      }

      const data = (await res.json()) as {
        exported: number;
        lastSyncedAt: string;
      };
      setSyncResult(data);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "동기화에 실패했습니다.");
    } finally {
      setSyncing(false);
    }
  }, [spaceId, load]);

  const handleImportFromSheet = useCallback(async () => {
    if (state.kind !== "ready" || !state.integration) {
      return;
    }

    setImporting(true);
    setError(null);
    setImportResult(null);
    setImportConflicts([]);

    try {
      const res = await fetch(`/api/v1/spaces/${spaceId}/sheet-export/import`, {
        method: "POST",
      });

      if (res.status === 409) {
        const data = (await res.json()) as {
          status: "blocked";
          summary: {
            created: number;
            updated: number;
            unchanged: number;
            skipped: number;
            conflicts: number;
          };
          conflicts: SheetConflict[];
          lastSyncedAt: string | null;
        };
        setImportConflicts(data.conflicts);
        setError(
          `시트와 웹에서 동시에 수정된 항목 ${data.summary.conflicts}건이 있어 자동 반영을 중단했습니다.`,
        );
        return;
      }

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(
            res,
            "시트에서 수강생 데이터를 가져오지 못했습니다.",
          ),
        );
      }

      const data = (await res.json()) as {
        status: "applied";
        summary: {
          created: number;
          updated: number;
          unchanged: number;
          skipped: number;
          conflicts: number;
        };
        lastSyncedAt: string;
      };

      setImportResult({ ...data.summary, lastSyncedAt: data.lastSyncedAt });
      await load();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "시트에서 수강생 데이터를 가져오지 못했습니다.",
      );
    } finally {
      setImporting(false);
    }
  }, [spaceId, state, load]);

  const handleDownload = useCallback(
    async (format: "csv" | "xlsx") => {
      setDownloadingFormat(format);
      try {
        const res = await fetch(`/api/v1/spaces/${spaceId}/export/${format}`);
        if (!res.ok) {
          throw new Error(
            (await readErrorMessage(res, "")) ||
              (format === "csv"
                ? "CSV 다운로드에 실패했습니다."
                : "엑셀 다운로드에 실패했습니다."),
          );
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `수강생_${spaceId}.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : format === "csv"
              ? "CSV 다운로드에 실패했습니다."
              : "엑셀 다운로드에 실패했습니다.",
        );
      } finally {
        setDownloadingFormat(null);
      }
    },
    [spaceId],
  );

  const handleDisconnect = useCallback(async () => {
    setDisconnecting(true);
    setError(null);
    setSyncResult(null);

    try {
      const res = await fetch(`/api/v1/spaces/${spaceId}/sheet-export`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, "연결을 해제하지 못했습니다."),
        );
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

  const isLoading = state.kind === "loading";
  const isDriveDisconnected = state.kind === "drive-disconnected";
  const isReady = state.kind === "ready";
  const integration = isReady ? state.integration : null;
  const sheetSyncReady = isReady ? state.sheetSyncReady : false;
  const hasIntegration = integration !== null;

  const lastSyncedLabel = integration?.lastSyncedAt
    ? new Date(integration.lastSyncedAt).toLocaleString("ko-KR")
    : "아직 없음";

  const recentActivityLabel = importResult
    ? `${importResult.created}명 추가 · ${importResult.updated}명 갱신`
    : syncResult
      ? `${syncResult.exported}명 최신화`
      : hasIntegration
        ? "준비 완료"
        : isDriveDisconnected
          ? "연결 필요"
          : isLoading
            ? "확인 중"
            : "URL 연결 대기";

  const compactDescription = hasIntegration
    ? "시트에서 수정한 수강생 정보를 다시 반영합니다."
    : isDriveDisconnected
      ? "먼저 Google을 연결한 뒤 시트 URL을 붙이면 됩니다."
      : "Google 연결 후 시트 URL만 붙이면 현재 스페이스에 연결됩니다.";

  return (
    <section className="rounded-2xl border border-border bg-surface-2/65 px-4 py-3">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[12px] font-semibold text-text">
                Google Sheets 연동
              </p>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium leading-none ${integrationStatusTone}`}
              >
                {integrationStatusLabel}
              </span>
              {!isLoading && recentActivityLabel !== "준비 완료" ? (
                <span className="text-[11px] text-text-dim">
                  {recentActivityLabel}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-text-dim">
              {compactDescription}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isLoading ? null : isDriveDisconnected ? (
              <a
                href="/api/v1/integrations/googledrive/auth"
                className={secondaryActionClass}
              >
                <Link2 size={13} />
                Google 연결
              </a>
            ) : isReady && !sheetSyncReady ? (
              <a
                href="/api/v1/integrations/googledrive/auth"
                className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-3 py-2 text-[12px] font-medium text-yellow-100 transition-colors hover:border-yellow-400/50"
              >
                <Link2 size={13} />
                Google 재연결
              </a>
            ) : hasIntegration ? (
              <button
                type="button"
                className={primaryActionClass}
                onClick={() => void handleImportFromSheet()}
                disabled={importing || syncing || disconnecting}
              >
                <Undo2 size={13} />
                {importing ? "반영 중..." : "시트에서 가져오기"}
              </button>
            ) : (
              <button
                type="button"
                className={secondaryActionClass}
                onClick={() => setShowSheetConnectForm((prev) => !prev)}
                disabled={submitting || isLoading}
              >
                <Link2 size={13} />
                {showSheetConnectForm ? "연결 폼 닫기" : "시트 URL 연결"}
              </button>
            )}

            {!isLoading ? (
              <button
                type="button"
                className={secondaryActionClass}
                onClick={handleSync}
                disabled={
                  !hasIntegration ||
                  !sheetSyncReady ||
                  syncing ||
                  disconnecting ||
                  importing
                }
              >
                <RefreshCw
                  size={13}
                  className={syncing ? "animate-spin" : undefined}
                />
                {syncing ? "동기화 중..." : "동기화"}
              </button>
            ) : null}

            <button
              type="button"
              className={secondaryActionClass}
              onClick={() => void handleDownload("csv")}
              disabled={downloadingFormat !== null}
              title="CSV 파일로 다운로드"
            >
              <Download size={13} />
              CSV
            </button>

            <button
              type="button"
              className={secondaryActionClass}
              onClick={() => void handleDownload("xlsx")}
              disabled={downloadingFormat !== null}
              title="엑셀 파일로 다운로드"
            >
              <Download size={13} />
              엑셀
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red/20 bg-red/10 px-3 py-2 text-[12px] text-red">
            {error}
          </div>
        ) : null}

        {importConflicts.length > 0 ? (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-3">
            <div className="flex flex-col gap-2">
              <div className="text-[12px] font-medium text-yellow-100">
                충돌 {importConflicts.length}건
              </div>
              <div className="flex flex-col gap-2 text-[12px] text-yellow-50/90">
                {importConflicts.slice(0, 5).map((conflict, index) => (
                  <div
                    key={`${conflict.memberId ?? "row"}-${conflict.rowNumber ?? index}`}
                    className="rounded-lg border border-yellow-500/15 bg-black/10 px-3 py-2"
                  >
                    <div className="font-medium text-yellow-100">
                      {conflict.memberName ?? "이름 없음"}
                      {conflict.rowNumber ? ` · ${conflict.rowNumber}행` : ""}
                    </div>
                    <div className="mt-1 leading-relaxed text-yellow-50/80">
                      {conflict.message}
                    </div>
                    {conflict.changedFields.length > 0 ? (
                      <div className="mt-1 text-[11px] text-yellow-50/70">
                        변경 필드: {conflict.changedFields.join(", ")}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {isReady && !sheetSyncReady ? (
          <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-3 py-2 text-[12px] leading-relaxed text-yellow-100">
            예전 권한 토큰이 남아 있으면 Google 재연결이 한 번 필요합니다.
          </div>
        ) : null}

        {isReady && !hasIntegration && showSheetConnectForm ? (
          <div className="rounded-xl border border-border bg-surface-3/70 px-3 py-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
              <label className="min-w-0 flex-1">
                <span className="mb-1 block text-[11px] font-medium text-text-dim">
                  구글 시트 URL
                </span>
                <input
                  type="url"
                  className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm text-text outline-none transition-[border-color] duration-150 placeholder:text-text-dim focus:border-accent-border"
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                />
              </label>
              <button
                type="button"
                className={primaryActionClass}
                onClick={handleConnectSheet}
                disabled={submitting}
              >
                {submitting ? "연결 중..." : "연결"}
              </button>
            </div>
            {formError ? (
              <div className="mt-2 text-[12px] text-red">{formError}</div>
            ) : null}
          </div>
        ) : null}

        {hasIntegration ? (
          <div className="rounded-xl border border-border bg-surface-3/70 px-3 py-3">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <a
                  href={integration.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex max-w-full items-center gap-1.5 break-all text-[13px] font-medium text-accent hover:underline"
                  title={integration.sheetUrl}
                >
                  {integration.sheetUrl}
                  <ExternalLink size={12} className="shrink-0" />
                </a>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-dim">
                  <span>마지막 동기화 {lastSyncedLabel}</span>
                  {importResult || syncResult ? (
                    <span>{recentActivityLabel}</span>
                  ) : null}
                  {importResult && importResult.unchanged > 0 ? (
                    <span>{importResult.unchanged}명 유지</span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={integration.sheetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={secondaryActionClass}
                >
                  <ExternalLink size={13} />
                  시트 열기
                </a>
                <button
                  type="button"
                  className={secondaryActionClass}
                  onClick={handleDisconnect}
                  disabled={disconnecting || syncing || importing}
                >
                  <Link2Off size={13} />
                  {disconnecting ? "해제 중..." : "연결 해제"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
