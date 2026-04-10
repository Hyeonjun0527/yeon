"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  CloudCog,
  File,
  FileSpreadsheet,
  FileText,
  Folder,
  ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import type { CloudProvider, DriveFile } from "../types";
import { isSelectableKind } from "../file-kind";
import { useCloudImport } from "../hooks/use-cloud-import";
import { useLocalImport } from "../hooks/use-local-import";
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
  const [isDragging, setIsDragging] = useState(false);
  const [rightPanelWidth, setRightPanelWidth] = useState(300);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // 리사이즈 상태 — ref로 관리해야 stale closure 없음
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, width: 300 });
  const rightPanelWidthRef = useRef(300);

  /* 마운트 시 단 한 번 등록, 언마운트 시 제거 */
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = resizeStartRef.current.x - e.clientX;
      const next = Math.max(160, Math.min(720, resizeStartRef.current.width + delta));
      rightPanelWidthRef.current = next;
      setRightPanelWidth(next);
    };

    const onMouseUp = () => {
      if (!isResizingRef.current) return;
      isResizingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  const onedrive = useCloudImport("onedrive", onImportComplete);
  const googledrive = useCloudImport("googledrive", onImportComplete);
  const localImport = useLocalImport(onImportComplete);
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

  /* cloud importResult 세팅 시 자동 닫기 */
  useEffect(() => {
    if (activeHook.importResult) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeHook.importResult, onClose]);

  /* local importResult 세팅 시 자동 닫기 */
  useEffect(() => {
    if (localImport.importResult) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [localImport.importResult, onClose]);

  const switchProvider = (p: CloudProvider) => {
    if (p === activeProvider) return;
    setActiveProvider(p);
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === activeHook.folderStack.length - 1) return;
    activeHook.navigateToBreadcrumbIndex(index);
  };

  /* 드래그앤드롭 핸들러 */
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current += 1;
    if (dragCounterRef.current === 1) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current === 0) setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) localImport.selectLocalFile(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) localImport.selectLocalFile(file);
    e.target.value = "";
  };

  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    resizeStartRef.current = { x: e.clientX, width: rightPanelWidthRef.current };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const isLocalMode = localImport.selectedFile !== null;
  const hasSelectedFile = activeHook.selectedFile !== null;

  return (
    <div
      className={styles.inlineContainer}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 드래그 오버레이 */}
      {isDragging && (
        <div className={styles.dropOverlay}>
          <Upload size={36} />
          <p className={styles.dropOverlayTitle}>파일을 놓으세요</p>
          <p className={styles.dropOverlaySub}>.xlsx, .xls, .csv, .txt, .pdf, 이미지 파일 지원</p>
        </div>
      )}

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.txt,.tsv,.md,.pdf,image/*"
        style={{ display: "none" }}
        onChange={handleFileInputChange}
      />

      {/* 헤더: 프리뷰 모드에서는 숨김 */}
      {!isLocalMode && !hasSelectedFile && <div className={styles.inlineHeader}>
        <h3 className={styles.modalTitle}>파일 가져오기</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            className={styles.uploadFileBtn}
            onClick={() => fileInputRef.current?.click()}
            type="button"
            title="내 컴퓨터에서 파일 선택"
          >
            <Upload size={15} />
            <span>내 컴퓨터</span>
          </button>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>
      </div>}

      {/* 로컬 프리뷰 모드: 탭·브레드크럼 숨기고 전체 높이 활용 */}
      {isLocalMode && localImport.fileProxyUrl ? (
        <div className={styles.splitView}>
          <div className={styles.splitLeft}>
            <div className={styles.previewHeader}>
              <button
                type="button"
                className={styles.backToListBtn}
                onClick={localImport.deselectFile}
              >
                <ArrowLeft size={13} />
                목록으로
              </button>
              <span className={styles.previewFileName}>
                {localImport.selectedFile?.name}
              </span>
            </div>
            <div className={styles.previewBody}>
              <FilePreview
                uri={localImport.fileProxyUrl}
                mimeType={localImport.selectedFile?.mimeType ?? ""}
                fileName={localImport.selectedFile?.name ?? ""}
              />
            </div>
          </div>
          <div className={styles.resizeHandle} onMouseDown={handleResizeMouseDown} />
          <div className={styles.splitRight} style={{ width: rightPanelWidth }}>
            <ImportRightPanel hook={localImport} onClose={onClose} />
          </div>
        </div>
      ) : hasSelectedFile && activeHook.fileProxyUrl ? (
        /* 클라우드 프리뷰 모드: 탭·브레드크럼 숨기고 전체 높이 활용 */
        <div className={styles.splitView}>
          <div className={styles.splitLeft}>
            <div className={styles.previewHeader}>
              <button
                type="button"
                className={styles.backToListBtn}
                onClick={activeHook.deselectFile}
              >
                <ArrowLeft size={13} />
                목록으로
              </button>
              <span className={styles.previewFileName}>
                {activeHook.selectedFile?.name}
              </span>
            </div>
            <div className={styles.previewBody}>
              <FilePreview
                uri={activeHook.fileProxyUrl}
                mimeType={activeHook.selectedFile?.mimeType ?? ""}
                fileName={activeHook.selectedFile?.name ?? ""}
              />
            </div>
          </div>
          <div className={styles.resizeHandle} onMouseDown={handleResizeMouseDown} />
          <div className={styles.splitRight} style={{ width: rightPanelWidth }}>
            <ImportRightPanel hook={activeHook} onClose={onClose} />
          </div>
        </div>
      ) : (
        /* 파일 브라우저 모드 */
        <>
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
                        style={{ fontWeight: i === activeHook.folderStack.length - 1 ? 600 : 400 }}
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
              {activeHook.error && (
                <div style={{ padding: "0 20px" }}>
                  <div className={styles.errorMsg}>{activeHook.error}</div>
                </div>
              )}

              {/* 파일 그리드 */}
              <div className={styles.splitViewFull}>
                <div style={{ flex: 1, overflow: "auto", padding: "16px 20px" }}>
                  <FileGrid
                    files={activeHook.files}
                    loading={activeHook.filesLoading}
                    viewMode={activeHook.viewMode}
                    onSelectFile={activeHook.selectFileForPreview}
                    onNavigateFolder={activeHook.navigateToFolder}
                  />
                </div>
              </div>
            </>
          )}
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

