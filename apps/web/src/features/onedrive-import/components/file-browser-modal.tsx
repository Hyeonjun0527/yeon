"use client";

import { FileSpreadsheet, Folder, Loader2, X } from "lucide-react";
import type { OneDriveFile } from "../hooks/use-onedrive";
import styles from "../onedrive-import.module.css";

interface FileBrowserModalProps {
  files: OneDriveFile[];
  loading: boolean;
  analyzing: boolean;
  error: string | null;
  onSelectFile: (file: OneDriveFile) => void;
  onLoadFolder: (folderId: string) => void;
  onClose: () => void;
}

function formatSize(bytes: number): string {
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

function isExcelFile(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}

export function FileBrowserModal({
  files,
  loading,
  analyzing,
  error,
  onSelectFile,
  onLoadFolder,
  onClose,
}: FileBrowserModalProps) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3 className={styles.modalTitle}>OneDrive 파일 선택</h3>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
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
            <div className={styles.emptyState}>
              파일이 없습니다.
            </div>
          ) : (
            <ul className={styles.fileList}>
              {files.map((file) => {
                const isExcel = isExcelFile(file.name);
                const isFolder = !file.mimeType;

                return (
                  <li key={file.id}>
                    <button
                      className={`${styles.fileItem} ${isExcel ? styles.fileItemExcel : ""}`}
                      onClick={() => {
                        if (isFolder) {
                          onLoadFolder(file.id);
                        } else if (isExcel) {
                          onSelectFile(file);
                        }
                      }}
                      disabled={!isFolder && !isExcel}
                      type="button"
                    >
                      {isFolder ? (
                        <Folder size={18} className={styles.fileIcon} />
                      ) : (
                        <FileSpreadsheet
                          size={18}
                          className={`${styles.fileIcon} ${isExcel ? styles.fileIconExcel : ""}`}
                        />
                      )}
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileMeta}>
                        {formatSize(file.size)}
                      </span>
                      <span className={styles.fileMeta}>
                        {formatDate(file.lastModifiedAt)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
