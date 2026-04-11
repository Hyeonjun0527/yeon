"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronRight,
  CloudCog,
  File,
  FileClock,
  FileSpreadsheet,
  FileText,
  Folder,
  ImageIcon,
  LayoutGrid,
  List,
  Loader2,
  RotateCcw,
  Trash2,
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

type LocalImportDraftListItem = {
  id: string;
  status:
    | "uploaded"
    | "analyzing"
    | "analyzed"
    | "edited"
    | "imported"
    | "error";
  selectedFile: DriveFile;
  error: string | null;
  processingMessage: string | null;
  updatedAt: string;
  expiresAt: string;
};

function formatUpdatedAt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDraftStatusLabel(status: LocalImportDraftListItem["status"]) {
  switch (status) {
    case "uploaded":
      return "업로드 완료";
    case "analyzing":
      return "분석 중";
    case "analyzed":
      return "분석 완료";
    case "edited":
      return "수정 중";
    case "error":
      return "오류";
    default:
      return "임시초안";
  }
}

function getDraftRowSummary(draft: LocalImportDraftListItem) {
  if (draft.error) {
    return draft.status === "error"
      ? "오류가 발생한 작업입니다. 다시 열어 확인하거나 삭제할 수 있습니다."
      : "상태 확인이 필요한 작업입니다. 다시 열어 이어서 진행해 주세요.";
  }

  switch (draft.status) {
    case "uploaded":
      return "업로드한 파일입니다. 분석을 시작할 수 있습니다.";
    case "analyzing":
      return "분석 중이던 작업입니다. 결과를 이어서 확인할 수 있습니다.";
    case "analyzed":
      return "분석 결과가 저장되어 있습니다. 검토 후 가져올 수 있습니다.";
    case "edited":
      return "수정 중이던 초안입니다. 이어서 마무리할 수 있습니다.";
    default:
      return "가져오기 작업을 이어서 확인할 수 있습니다.";
  }
}

interface CloudImportInlineProps {
  onClose: () => void;
  onImportComplete: () => void;
  onDraftDiscarded?: () => void;
  expanded?: boolean;
  initialLocalDraftId?: string | null;
}

function getExpandedBottomPanelHeight(hasEditablePreview: boolean) {
  return hasEditablePreview
    ? "clamp(320px, 42vh, 520px)"
    : "clamp(220px, 28vh, 320px)";
}

const IMPORT_WORKSPACE_SPLIT_STORAGE_KEY = "yeon:import-workspace:split-ratio";
const IMPORT_WORKSPACE_DEFAULT_RATIO = 0.58;
const IMPORT_WORKSPACE_MIN_RATIO = 0.32;
const IMPORT_WORKSPACE_MAX_RATIO = 0.72;
const IMPORT_WORKSPACE_RESIZER_WIDTH = 12;
const IMPORT_WORKSPACE_MIN_LEFT_PANE_PX = 480;
const IMPORT_WORKSPACE_MIN_RIGHT_PANE_PX = 380;

