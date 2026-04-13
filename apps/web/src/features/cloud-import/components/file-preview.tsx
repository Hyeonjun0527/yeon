"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { detectFileKind } from "../file-kind";

interface FilePreviewProps {
  uri: string;
  mimeType: string;
  fileName: string;
}

// 브라우저가 <img>로 렌더할 수 없는 포맷
const NO_BROWSER_PREVIEW_EXTS = [".heic", ".heif"];

function needsHeicConversion(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return NO_BROWSER_PREVIEW_EXTS.some((ext) => lower.endsWith(ext));
}

export function FilePreview({ uri, mimeType, fileName }: FilePreviewProps) {
  const kind = detectFileKind(fileName, mimeType);

  if (kind === "image") {
    if (needsHeicConversion(fileName)) {
      return <HeicPreview uri={uri} fileName={fileName} />;
    }
    return (
      <div className="scrollbar-subtle h-full w-full flex items-center justify-center overflow-auto bg-surface">
        <img
          src={uri}
          alt={fileName}
          style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        />
      </div>
    );
  }

  if (kind === "spreadsheet") {
    return <SpreadsheetPreview uri={uri} />;
  }

  if (kind === "csv") {
    return <CsvPreview uri={uri} />;
  }

  if (kind === "txt") {
    return <TxtPreview uri={uri} />;
  }

  if (kind === "pdf") {
    return <PdfPreview uri={uri} fileName={fileName} />;
  }

  return (
    <div className="flex items-center justify-center h-full min-h-[200px] text-text-dim text-sm text-center">
      미리보기를 지원하지 않는 형식입니다.
    </div>
  );
}

function HeicPreview({ uri, fileName }: { uri: string; fileName: string }) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let blobUrl: string | null = null;

    (async () => {
      try {
        // eslint-disable-next-line no-restricted-syntax
        const res = await fetch(uri);
        if (!res.ok) throw new Error("파일을 불러올 수 없습니다.");
        const blob = await res.blob();
        const heic2any = (await import("heic2any")).default;
        const result = await heic2any({
          blob,
          toType: "image/png",
          quality: 0.85,
        });
        const output = Array.isArray(result) ? result[0] : result;
        blobUrl = URL.createObjectURL(output as Blob);
        if (!cancelled) setObjectUrl(blobUrl);
      } catch (err) {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : "HEIC 변환에 실패했습니다.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      // blob URL은 useEffect cleanup에서 revoke해야 메모리 누수를 막을 수 있다.
      // useQuery로 이전하면 캐시가 blob URL을 살려두므로 의도적으로 useEffect를 유지한다.
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [uri]);

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
        <Loader2 size={20} className="animate-spin" />
        <span>HEIC 변환 중...</span>
      </div>
    );
  }

  if (error)
    return (
      <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
        {error}
      </div>
    );
  if (!objectUrl) return null;

  return (
    <div className="scrollbar-subtle h-full w-full flex items-center justify-center overflow-auto bg-surface">
      <img
        src={objectUrl}
        alt={fileName}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    </div>
  );
}

