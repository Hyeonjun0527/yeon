"use client";

import { FileSpreadsheet, Folder, Loader2, X } from "lucide-react";
import type { OneDriveFile } from "../hooks/use-onedrive";

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
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-xl w-[480px] max-h-[80vh] flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.3)] md:w-[calc(100vw-32px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-[15px] font-semibold text-text">
            OneDrive 파일 선택
          </h3>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-[6px] border-0 bg-transparent text-text-dim cursor-pointer transition-[background] duration-[120ms] hover:bg-[var(--surface3)] hover:text-text"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1">
          {analyzing && (
            <div className="flex items-center justify-center gap-2.5 p-6 mb-3 bg-accent-dim rounded-lg text-accent text-[13px] font-medium">
              <Loader2 size={24} className="animate-spin" />
              <span>AI가 파일을 분석하고 있습니다...</span>
            </div>
          )}

          {error && (
            <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
              <Loader2 size={20} className="animate-spin" />
              <span>파일 목록을 불러오는 중...</span>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-10 text-text-dim text-[13px]">
              파일이 없습니다.
            </div>
          ) : (
            <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
              {files.map((file) => {
                const isExcel = isExcelFile(file.name);
                const isFolder = !file.mimeType;

                return (
                  <li key={file.id}>
                    <button
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[6px] border-0 bg-transparent text-[13px] cursor-pointer w-full text-left transition-[background] duration-[120ms] ${
                        isExcel
                          ? "text-text hover:bg-[var(--surface3)]"
                          : "text-text-secondary hover:bg-[var(--surface3)]"
                      } disabled:opacity-40 disabled:cursor-not-allowed`}
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
                        <Folder
                          size={18}
                          className="flex-shrink-0 text-text-dim"
                        />
                      ) : (
                        <FileSpreadsheet
                          size={18}
                          className={`flex-shrink-0 ${isExcel ? "text-green" : "text-text-dim"}`}
                        />
                      )}
                      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                        {file.name}
                      </span>
                      <span className="text-[11px] text-text-dim flex-shrink-0">
                        {formatSize(file.size)}
                      </span>
                      <span className="text-[11px] text-text-dim flex-shrink-0">
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