export function CloudImportInline({
  onClose,
  onImportComplete,
  onDraftDiscarded,
  expanded = false,
  initialLocalDraftId = null,
}: CloudImportInlineProps) {
  const [activeProvider, setActiveProvider] =
    useState<CloudProvider>("onedrive");
  const [isDragging, setIsDragging] = useState(false);
  const [desktopSplitRatio, setDesktopSplitRatio] = useState(
    IMPORT_WORKSPACE_DEFAULT_RATIO,
  );
  const [isDesktopSplitDragging, setIsDesktopSplitDragging] = useState(false);
  const dragCounterRef = useRef(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewWorkspaceRef = useRef<HTMLDivElement | null>(null);
  const resizeStateRef = useRef<{
    startClientX: number;
    startRatio: number;
    availableWidth: number;
  } | null>(null);

  const clampDesktopSplitRatio = useCallback((ratio: number) => {
    const containerWidth =
      previewWorkspaceRef.current?.getBoundingClientRect().width ?? 0;
    const availableWidth = Math.max(
      containerWidth - IMPORT_WORKSPACE_RESIZER_WIDTH,
      1,
    );

    if (!containerWidth) {
      return Math.min(
        IMPORT_WORKSPACE_MAX_RATIO,
        Math.max(IMPORT_WORKSPACE_MIN_RATIO, ratio),
      );
    }

    const minRatio = Math.max(
      IMPORT_WORKSPACE_MIN_RATIO,
      IMPORT_WORKSPACE_MIN_LEFT_PANE_PX / availableWidth,
    );
    const maxRatio = Math.min(
      IMPORT_WORKSPACE_MAX_RATIO,
      1 - IMPORT_WORKSPACE_MIN_RIGHT_PANE_PX / availableWidth,
    );

    if (minRatio >= maxRatio) {
      return Math.min(
        IMPORT_WORKSPACE_MAX_RATIO,
        Math.max(IMPORT_WORKSPACE_MIN_RATIO, ratio),
      );
    }

    return Math.min(maxRatio, Math.max(minRatio, ratio));
  }, []);

  useEffect(() => {
    const savedRatio = window.localStorage.getItem(
      IMPORT_WORKSPACE_SPLIT_STORAGE_KEY,
    );

    if (!savedRatio) return;

    const parsed = Number(savedRatio);
    if (!Number.isFinite(parsed)) return;

    setDesktopSplitRatio(clampDesktopSplitRatio(parsed));
  }, [clampDesktopSplitRatio]);

  useEffect(() => {
    window.localStorage.setItem(
      IMPORT_WORKSPACE_SPLIT_STORAGE_KEY,
      desktopSplitRatio.toFixed(4),
    );
  }, [desktopSplitRatio]);

  useEffect(() => {
    if (!isDesktopSplitDragging) return;

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = resizeStateRef.current;
      if (!resizeState) return;

      const deltaX = event.clientX - resizeState.startClientX;
      const nextRatio =
        resizeState.startRatio + deltaX / resizeState.availableWidth;
      setDesktopSplitRatio(clampDesktopSplitRatio(nextRatio));
    };

    const stopDragging = () => {
      resizeStateRef.current = null;
      setIsDesktopSplitDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [clampDesktopSplitRatio, isDesktopSplitDragging]);

  const onedrive = useCloudImport("onedrive", onImportComplete);
  const googledrive = useCloudImport("googledrive", onImportComplete);
  const localImport = useLocalImport(
    onImportComplete,
    initialLocalDraftId,
    onDraftDiscarded,
  );
  const activeHook = activeProvider === "onedrive" ? onedrive : googledrive;
  const {
    data: localDraftsData,
    isPending: localDraftsLoading,
    error: localDraftsQueryError,
    refetch: refetchLocalDrafts,
  } = useQuery({
    queryKey: ["local-import-drafts", "modal"],
    queryFn: async () => {
      const res = await fetch("/api/v1/integrations/local/drafts?limit=20");
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || "가져오기 작업 목록을 불러오지 못했습니다.");
      }
      return res.json() as Promise<{ drafts: LocalImportDraftListItem[] }>;
    },
  });
  const localDrafts = localDraftsData ? localDraftsData.drafts : [];
  const localDraftsError =
    localDraftsQueryError instanceof Error
      ? localDraftsQueryError.message
      : localDraftsQueryError
        ? "가져오기 작업 목록을 불러오지 못했습니다."
        : null;

  useEffect(() => {
    activeHook.checkStatus();
  }, [activeProvider]);

  useEffect(() => {
    if (
      activeHook.connected &&
      activeHook.files.length === 0 &&
      !activeHook.filesLoading
    ) {
      activeHook.loadFiles();
    }
  }, [activeHook.connected]);

  useEffect(() => {
    if (activeHook.importResult) {
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [activeHook.importResult, onClose]);

  useEffect(() => {
    if (localImport.importResult) {
      void refetchLocalDrafts();
      const timer = setTimeout(onClose, 2000);
      return () => clearTimeout(timer);
    }
  }, [localImport.importResult, onClose, refetchLocalDrafts]);

  useEffect(() => {
    if (!localImport.currentDraftId) return;
    void refetchLocalDrafts();
  }, [localImport.currentDraftId, refetchLocalDrafts]);

  const openLocalDraft = useCallback(
    async (draftId: string) => {
      await localImport.restoreDraftById(draftId);
      void refetchLocalDrafts();
    },
    [localImport, refetchLocalDrafts],
  );

  const discardDraftFromList = useCallback(
    async (draftId: string) => {
      if (localImport.currentDraftId === draftId) {
        await localImport.discardDraft?.();
      } else {
        await fetch(`/api/v1/integrations/local/drafts/${draftId}`, {
          method: "DELETE",
        }).catch(() => {
          // 목록 새로고침으로 상태를 다시 맞춘다.
        });
      }

      onDraftDiscarded?.();
      void refetchLocalDrafts();
    },
    [localImport, onDraftDiscarded, refetchLocalDrafts],
  );

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

  const isLocalMode = localImport.selectedFile !== null;
  const hasSelectedFile = activeHook.selectedFile !== null;
  const localBottomPanelHeight = getExpandedBottomPanelHeight(
    Boolean(localImport.editablePreview),
  );
  const cloudBottomPanelHeight = getExpandedBottomPanelHeight(
    Boolean(activeHook.editablePreview),
  );
  const expandedPreviewShellClassName = expanded
    ? "flex-col lg:grid"
    : "flex-col";
  const expandedPreviewShellStyle = expanded
    ? {
        gridTemplateColumns: `minmax(${IMPORT_WORKSPACE_MIN_LEFT_PANE_PX}px, ${desktopSplitRatio}fr) ${IMPORT_WORKSPACE_RESIZER_WIDTH}px minmax(${IMPORT_WORKSPACE_MIN_RIGHT_PANE_PX}px, ${Math.max(0.05, 1 - desktopSplitRatio)}fr)`,
      }
    : undefined;

  const startDesktopSplitResize = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!expanded || !previewWorkspaceRef.current) return;

    const workspaceWidth =
      previewWorkspaceRef.current.getBoundingClientRect().width;
    resizeStateRef.current = {
      startClientX: event.clientX,
      startRatio: desktopSplitRatio,
      availableWidth: Math.max(
        workspaceWidth - IMPORT_WORKSPACE_RESIZER_WIDTH,
        1,
      ),
    };
    setIsDesktopSplitDragging(true);
  };

  const nudgeDesktopSplit = (delta: number) => {
    setDesktopSplitRatio((currentRatio) =>
      clampDesktopSplitRatio(currentRatio + delta),
    );
  };

  const resetDesktopSplit = () => {
    setDesktopSplitRatio(
      clampDesktopSplitRatio(IMPORT_WORKSPACE_DEFAULT_RATIO),
    );
  };

  return (
    <div
      className={`relative flex min-h-0 min-w-0 flex-col bg-background ${expanded ? "h-full w-full flex-1 overflow-hidden" : "h-full overflow-hidden"}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* fullscreen shell owns the available area; child panels own scrolling */}
      {/* 드래그 오버레이 */}
      {isDragging && (
        <div className="absolute inset-0 bg-[rgba(var(--accent-rgb,99,102,241),0.08)] border-2 border-dashed border-accent rounded-xl flex flex-col items-center justify-center gap-2 z-50 text-accent pointer-events-none">
          <Upload size={36} />
          <p className="text-base font-semibold text-accent m-0">
            파일을 놓으세요
          </p>
          <p className="text-xs text-text-dim m-0">
            .xlsx, .xls, .csv, .txt, .pdf, 이미지 파일 지원
          </p>
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="flex items-center gap-1 px-2 py-1 rounded-[5px] border border-border bg-transparent text-text-secondary text-xs font-medium cursor-pointer whitespace-nowrap flex-shrink-0 transition-[background,color] duration-[120ms] hover:bg-[var(--surface3)] hover:text-text"
              onClick={onClose}
            >
              <ArrowLeft size={13} />
              뒤로가기
            </button>
            <h3 className="text-[15px] font-semibold text-text">
              파일 가져오기
            </h3>
          </div>
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

      {!isLocalMode && !hasSelectedFile && (
        <div className="border-b border-border bg-surface-2/40 px-5 py-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="m-0 text-[12px] font-semibold text-text">
                저장된 가져오기 작업
              </p>
              <p className="m-0 mt-1 text-[11px] leading-relaxed text-text-dim">
                작업이 여러 개여도 여기서 원하는 초안을 골라 이어서 볼 수
                있습니다.
              </p>
            </div>
            <button
              type="button"
              className="shrink-0 rounded-[6px] border border-border bg-transparent px-2.5 py-1 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text"
              onClick={() => {
                void refetchLocalDrafts();
              }}
            >
              새로고침
            </button>
          </div>

          {localDraftsLoading ? (
            <div className="rounded-lg border border-border bg-surface px-3 py-3 text-[12px] text-text-dim">
              가져오기 작업을 불러오는 중...
            </div>
          ) : localDraftsError ? (
            <div className="rounded-lg border border-red/20 bg-red/10 px-3 py-3 text-[12px] text-red">
              {localDraftsError}
            </div>
          ) : localDrafts.length > 0 ? (
            <div className="grid gap-2">
              {localDrafts.map((draft) => (
                <div
                  key={draft.id}
                  className="rounded-lg border border-border bg-surface px-3 py-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 rounded-lg bg-accent-dim px-2 py-2 text-accent shrink-0">
                      <FileClock size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 items-center justify-between gap-2">
                        <p className="m-0 min-w-0 flex-1 truncate text-[13px] font-semibold text-text">
                          {draft.selectedFile.name}
                        </p>
                        <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
                          {getDraftStatusLabel(draft.status)}
                        </span>
                      </div>
                      <p className="m-0 mt-1 text-[11px] leading-relaxed text-text-dim line-clamp-2">
                        {getDraftRowSummary(draft)}
                      </p>
                      <p className="m-0 mt-2 text-[11px] text-text-dim">
                        최근 저장 {formatUpdatedAt(draft.updatedAt)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-[6px] bg-accent px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                          onClick={() => {
                            void openLocalDraft(draft.id);
                          }}
                        >
                          <RotateCcw size={12} />
                          이어서 보기
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 rounded-[6px] border border-border bg-transparent px-3 py-1.5 text-[12px] font-medium text-text-secondary transition-colors hover:bg-surface-3 hover:text-text"
                          onClick={() => {
                            void discardDraftFromList(draft.id);
                          }}
                        >
                          <Trash2 size={12} />
                          삭제
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface px-3 py-3 text-[12px] text-text-dim">
              아직 저장된 가져오기 작업이 없습니다. 새 파일을 선택하거나
              클라우드에서 가져오기를 시작해 보세요.
            </div>
          )}
        </div>
      )}

      {/* 로컬 프리뷰 모드 */}
      {isLocalMode && localImport.fileProxyUrl ? (
        <div
          ref={expanded ? previewWorkspaceRef : undefined}
          className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${expandedPreviewShellClassName}`}
          style={expandedPreviewShellStyle}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-b border-border bg-surface lg:border-b-0 lg:border-r-0">
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
              <button
                type="button"
                className="ml-auto flex items-center justify-center w-7 h-7 rounded-[6px] border-0 bg-transparent text-text-dim cursor-pointer transition-[background] duration-[120ms] hover:bg-[var(--surface3)] hover:text-text"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden p-0">
              <FilePreview
                uri={localImport.fileProxyUrl}
                mimeType={localImport.selectedFile?.mimeType ?? ""}
                fileName={localImport.selectedFile?.name ?? ""}
              />
            </div>
          </div>
          {expanded && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="가져오기 레이아웃 크기 조절"
              tabIndex={0}
              className={`hidden lg:flex lg:min-h-0 lg:items-stretch lg:justify-center cursor-col-resize transition-colors duration-150 ${isDesktopSplitDragging ? "bg-accent-border" : "bg-border hover:bg-accent-border"}`}
              onPointerDown={startDesktopSplitResize}
              onDoubleClick={resetDesktopSplit}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  nudgeDesktopSplit(-0.02);
                }
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  nudgeDesktopSplit(0.02);
                }
                if (event.key === "Home") {
                  event.preventDefault();
                  setDesktopSplitRatio(
                    clampDesktopSplitRatio(IMPORT_WORKSPACE_MIN_RATIO),
                  );
                }
                if (event.key === "End") {
                  event.preventDefault();
                  setDesktopSplitRatio(
                    clampDesktopSplitRatio(IMPORT_WORKSPACE_MAX_RATIO),
                  );
                }
              }}
            >
              <div className="my-3 w-px rounded-full bg-[rgba(255,255,255,0.18)]" />
            </div>
          )}
          <div
            className={`flex min-h-0 flex-col overflow-hidden bg-surface ${expanded ? "shrink-0 max-h-[min(52vh,520px)] px-6 py-4 max-md:px-4 lg:h-full lg:max-h-none lg:min-h-0" : "flex-[2] px-5 py-4"}`}
            style={!expanded ? { height: localBottomPanelHeight } : undefined}
          >
            <ImportRightPanel hook={localImport} onClose={onClose} />
          </div>
        </div>
      ) : hasSelectedFile && activeHook.fileProxyUrl ? (
        /* 클라우드 프리뷰 모드 */
        <div
          ref={expanded ? previewWorkspaceRef : undefined}
          className={`flex min-h-0 min-w-0 flex-1 overflow-hidden ${expandedPreviewShellClassName}`}
          style={expandedPreviewShellStyle}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-b border-border bg-surface lg:border-b-0 lg:border-r-0">
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
              <button
                type="button"
                className="ml-auto flex items-center justify-center w-7 h-7 rounded-[6px] border-0 bg-transparent text-text-dim cursor-pointer transition-[background] duration-[120ms] hover:bg-[var(--surface3)] hover:text-text"
                onClick={onClose}
              >
                <X size={16} />
              </button>
            </div>
            <div className="min-h-0 min-w-0 flex-1 overflow-hidden p-0">
              <FilePreview
                uri={activeHook.fileProxyUrl}
                mimeType={activeHook.selectedFile?.mimeType ?? ""}
                fileName={activeHook.selectedFile?.name ?? ""}
              />
            </div>
          </div>
          {expanded && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="가져오기 레이아웃 크기 조절"
              tabIndex={0}
              className={`hidden lg:flex lg:min-h-0 lg:items-stretch lg:justify-center cursor-col-resize transition-colors duration-150 ${isDesktopSplitDragging ? "bg-accent-border" : "bg-border hover:bg-accent-border"}`}
              onPointerDown={startDesktopSplitResize}
              onDoubleClick={resetDesktopSplit}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  nudgeDesktopSplit(-0.02);
                }
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  nudgeDesktopSplit(0.02);
                }
                if (event.key === "Home") {
                  event.preventDefault();
                  setDesktopSplitRatio(
                    clampDesktopSplitRatio(IMPORT_WORKSPACE_MIN_RATIO),
                  );
                }
                if (event.key === "End") {
                  event.preventDefault();
                  setDesktopSplitRatio(
                    clampDesktopSplitRatio(IMPORT_WORKSPACE_MAX_RATIO),
                  );
                }
              }}
            >
              <div className="my-3 w-px rounded-full bg-[rgba(255,255,255,0.18)]" />
            </div>
          )}
          <div
            className={`flex min-h-0 flex-col overflow-hidden bg-surface ${expanded ? "shrink-0 max-h-[min(52vh,520px)] px-6 py-4 max-md:px-4 lg:h-full lg:max-h-none lg:min-h-0" : "flex-[2] px-5 py-4"}`}
            style={!expanded ? { height: cloudBottomPanelHeight } : undefined}
          >
            <ImportRightPanel hook={activeHook} onClose={onClose} />
          </div>
        </div>
      ) : (
        /* 파일 브라우저 모드 */
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
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
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-5 py-10 text-center">
              <CloudCog
                size={32}
                style={{ color: "var(--text-dim)", marginBottom: 8 }}
              />
              <p
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text)",
                  marginBottom: 4,
                }}
              >
                {activeProvider === "onedrive" ? "OneDrive" : "Google Drive"}{" "}
                연결이 필요합니다
              </p>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-dim)",
                  marginBottom: 16,
                }}
              >
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
            <div className="flex min-h-0 flex-1 items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
              <Loader2 size={20} className="animate-spin" />
              <span>연결 상태 확인 중...</span>
            </div>
          )}

          {/* 연결 완료: 파일 브라우저 */}
          {activeHook.connected && !activeHook.connecting && (
            <>
              {/* 브레드크럼 */}
              <div
                className="scrollbar-subtle flex items-center px-5 py-2.5 text-[13px] text-text-dim border-b border-border flex-shrink-0 overflow-x-auto"
                style={{ justifyContent: "space-between" }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    overflow: "hidden",
                  }}
                >
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
                    <span
                      key={i}
                      style={{ display: "flex", alignItems: "center" }}
                    >
                      {i > 0 && (
                        <ChevronRight
                          size={12}
                          className="text-text-dim flex-shrink-0"
                        />
                      )}
                      <button
                        className="bg-transparent border-0 px-1 py-0.5 rounded text-[13px] text-text-secondary cursor-pointer whitespace-nowrap hover:bg-[var(--surface3)] hover:text-text"
                        onClick={() => handleBreadcrumbClick(i)}
                        type="button"
                        style={{
                          fontWeight:
                            i === activeHook.folderStack.length - 1 ? 600 : 400,
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
                      background:
                        activeHook.viewMode === "grid"
                          ? "var(--accent)"
                          : "transparent",
                      color:
                        activeHook.viewMode === "grid"
                          ? "#fff"
                          : "var(--text-dim)",
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
                      background:
                        activeHook.viewMode === "list"
                          ? "var(--accent)"
                          : "transparent",
                      color:
                        activeHook.viewMode === "list"
                          ? "#fff"
                          : "var(--text-dim)",
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
              <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden bg-surface">
                <div className="scrollbar-subtle min-h-0 min-w-0 flex-1 overflow-auto px-5 py-4">
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
        </div>
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
    case "folder":
      return "text-accent";
    case "spreadsheet":
      return "text-green";
    case "csv":
      return "text-green";
    case "txt":
      return "text-text-secondary";
    case "pdf":
      return "text-red";
    case "image":
      return "text-cyan";
    default:
      return "text-inherit";
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

function FileGrid({
  files,
  loading,
  viewMode,
  onSelectFile,
  onNavigateFolder,
}: FileGridProps) {
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
              style={{
                gridTemplateColumns:
                  "20px minmax(100px, 40%) max-content max-content",
              }}
              onClick={() => {
                if (file.isFolder) onNavigateFolder(file.id, file.name);
                else if (selectable(file)) onSelectFile(file);
              }}
              disabled={!file.isFolder && !selectable(file)}
              type="button"
            >
              <span
                className={`flex items-center flex-shrink-0 ${getIconColor(file.fileKind)}`}
              >
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
              <span className="mt-0.5 text-[11px] font-medium text-green">
                클릭하여 선택
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
