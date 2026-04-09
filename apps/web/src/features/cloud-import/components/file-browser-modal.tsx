"use client";

import { FileSpreadsheet, Folder, Loader2, X } from "lucide-react";
import type { CloudProvider, DriveFile } from "../types";
import styles from "../cloud-import.module.css";

interface FileBrowserModalProps {
  provider: CloudProvider;
  files: DriveFile[];
  loading: boolean;
  analyzing: boolean;
  error: string | null;
  onSelectFile: (file: DriveFile) => void;
  onLoadFolder: (folderId: string) => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function FileBrowserModal({
  provider,
  files,
  loading,
  analyzing,
  error,
  onSelectFile,
  onLoadFolder,
  onClose,
}: FileBrowserModalProps) {
  const providerLabel = provider === "onedrive" ? "OneDrive" : "Google Drive";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>{providerLabel} 파일 선택</h3>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <div className={styles.fileHint}>
          스프레드시트를 선택하면 AI가 수강생 이름·연락처를 분석해 스페이스와 수강생을 자동으로 만들어줍니다. 폴더는 클릭하면 안으로 들어갑니다.
        </div>

        <div className={styles.modalBody}>
          {analyzing && (
            <div className={styles.loadingOverlay}>
              <Loader2 size={24} className={styles.spinner} />
              <span>AI가 파일을 분석하고 있습니다...</span>
            </div>
          )}

          {error && <div className={styles.errorMsg}>{error}</div>}

          {loading ? (
            <div className={styles.loadingState}>
              <Loader2 size={20} className={styles.spinner} />
              <span>파일 목록을 불러오는 중...</span>
            </div>
          ) : files.length === 0 ? (
            <div className={styles.emptyState}>파일이 없습니다.</div>
          ) : (
            <ul className={styles.fileGrid}>
              {files.map((file) => (
                <li key={file.id}>
                  <button
                    className={`${styles.fileCard} ${file.isSpreadsheet ? styles.fileCardExcel : ""} ${file.isFolder ? styles.fileCardFolder : ""}`}
                    onClick={() => {
                      if (file.isFolder) {
                        onLoadFolder(file.id);
                      } else if (file.isSpreadsheet) {
                        onSelectFile(file);
                      }
                    }}
                    disabled={!file.isFolder && !file.isSpreadsheet}
                    type="button"
                    title={file.isSpreadsheet ? "클릭하면 AI 분석을 시작합니다" : file.isFolder ? "폴더 열기" : "지원하지 않는 파일 형식"}
                  >
                    <div className={styles.fileCardIcon}>
                      {file.isFolder ? (
                        <Folder size={28} />
                      ) : (
                        <FileSpreadsheet size={28} />
                      )}
                    </div>
                    <span className={styles.fileCardName}>{file.name}</span>
                    <span className={styles.fileCardMeta}>
                      {file.isFolder ? "폴더" : formatSize(file.size)}
                      {" · "}
                      {formatDate(file.lastModifiedAt)}
                    </span>
                    {file.isSpreadsheet && (
                      <span className={styles.fileCardAction}>클릭하여 분석</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
