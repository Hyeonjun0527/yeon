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
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef({ x: 0, width: 300 });
  const rightPanelWidthRef = useRef(300);

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

  useEffect(() => {
    activeHook.checkStatus();
  }, [activeProvider]); // eslint-disable-line

  useEffect(() => {
    if (activeHook.connected && activeHook.files.length === 0 && !activeHook.filesLoading) {
      activeHook.loadFiles();
    }
  }, [activeHook.connected]); // eslint-disable-line

  useEffect(() => {
    if (activeHook.importResult) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeHook.importResult, onClose]);

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
      className="relative h-full flex flex-col overflow-hidden"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 드래그 오버레이 */}
      {isDragging && (
        <div className="absolute inset-0 bg-[rgba(var(--accent-rgb,99,102,241),0.08)] border-2 border-dashed border-accent rounded-xl flex flex-col items-center justify-center gap-2 z-50 text-accent pointer-events-none">
          <Upload size={36} />
          <p className="text-base font-semibold text-accent m-0">파일을 놓으세요</p>
          <p className="text-xs text-text-dim m-0">.xlsx, .xls, .csv, .txt, .pdf, 이미지 파일 지원</p>
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
      {!isLocalMode && !hasSelectedFile && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-[15px] font-semibold text-text">파일 가져오기</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              className="flex items-center gap-[5px] px-2.5 py-[5px] rounded-[6px] border border-border bg-transparent text-text-secondary text-xs font-medium cursor-pointer transition-[background,color,border-color] duration-[120ms] hover:bg-accent-dim hover:text-accent hover:border-accent-border"
              onClick={() => fileInputRef.current?.click()}
              type="button"
              title="내 컴퓨터에서 파일 선택"
            >
              <Upload size={15} />
              <span>내 컴퓨터</span>
            </button>
            <button
              className="flex items-center justify-center w-7 h-7 rounded-[6px] border-0 bg-transparent text-text-dim cursor-pointer transition-[background] duration-[120ms] hover:bg-[var(--surface3)] hover:text-text"
              onClick={onClose}
              type="button"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* 로컬 프리뷰 모드 */}
      {isLocalMode && localImport.fileProxyUrl ? (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden border-r border-border flex flex-col">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border flex-shrink-0 bg-surface">
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 rounded-[5px] border border-border bg-transparent text-text-secondary text-xs font-medium cursor-pointer whitespace-nowrap flex-shrink-0 transition-[background,color] duration-[120ms] hover:bg-[var(--surface3)] hover:text-text"
                onClick={localImport.deselectFile}
              >
                <ArrowLeft size={13} />
                목록으로
              </button>
              <span className="text-[13px] font-medium text-text overflow-hidden text-ellipsis whitespace-nowrap">
                {localImport.selectedFile?.name}
              </span>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <FilePreview
                uri={localImport.fileProxyUrl}
                mimeType={localImport.selectedFile?.mimeType ?? ""}
                fileName={localImport.selectedFile?.name ?? ""}
              />
            </div>
          </div>
          <div
            className="w-[5px] flex-shrink-0 cursor-col-resize bg-transparent border-l border-border transition-[background,border-color] duration-150 hover:bg-accent-dim hover:border-l-accent"
            onMouseDown={handleResizeMouseDown}
          />
          <div className="flex-shrink-0 overflow-auto px-5 py-4" style={{ width: rightPanelWidth }}>
            <ImportRightPanel hook={localImport} onClose={onClose} />
          </div>
        </div>
      ) : hasSelectedFile && activeHook.fileProxyUrl ? (
        /* 클라우드 프리뷰 모드 */
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden border-r border-border flex flex-col">
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-border flex-shrink-0 bg-surface">
              <button
                type="button"
                className="flex items-center gap-1 px-2 py-1 rounded-[5px] border border-border bg-transparent text-text-secondary text-xs font-medium cursor-pointer whitespace-nowrap flex-shrink-0 transition-[background,color] duration-[120ms] hover:bg-[var(--surface3)] hover:text-text"
                onClick={activeHook.deselectFile}
              >
                <ArrowLeft size={13} />
                목록으로
              </button>
              <span className="text-[13px] font-medium text-text overflow-hidden text-ellipsis whitespace-nowrap">
                {activeHook.selectedFile?.name}
              </span>
            </div>
            <div className="flex-1 overflow-auto p-0">
              <FilePreview
                uri={activeHook.fileProxyUrl}
                mimeType={activeHook.selectedFile?.mimeType ?? ""}
                fileName={activeHook.selectedFile?.name ?? ""}
              />
            </div>
          </div>
          <div
            className="w-[5px] flex-shrink-0 cursor-col-resize bg-transparent border-l border-border transition-[background,border-color] duration-150 hover:bg-accent-dim hover:border-l-accent"
            onMouseDown={handleResizeMouseDown}
          />
          <div className="flex-shrink-0 overflow-auto px-5 py-4" style={{ width: rightPanelWidth }}>
            <ImportRightPanel hook={activeHook} onClose={onClose} />
          </div>
        </div>
      ) : (
        /* 파일 브라우저 모드 */
        <>
          {/* Provider 탭 */}
          <div className="flex gap-0 border-b border-border flex-shrink-0">
            <button
              className={`flex-1 px-4 py-2.5 text-[13px] font-medium bg-transparent border-0 border-b-2 cursor-pointer transition-[color,border-color] duration-150 ${
                activeProvider === "onedrive"
                  ? "text-accent border-b-accent font-semibold"
                  : "text-text-dim border-b-transparent hover:text-text"
              }`}
              onClick={() => switchProvider("onedrive")}
              type="button"
            >
              OneDrive
            </button>
            <button
              className={`flex-1 px-4 py-2.5 text-[13px] font-medium bg-transparent border-0 border-b-2 cursor-pointer transition-[color,border-color] duration-150 ${
                activeProvider === "googledrive"
                  ? "text-accent border-b-accent font-semibold"
                  : "text-text-dim border-b-transparent hover:text-text"
              }`}
              onClick={() => switchProvider("googledrive")}
              type="button"
            >
              Google Drive
            </button>
          </div>

          {/* OAuth 미연결 */}
          {!activeHook.connecting && !activeHook.connected && (
            <div className="flex flex-col items-center justify-center flex-1 px-5 py-10 text-center">
              <CloudCog size={32} style={{ color: "var(--text-dim)", marginBottom: 8 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                {activeProvider === "onedrive" ? "OneDrive" : "Google Drive"} 연결이 필요합니다
              </p>
              <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 16 }}>
                클라우드 드라이브를 연결하면 파일을 바로 가져올 수 있습니다.
              </p>
              <button
                className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] text-[13px] font-medium border-0 bg-accent text-white cursor-pointer transition-opacity duration-150 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={activeHook.connectDrive}
                type="button"
              >
                연결하기
              </button>
            </div>
          )}

          {/* 연결 확인 중 */}
          {activeHook.connecting && (
            <div className="flex items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
              <Loader2 size={20} className="animate-spin" />
              <span>연결 상태 확인 중...</span>
            </div>
          )}

          {/* 연결 완료: 파일 브라우저 */}
          {activeHook.connected && !activeHook.connecting && (
            <>
              {/* 브레드크럼 */}
              <div
                className="flex items-center px-5 py-2.5 text-[13px] text-text-dim border-b border-border flex-shrink-0 overflow-x-auto"
                style={{ justifyContent: "space-between" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 2, overflow: "hidden" }}>
                  {activeHook.folderStack.length > 1 && (
                    <button
                      className="bg-transparent border-0 px-1 py-0.5 rounded text-[13px] text-text-secondary cursor-pointer whitespace-nowrap hover:bg-[var(--surface3)] hover:text-text"
                      onClick={activeHook.navigateBack}
                      type="button"
                      style={{ display: "flex", alignItems: "center", gap: 2 }}
                    >
                      <ArrowLeft size={14} />
                    </button>
                  )}
                  {activeHook.folderStack.map((entry, i) => (
                    <span key={i} style={{ display: "flex", alignItems: "center" }}>
                      {i > 0 && (
                        <ChevronRight size={12} className="text-text-dim flex-shrink-0" />
                      )}
                      <button
                        className="bg-transparent border-0 px-1 py-0.5 rounded text-[13px] text-text-secondary cursor-pointer whitespace-nowrap hover:bg-[var(--surface3)] hover:text-text"
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
                <div className="px-5">
                  <div className="px-3 py-2.5 rounded-[6px] bg-[rgba(239,68,68,0.1)] text-red text-[13px] mb-3">
                    {activeHook.error}
                  </div>
                </div>
              )}

              {/* 파일 그리드 */}
              <div className="flex flex-1 overflow-hidden">
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

type FileKind = DriveFile["fileKind"];

function getListRowClasses(fileKind: FileKind): string {
  switch (fileKind) {
    case "folder":
      return "text-text-secondary cursor-pointer opacity-100 hover:bg-accent-dim hover:text-accent";
    case "spreadsheet":
      return "text-text cursor-pointer opacity-100 hover:bg-[rgba(34,197,94,0.06)] hover:text-green";
    case "csv":
      return "text-text cursor-pointer opacity-100 hover:bg-[rgba(34,197,94,0.06)] hover:text-green";
    case "txt":
      return "text-text cursor-pointer opacity-100 hover:bg-accent-dim hover:text-text-secondary";
    case "pdf":
      return "text-text cursor-pointer opacity-100 hover:bg-[rgba(239,68,68,0.06)] hover:text-red";
    case "image":
      return "text-text cursor-pointer opacity-100 hover:bg-[rgba(6,182,212,0.06)] hover:text-cyan";
    default:
      return "";
  }
}

function getCardClasses(fileKind: FileKind): string {
  switch (fileKind) {
    case "folder":
      return "text-text-secondary cursor-pointer opacity-100 hover:border-accent-border hover:bg-accent-dim hover:text-accent";
    case "spreadsheet":
      return "text-text cursor-pointer opacity-100 hover:border-green hover:bg-[rgba(34,197,94,0.06)]";
    case "csv":
      return "text-text cursor-pointer opacity-100 hover:border-green hover:bg-[rgba(34,197,94,0.06)]";
    case "txt":
      return "text-text cursor-pointer opacity-100 hover:border-accent-border hover:bg-accent-dim";
    case "pdf":
      return "text-text cursor-pointer opacity-100 hover:border-red hover:bg-[rgba(239,68,68,0.06)]";
    case "image":
      return "text-text cursor-pointer opacity-100 hover:border-cyan hover:bg-[rgba(6,182,212,0.06)]";
    default:
      return "";
  }
}

function getIconColor(fileKind: FileKind): string {
  switch (fileKind) {
    case "folder": return "text-accent";
    case "spreadsheet": return "text-green";
    case "csv": return "text-green";
    case "txt": return "text-text-secondary";
    case "pdf": return "text-red";
    case "image": return "text-cyan";
    default: return "text-inherit";
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
      <div className="flex items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
        <Loader2 size={20} className="animate-spin" />
        <span>파일 목록을 불러오는 중...</span>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-10 text-text-dim text-[13px]">
        파일이 없습니다.
      </div>
    );
  }

  const selectable = (file: DriveFile) => isSelectableKind(file.fileKind);

  if (viewMode === "list") {
    return (
      <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
        {files.map((file) => (
          <li key={file.id}>
            <button
              className={`grid items-center gap-2.5 px-2.5 py-2 rounded-[6px] border-0 bg-transparent text-[13px] w-full text-left transition-[background] duration-[120ms] ${
                !file.isFolder && !selectable(file)
                  ? "text-text-dim cursor-not-allowed opacity-50"
                  : getListRowClasses(file.fileKind)
              }`}
              style={{ gridTemplateColumns: "20px minmax(100px, 40%) max-content max-content" }}
              onClick={() => {
                if (file.isFolder) onNavigateFolder(file.id, file.name);
                else if (selectable(file)) onSelectFile(file);
              }}
              disabled={!file.isFolder && !selectable(file)}
              type="button"
            >
              <span className={`flex items-center flex-shrink-0 ${getIconColor(file.fileKind)}`}>
                <FileKindIcon file={file} size={16} />
              </span>
              <span className="flex-1 font-medium overflow-hidden text-ellipsis whitespace-nowrap text-text">
                {file.name}
              </span>
              <span className="text-xs text-text-dim whitespace-nowrap flex-shrink-0">
                {file.isFolder ? "폴더" : formatSize(file.size)}
              </span>
              <span className="text-xs text-text-dim whitespace-nowrap flex-shrink-0 min-w-[80px] text-right">
                {formatDate(file.lastModifiedAt)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul
      className="list-none p-0 m-0 grid gap-2"
      style={{ gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))" }}
    >
      {files.map((file) => (
        <li key={file.id}>
          <button
            className={`flex flex-col items-start gap-1.5 px-3 pt-3.5 pb-3 rounded-lg border border-border bg-[var(--surface2,var(--surface))] text-[13px] w-full text-left transition-[border-color,background,color] duration-150 ${
              !file.isFolder && !selectable(file)
                ? "text-text-dim cursor-not-allowed opacity-50"
                : getCardClasses(file.fileKind)
            }`}
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
            <div className={`flex items-center ${getIconColor(file.fileKind)}`}>
              <FileKindIcon file={file} size={28} />
            </div>
            <span className="text-[13px] font-medium text-text overflow-hidden text-ellipsis whitespace-nowrap w-full">
              {file.name}
            </span>
            <span className="text-[11px] text-text-dim whitespace-nowrap overflow-hidden text-ellipsis w-full">
              {file.isFolder ? "폴더" : formatSize(file.size)}
              {" · "}
              {formatDate(file.lastModifiedAt)}
            </span>
            {selectable(file) && (
              <span className="mt-0.5 text-[11px] font-medium text-green">클릭하여 선택</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
