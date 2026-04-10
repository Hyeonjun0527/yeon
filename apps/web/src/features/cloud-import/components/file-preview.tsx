"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { detectFileKind } from "../file-kind";
import styles from "../cloud-import.module.css";

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
      <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto" }}>
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
    <div className={styles.previewPlaceholder}>
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
        const res = await fetch(uri);
        if (!res.ok) throw new Error("파일을 불러올 수 없습니다.");
        const blob = await res.blob();
        const heic2any = (await import("heic2any")).default;
        const result = await heic2any({ blob, toType: "image/png", quality: 0.85 });
        const output = Array.isArray(result) ? result[0] : result;
        blobUrl = URL.createObjectURL(output as Blob);
        if (!cancelled) setObjectUrl(blobUrl);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "HEIC 변환에 실패했습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [uri]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={20} className={styles.spinner} />
        <span>HEIC 변환 중...</span>
      </div>
    );
  }

  if (error) return <div className={styles.errorMsg}>{error}</div>;
  if (!objectUrl) return null;

  return (
    <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto" }}>
      <img
        src={objectUrl}
        alt={fileName}
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
      />
    </div>
  );
}

function SpreadsheetPreview({ uri }: { uri: string }) {
  const [htmlContent, setHtmlContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setHtmlContent(null);
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(uri);
        if (!res.ok) throw new Error("파일을 불러올 수 없습니다.");
        const buffer = await res.arrayBuffer();
        const XLSX = await import("xlsx");
        const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        if (!ws) throw new Error("시트를 읽을 수 없습니다.");
        const html = XLSX.utils.sheet_to_html(ws);
        if (!cancelled) setHtmlContent(html);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "파일을 불러올 수 없습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={20} className={styles.spinner} />
        <span>미리보기 로딩 중...</span>
      </div>
    );
  }

  if (error) {
    return <div className={styles.errorMsg}>{error}</div>;
  }

  if (!htmlContent) {
    return (
      <div className={styles.previewPlaceholder}>미리보기를 지원하지 않는 형식입니다.</div>
    );
  }

  return (
    <div
      className={styles.spreadsheetPreview}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: SheetJS가 생성한 테이블 HTML
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}

function CsvPreview({ uri }: { uri: string }) {
  const [rows, setRows] = useState<string[][] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setRows(null);
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(uri);
        if (!res.ok) throw new Error("파일을 불러올 수 없습니다.");
        const text = await res.text();
        const lines = text.split("\n").filter((l) => l.trim());
        const parsed = lines.map((line) => line.split(",").map((cell) => cell.trim()));
        if (!cancelled) setRows(parsed);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "파일을 불러올 수 없습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={20} className={styles.spinner} />
        <span>미리보기 로딩 중...</span>
      </div>
    );
  }

  if (error) return <div className={styles.errorMsg}>{error}</div>;
  if (!rows || rows.length === 0) {
    return <div className={styles.previewPlaceholder}>데이터가 없습니다.</div>;
  }

  return (
    <div className={styles.spreadsheetPreview}>
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
  const [text, setText] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setText(null);
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(uri);
        if (!res.ok) throw new Error("파일을 불러올 수 없습니다.");
        const content = await res.text();
        if (!cancelled) setText(content);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "파일을 불러올 수 없습니다.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [uri]);

  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={20} className={styles.spinner} />
        <span>미리보기 로딩 중...</span>
      </div>
    );
  }

  if (error) return <div className={styles.errorMsg}>{error}</div>;
  if (text === null) return null;

  return (
    <div className={styles.txtPreview}>
      <pre>{text}</pre>
    </div>
  );
}

function PdfPreview({ uri, fileName }: { uri: string; fileName: string }) {
  return (
    <iframe
      src={uri}
      title={`${fileName} 미리보기`}
      style={{ width: "100%", height: "100%", border: "none" }}
    />
  );
}