function SpreadsheetPreview({ uri }: { uri: string }) {
  const {
    data: rows,
    isPending: loading,
    error,
  } = useQuery({
    queryKey: ["file-preview-spreadsheet", uri],
    queryFn: async () => {
      const res = await fetch(uri);
      if (!res.ok) throw new Error("파일을 불러올 수 없습니다.");
      const buffer = await res.arrayBuffer();
      const XLSX = await import("xlsx");
      const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("시트를 읽을 수 없습니다.");
      return XLSX.utils.sheet_to_json(ws, {
        header: 1,
        raw: false,
        defval: "",
      }) as string[][];
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
        <Loader2 size={20} className="animate-spin" />
        <span>미리보기 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
        {error instanceof Error ? error.message : "파일을 불러올 수 없습니다."}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-text-dim text-sm text-center">
        데이터가 없습니다.
      </div>
    );
  }

  return <VirtualizedGridPreview rows={rows} />;
}

function CsvPreview({ uri }: { uri: string }) {
  const {
    data: rows,
    isPending: loading,
    error,
  } = useQuery({
    queryKey: ["file-preview-csv", uri],
    queryFn: async () => {
      const res = await fetch(uri);
      if (!res.ok) throw new Error("파일을 불러올 수 없습니다.");
      const text = await res.text();
      const lines = text.split("\n").filter((l) => l.trim());
      return lines.map((line) => line.split(",").map((cell) => cell.trim()));
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
        <Loader2 size={20} className="animate-spin" />
        <span>미리보기 로딩 중...</span>
      </div>
    );
  }

  if (error)
    return (
      <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
        {error instanceof Error ? error.message : "파일을 불러올 수 없습니다."}
      </div>
    );
  if (!rows || rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-text-dim text-sm text-center">
        데이터가 없습니다.
      </div>
    );
  }

  return <VirtualizedGridPreview rows={rows} />;
}

function TxtPreview({ uri }: { uri: string }) {
  const {
    data: text,
    isPending: loading,
    error,
  } = useQuery({
    queryKey: ["file-preview-txt", uri],
    queryFn: async () => {
      const res = await fetch(uri);
      if (!res.ok) throw new Error("파일을 불러올 수 없습니다.");
      return res.text();
    },
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
        <Loader2 size={20} className="animate-spin" />
        <span>미리보기 로딩 중...</span>
      </div>
    );
  }

  if (error)
    return (
      <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
        {error instanceof Error ? error.message : "파일을 불러올 수 없습니다."}
      </div>
    );
  if (text == null) return null;

  return (
    <div className="scrollbar-subtle h-full w-full overflow-auto p-4 text-[13px] text-text bg-surface">
      <pre className="m-0 whitespace-pre-wrap break-words font-[inherit] leading-relaxed">
        {text}
      </pre>
    </div>
  );
}

function PdfPreview({ uri, fileName }: { uri: string; fileName: string }) {
  return (
    <div className="h-full w-full bg-surface">
      <iframe
        src={uri}
        title={`${fileName} 미리보기`}
        style={{ width: "100%", height: "100%", border: "none" }}
      />
    </div>
  );
}

function normalizePreviewRows(rows: string[][]) {
  const safeRows = rows.map((row) => row.map((cell) => String(cell ?? "")));
  const columnCount = Math.max(...safeRows.map((row) => row.length), 0);

  if (columnCount === 0) {
    return {
      headerRow: [] as string[],
      bodyRows: [] as string[][],
      columnCount: 0,
    };
  }

  const fillRow = (row: string[]) =>
    Array.from({ length: columnCount }, (_, index) => row[index] ?? "");

  const [rawHeaderRow, ...rawBodyRows] = safeRows;

  const headerRow = rawHeaderRow ? fillRow(rawHeaderRow) : fillRow([]);

  return {
    headerRow,
    bodyRows: rawBodyRows.map(fillRow),
    columnCount,
  };
}

function getColumnTrackFromCells(cells: string[]) {
  const longestLength = cells.reduce(
    (maxLength, cell) => Math.max(maxLength, cell.trim().length),
    0,
  );
  const estimatedWidth = longestLength * 8 + 44;
  const clampedWidth = Math.min(320, Math.max(120, estimatedWidth));

  return `${clampedWidth}px`;
}

function VirtualizedGridPreview({ rows }: { rows: string[][] }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { headerRow, bodyRows, columnCount } = useMemo(
    () => normalizePreviewRows(rows),
    [rows],
  );
  const gridTemplateColumns = useMemo(() => {
    if (columnCount === 0) {
      return "minmax(140px, 1fr)";
    }

    return Array.from({ length: columnCount }, (_, index) =>
      getColumnTrackFromCells([
        headerRow[index] ?? "",
        ...bodyRows.map((row) => row[index] ?? ""),
      ]),
    ).join(" ");
  }, [bodyRows, columnCount, headerRow]);
  const rowVirtualizer = useVirtualizer({
    count: bodyRows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 36,
    overscan: 12,
  });

  if (columnCount === 0) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-text-dim text-sm text-center">
        데이터가 없습니다.
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="scrollbar-subtle h-full w-full overflow-auto bg-surface text-xs text-text"
    >
      <div className="min-w-full w-fit">
        <div
          className="sticky top-0 z-[1] grid min-w-full border-b-2 border-border bg-surface-2"
          style={{ gridTemplateColumns, width: "max-content" }}
        >
          {headerRow.map((cell, index) => (
            <div
              key={`header-${index}`}
              className="overflow-hidden text-ellipsis whitespace-nowrap border-r border-border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.04em] text-text-secondary last:border-r-0"
              title={cell}
            >
              {cell || "-"}
            </div>
          ))}
        </div>

        <div
          className="relative"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = bodyRows[virtualRow.index];
            if (!row) return null;

            return (
              <div
                key={virtualRow.key}
                className={`absolute left-0 top-0 grid min-w-full border-b border-border ${
                  virtualRow.index % 2 === 0 ? "bg-surface" : "bg-surface-2/75"
                }`}
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  gridTemplateColumns,
                  width: "max-content",
                }}
              >
                {row.map((cell, index) => (
                  <div
                    key={`${virtualRow.index}-${index}`}
                    className="overflow-hidden text-ellipsis whitespace-nowrap border-r border-border px-3 py-2 text-text last:border-r-0"
                    title={cell}
                  >
                    {cell || "-"}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
