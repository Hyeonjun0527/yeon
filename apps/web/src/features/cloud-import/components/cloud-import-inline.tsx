"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  CloudCog,
  File,
  FileSpreadsheet,
  Folder,
  LayoutGrid,
  List,
  Loader2,
  X,
} from "lucide-react";
import type { CloudProvider, DriveFile } from "../types";
import { useCloudImport } from "../hooks/use-cloud-import";
import { FilePreview } from "./file-preview";
import { ImportRightPanel } from "./import-right-panel";
import styles from "../cloud-import.module.css";

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

interface CloudImportInlineProps {
  initialProvider?: CloudProvider;
  onClose: () => void;
  onImportComplete: () => void;
}

export function CloudImportInline({
  initialProvider,
  onClose,
  onImportComplete,
}: CloudImportInlineProps) {
  const [activeProvider, setActiveProvider] = useState<CloudProvider>(
    initialProvider ?? "onedrive",
  );

  const onedrive = useCloudImport("onedrive", onImportComplete);
  const googledrive = useCloudImport("googledrive", onImportComplete);
  const activeHook = activeProvider === "onedrive" ? onedrive : googledrive;

  /* 초기 로드 */
  useEffect(() => {
    activeHook.checkStatus();
  }, [activeProvider]); // activeHook 참조는 매 렌더마다 바뀌므로 activeProvider만 의존성으로 사용

  /* 연결 확인 후 파일 로드 */
  useEffect(() => {
    if (activeHook.connected && activeHook.files.length === 0 && !activeHook.filesLoading) {
      activeHook.loadFiles();
    }
  }, [activeHook.connected]); // connected 상태 변화 시에만 파일 로드 트리거

  /* importResult 세팅 시 자동 닫기 */
  useEffect(() => {
    if (activeHook.importResult) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeHook.importResult, onClose]);

  const switchProvider = (p: CloudProvider) => {
    if (p === activeProvider) return;
    setActiveProvider(p);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === activeHook.folderStack.length - 1) return;
    activeHook.navigateToBreadcrumbIndex(index);
  };

  const hasSelectedFile = activeHook.selectedFile !== null;

  return (
    <div className={styles.inlineContainer}>
      {/* 헤더 */}
      <div className={styles.inlineHeader}>
        <h3 className={styles.modalTitle}>클라우드에서 가져오기</h3>
        <button className={styles.closeBtn} onClick={onClose} type="button">
          <X size={18} />
        </button>
      </div>

      {/* Provider 탭 */}
      <div className={styles.providerTabs}>
        <button
          className={`${styles.providerTab} ${activeProvider === "onedrive" ? styles.providerTabActive : ""}`}
          onClick={() => switchProvider("onedrive")}
          type="button"
        >
          OneDrive
        </button>
        <button
          className={`${styles.providerTab} ${activeProvider === "googledrive" ? styles.providerTabActive : ""}`}
          onClick={() => switchProvider("googledrive")}
          type="button"
        >
          Google Drive
        </button>
      </div>

      {/* OAuth 미연결 */}
      {!activeHook.connecting && !activeHook.connected && (
        <div className={styles.connectPrompt}>
          <CloudCog size={32} style={{ color: "var(--text-dim)", marginBottom: 8 }} />
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
            {activeProvider === "onedrive" ? "OneDrive" : "Google Drive"} 연결이 필요합니다
          </p>
          <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
            클라우드 드라이브를 연결하면 파일을 바로 가져올 수 있습니다.
          </p>
          <button className={styles.importBtn} onClick={activeHook.connectDrive} type="button">
            연결하기
          </button>
        </div>
      )}

      {/* 연결 확인 중 */}
      {activeHook.connecting && (
        <div className={styles.loadingState}>
          <Loader2 size={20} className={styles.spinner} />
          <span>연결 상태 확인 중...</span>
        </div>
      )}

      {/* 연결 완료: 파일 브라우저 */}
      {activeHook.connected && !activeHook.connecting && (
        <>
          {/* 브레드크럼 */}
          <div className={styles.breadcrumb} style={{ justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 2, overflow: "hidden" }}>
              {activeHook.folderStack.length > 1 && (
                <button
                  className={styles.breadcrumbItem}
                  onClick={activeHook.navigateBack}
                  type="button"
                  style={{ display: "flex", alignItems: "center", gap: 2 }}
                >
                  <ArrowLeft size={14} />
                </button>
              )}
              {activeHook.folderStack.map((entry, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center" }}>
                  {i > 0 && <ChevronRight size={12} className={styles.breadcrumbSep} />}
                  <button
                    className={styles.breadcrumbItem}
                    onClick={() => handleBreadcrumbClick(i)}
                    type="button"
                    style={{
                      fontWeight: i === activeHook.folderStack.length - 1 ? 600 : 400,
                    }}
                  >
                    {entry.name}
                  </button>
                </span>
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => activeHook.setViewMode("grid")}
                style={{
                  padding: "4px 6px",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  background: activeHook.viewMode === "grid" ? "var(--accent)" : "transparent",
                  color: activeHook.viewMode === "grid" ? "#fff" : "var(--text-dim)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="그리드 보기"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                type="button"
                onClick={() => activeHook.setViewMode("list")}
                style={{
                  padding: "4px 6px",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  background: activeHook.viewMode === "list" ? "var(--accent)" : "transparent",
                  color: activeHook.viewMode === "list" ? "#fff" : "var(--text-dim)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
                title="목록 보기"
              >
                <List size={14} />
              </button>
            </div>
          </div>

          {/* 에러 */}
          {activeHook.error && !hasSelectedFile && (
            <div style={{ padding: "0 20px" }}>
              <div className={styles.errorMsg}>{activeHook.error}</div>
            </div>
          )}

          {/* 메인 콘텐츠 영역 */}
          <div className={hasSelectedFile ? styles.splitView : styles.splitViewFull}>
            {/* 왼쪽: 파일 선택 시 미리보기, 아니면 그리드 */}
            {hasSelectedFile && activeHook.fileProxyUrl ? (
              <>
                <div className={styles.splitLeft}>
                  <FilePreview
                    uri={activeHook.fileProxyUrl}
                    mimeType={activeHook.selectedFile?.mimeType ?? ""}
                    fileName={activeHook.selectedFile?.name ?? ""}
                  />
                </div>
                <div className={styles.splitRight}>
                  <ImportRightPanel hook={activeHook} onClose={onClose} />
                </div>
              </>
            ) : (
              <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
                <FileGrid
                  files={activeHook.files}
                  loading={activeHook.filesLoading}
                  viewMode={activeHook.viewMode}
                  onSelectFile={activeHook.selectFileForPreview}
                  onNavigateFolder={activeHook.navigateToFolder}
                />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── File Grid ── */

interface FileGridProps {
  files: DriveFile[];
  loading: boolean;
  viewMode: "grid" | "list";
  onSelectFile: (file: DriveFile) => void;
  onNavigateFolder: (id: string, name: string) => void;
}

function FileGrid({ files, loading, viewMode, onSelectFile, onNavigateFolder }: FileGridProps) {
  if (loading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 size={20} className={styles.spinner} />
        <span>파일 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return <div className={styles.emptyState}>파일이 없습니다.</div>;
  }

  if (viewMode === "list") {
    return (
      <ul className={styles.fileList}>
        {files.map((file) => (
          <li key={file.id}>
            <button
              className={`${styles.fileListRow} ${file.isSpreadsheet ? styles.fileListRowExcel : ""} ${file.isFolder ? styles.fileListRowFolder : ""}`}
              onClick={() => {
                if (file.isFolder) onNavigateFolder(file.id, file.name);
                else if (file.isSpreadsheet) onSelectFile(file);
              }}
              disabled={!file.isFolder && !file.isSpreadsheet}
              type="button"
            >
              <span className={styles.fileListIcon}>
                {file.isFolder ? (
                  <Folder size={16} />
                ) : file.isSpreadsheet ? (
                  <FileSpreadsheet size={16} />
                ) : (
                  <File size={16} />
                )}
              </span>
              <span className={styles.fileListName}>{file.name}</span>
              <span className={styles.fileListMeta}>
                {file.isFolder ? "폴더" : formatSize(file.size)}
              </span>
              <span className={styles.fileListDate}>{formatDate(file.lastModifiedAt)}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className={styles.fileGrid}>
      {files.map((file) => (
        <li key={file.id}>
          <button
            className={`${styles.fileCard} ${file.isSpreadsheet ? styles.fileCardExcel : ""} ${file.isFolder ? styles.fileCardFolder : ""}`}
            onClick={() => {
              if (file.isFolder) {
                onNavigateFolder(file.id, file.name);
              } else if (file.isSpreadsheet) {
                onSelectFile(file);
              }
            }}
            disabled={!file.isFolder && !file.isSpreadsheet}
            type="button"
            title={
              file.isSpreadsheet
                ? "클릭하여 미리보기"
                : file.isFolder
                  ? "폴더 열기"
                  : "지원하지 않는 파일 형식"
            }
          >
            <div className={styles.fileCardIcon}>
              {file.isFolder ? (
                <Folder size={28} />
              ) : file.isSpreadsheet ? (
                <FileSpreadsheet size={28} />
              ) : (
                <File size={28} />
              )}
            </div>
            <span className={styles.fileCardName}>{file.name}</span>
            <span className={styles.fileCardMeta}>
              {file.isFolder ? "폴더" : formatSize(file.size)}
              {" · "}
              {formatDate(file.lastModifiedAt)}
            </span>
            {file.isSpreadsheet && (
              <span className={styles.fileCardAction}>클릭하여 선택</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
