"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
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
      <div className="h-full w-full flex items-center justify-center overflow-auto bg-surface">
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
    <div className="h-full w-full flex items-center justify-center overflow-auto bg-surface">
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
    data: htmlContent,
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
      return XLSX.utils.sheet_to_html(ws);
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

  if (!htmlContent) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px] text-text-dim text-sm text-center">
        미리보기를 지원하지 않는 형식입니다.
      </div>
    );
  }

  return (
    <div
      className="spreadsheet-preview h-full w-full overflow-auto text-xs text-text bg-surface"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: DOMPurify로 sanitize 후 렌더
      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(htmlContent) }}
    />
  );
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

  return (
    <div className="spreadsheet-preview h-full w-full overflow-auto text-xs text-text bg-surface">
      <table>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
    <div className="h-full w-full overflow-auto p-4 text-[13px] text-text bg-surface">
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
