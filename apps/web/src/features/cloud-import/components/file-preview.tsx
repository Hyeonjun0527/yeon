"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import styles from "../cloud-import.module.css";

const DocViewer = dynamic(
  () => import("@cyntler/react-doc-viewer").then((mod) => mod.default),
  { ssr: false },
);

const TEXT_EXTENSIONS = new Set([
  "txt", "js", "ts", "jsx", "tsx", "py", "json", "md", "css", "yaml", "yml", "sh",
]);

function resolveFileType(mimeType: string, fileName: string): string | null {
  if (mimeType === "application/vnd.google-apps.spreadsheet") return "xlsx";

  const mimeMap: Record<string, string> = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
    "application/vnd.ms-excel": "xls",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "application/msword": "doc",
    "application/pdf": "pdf",
    "text/csv": "csv",
  };

  if (mimeMap[mimeType]) return mimeMap[mimeType];

  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (["xlsx", "xls", "docx", "doc", "pdf", "csv"].includes(ext)) return ext;

  return ext || null;
}

interface FilePreviewProps {
  uri: string;
  mimeType: string;
  fileName: string;
}

export function FilePreview({ uri, mimeType, fileName }: FilePreviewProps) {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const isText = TEXT_EXTENSIONS.has(ext);

  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setTextContent(null);

    if (isText) {
      fetch(uri)
        .then(async (res) => {
          if (!res.ok) throw new Error("파일을 불러올 수 없습니다.");
          return res.text();
        })
        .then((text) => {
          setTextContent(text);
          setLoading(false);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "파일을 불러올 수 없습니다.");
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [uri, isText]);

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

  if (isText && textContent !== null) {
    return (
      <pre
        style={{
          padding: 16,
          fontSize: 13,
          lineHeight: 1.6,
          overflow: "auto",
          height: "100%",
          margin: 0,
          background: "var(--surface2, var(--surface))",
          color: "var(--text)",
          borderRadius: 8,
        }}
      >
        {textContent}
      </pre>
    );
  }

  const fileType = resolveFileType(mimeType, fileName);
  if (!fileType) {
    return (
      <div className={styles.previewPlaceholder}>
        미리보기를 지원하지 않는 형식입니다.
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <DocViewer
        documents={[{ uri, fileType }]}
        config={{ header: { disableHeader: true } }}
      />
    </div>
  );
}