function getFileKindListRowClass(file: DriveFile): string {
  switch (file.fileKind) {
    case "folder":
      return styles.fileListRowFolder;
    case "spreadsheet":
      return styles.fileListRowExcel;
    case "csv":
      return styles.fileListRowCsv;
    case "txt":
      return styles.fileListRowTxt;
    case "pdf":
      return styles.fileListRowPdf;
    case "image":
      return styles.fileListRowImage;
    default:
      return "";
  }
}

function getFileKindCardClass(file: DriveFile): string {
  switch (file.fileKind) {
    case "folder":
      return styles.fileCardFolder;
    case "spreadsheet":
      return styles.fileCardExcel;
    case "csv":
      return styles.fileCardCsv;
    case "txt":
      return styles.fileCardTxt;
    case "pdf":
      return styles.fileCardPdf;
    case "image":
      return styles.fileCardImage;
    default:
      return "";
  }
}

function FileKindIcon({ file, size }: { file: DriveFile; size: number }) {
  switch (file.fileKind) {
    case "folder":
      return <Folder size={size} />;
    case "spreadsheet":
      return <FileSpreadsheet size={size} />;
    case "csv":
      return <FileSpreadsheet size={size} />;
    case "txt":
      return <FileText size={size} />;
    case "pdf":
      return <FileText size={size} />;
    case "image":
      return <ImageIcon size={size} />;
    default:
      return <File size={size} />;
  }
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

  const selectable = (file: DriveFile) => isSelectableKind(file.fileKind);

  if (viewMode === "list") {
    return (
      <ul className={styles.fileList}>
        {files.map((file) => (
          <li key={file.id}>
            <button
              className={`${styles.fileListRow} ${getFileKindListRowClass(file)}`}
              onClick={() => {
                if (file.isFolder) onNavigateFolder(file.id, file.name);
                else if (selectable(file)) onSelectFile(file);
              }}
              disabled={!file.isFolder && !selectable(file)}
              type="button"
            >
              <span className={styles.fileListIcon}>
                <FileKindIcon file={file} size={16} />
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
            className={`${styles.fileCard} ${getFileKindCardClass(file)}`}
            onClick={() => {
              if (file.isFolder) {
                onNavigateFolder(file.id, file.name);
              } else if (selectable(file)) {
                onSelectFile(file);
              }
            }}
            disabled={!file.isFolder && !selectable(file)}
            type="button"
            title={
              selectable(file)
                ? "클릭하여 미리보기"
                : file.isFolder
                  ? "폴더 열기"
                  : "지원하지 않는 파일 형식"
            }
          >
            <div className={styles.fileCardIcon}>
              <FileKindIcon file={file} size={28} />
            </div>
            <span className={styles.fileCardName}>{file.name}</span>
            <span className={styles.fileCardMeta}>
              {file.isFolder ? "폴더" : formatSize(file.size)}
              {" · "}
              {formatDate(file.lastModifiedAt)}
            </span>
            {selectable(file) && (
              <span className={styles.fileCardAction}>클릭하여 선택</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
