"use client";

import { useEffect, useState, useCallback } from "react";
import {
  X,
  CloudCog,
  Loader2,
  FileSpreadsheet,
  FileText,
  Folder,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import {
  CLOUD_PROVIDER_ORDER,
  DEFAULT_CLOUD_PROVIDER,
  getCloudProviderLabel,
} from "@/features/cloud-import/cloud-provider-config";
import { useCloudImport } from "@/features/cloud-import/hooks/use-cloud-import";
import type { CloudProvider, DriveFile } from "@/features/cloud-import/types";
import { resolveApiHrefForCurrentPath } from "@/lib/app-route-paths";

interface CloudProfilePickerProps {
  onFilePicked: (file: File) => void;
  onClose: () => void;
}

const SELECTABLE_EXTS = [".csv", ".txt", ".tsv"];

function isSelectable(file: DriveFile): boolean {
  if (file.isFolder) return false;
  const lower = file.name.toLowerCase();
  return SELECTABLE_EXTS.some((ext) => lower.endsWith(ext));
}

function FileIcon({ file }: { file: DriveFile }) {
  if (file.isFolder) return <Folder size={16} className="text-accent" />;
  if (file.fileKind === "spreadsheet" || file.fileKind === "csv")
    return <FileSpreadsheet size={16} className="text-green" />;
  return <FileText size={16} className="text-text-secondary" />;
}

function formatSize(bytes: number): string {
  if (!bytes) return "─";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileBrowserProps {
  provider: CloudProvider;
  onFilePicked: (file: File) => void;
}

function FileBrowser({ provider, onFilePicked }: FileBrowserProps) {
  const hook = useCloudImport(provider);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    hook.checkStatus();
  }, [provider]);

  useEffect(() => {
    if (hook.connected && hook.files.length === 0 && !hook.filesLoading) {
      hook.loadFiles();
    }
  }, [hook.connected]);

  const handleSelect = useCallback(
    async (driveFile: DriveFile) => {
      if (!isSelectable(driveFile)) return;
      setFetching(true);
      setFetchError(null);
      try {
        const proxyUrl = `${
          provider === "onedrive"
            ? resolveApiHrefForCurrentPath("/api/v1/integrations/onedrive")
            : resolveApiHrefForCurrentPath("/api/v1/integrations/googledrive")
        }/file/${driveFile.id}${
          driveFile.mimeType
            ? `?mimeType=${encodeURIComponent(driveFile.mimeType)}`
            : ""
        }`;

        const res = await fetch(proxyUrl);
        if (!res.ok) throw new Error("파일을 가져오지 못했습니다.");
        const blob = await res.blob();
        const file = new File([blob], driveFile.name, {
          type: driveFile.mimeType ?? "text/plain",
        });
        onFilePicked(file);
      } catch (err) {
        setFetchError(
          err instanceof Error ? err.message : "파일을 가져오지 못했습니다.",
        );
      } finally {
        setFetching(false);
      }
    },
    [provider, onFilePicked],
  );

  if (hook.connecting) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
        <Loader2 size={18} className="animate-spin" />
        <span>연결 상태 확인 중...</span>
      </div>
    );
  }

  if (!hook.connected) {
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <CloudCog size={28} className="text-text-dim" />
        <p className="text-[14px] font-semibold text-text">
          {getCloudProviderLabel(provider)} 연결이 필요합니다
        </p>
        <p className="text-[12px] text-text-dim max-w-[260px]">
          클라우드 드라이브를 연결하면 파일을 바로 불러올 수 있습니다.
        </p>
        <button
          className="px-4 py-2 bg-accent text-white rounded-md text-[13px] font-medium hover:opacity-90 transition-opacity border-none cursor-pointer font-[inherit]"
          onClick={hook.connectDrive}
        >
          연결하기
        </button>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
        <Loader2 size={18} className="animate-spin" />
        <span>파일을 불러오는 중...</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="py-8 text-center">
        <p className="text-[13px] text-red mb-3">{fetchError}</p>
        <button
          className="px-3 py-1.5 bg-surface-3 border border-border rounded text-[12px] text-text-secondary hover:border-border-light"
          onClick={() => setFetchError(null)}
        >
          다시 시도
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* 브레드크럼 */}
      <div className="scrollbar-subtle flex items-center gap-1 px-4 py-2 border-b border-border text-[12px] text-text-dim overflow-x-auto flex-shrink-0">
        {hook.folderStack.length > 1 && (
          <button
            className="flex items-center gap-1 hover:text-text transition-colors bg-transparent border-none cursor-pointer p-0"
            onClick={hook.navigateBack}
          >
            <ArrowLeft size={12} />
          </button>
        )}
        {hook.folderStack.map((entry, i) => (
          <span key={i} className="flex items-center">
            {i > 0 && <ChevronRight size={10} className="mx-0.5" />}
            <button
              className={`bg-transparent border-none cursor-pointer p-0 hover:text-text transition-colors ${
                i === hook.folderStack.length - 1
                  ? "font-semibold text-text"
                  : ""
              }`}
              onClick={() => hook.navigateToBreadcrumbIndex(i)}
            >
              {entry.name}
            </button>
          </span>
        ))}
      </div>

      {/* 파일 목록 */}
      <div className="scrollbar-subtle flex-1 overflow-y-auto">
        {hook.filesLoading ? (
          <div className="flex items-center justify-center gap-2 py-10 text-text-dim text-[13px]">
            <Loader2 size={16} className="animate-spin" />
            <span>파일 목록을 불러오는 중...</span>
          </div>
        ) : hook.files.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-text-dim">
            파일이 없습니다.
          </div>
        ) : (
          <ul className="p-0 m-0 list-none">
            {hook.files.map((file) => {
              const selectable = isSelectable(file);
              const clickable = file.isFolder || selectable;
              return (
                <li key={file.id}>
                  <button
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left border-0 border-b border-border bg-transparent transition-colors font-[inherit] ${
                      !clickable
                        ? "opacity-40 cursor-not-allowed text-text-dim"
                        : "cursor-pointer hover:bg-surface-3 text-text"
                    }`}
                    onClick={() => {
                      if (file.isFolder)
                        hook.navigateToFolder(file.id, file.name);
                      else if (selectable) void handleSelect(file);
                    }}
                    disabled={!clickable}
                    title={
                      !clickable
                        ? "CSV, TXT 파일만 지원합니다"
                        : selectable
                          ? "클릭하여 선택"
                          : "폴더 열기"
                    }
                  >
                    <FileIcon file={file} />
                    <span className="flex-1 truncate">{file.name}</span>
                    <span className="text-[11px] text-text-dim flex-shrink-0">
                      {file.isFolder ? "폴더" : formatSize(file.size)}
                    </span>
                    {selectable && (
                      <span className="text-[10px] text-accent flex-shrink-0 font-medium">
                        선택
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {hook.error && (
        <div className="px-4 py-2 text-[12px] text-red border-t border-border">
          {hook.error}
        </div>
      )}
    </div>
  );
}

export function CloudProfilePicker({
  onFilePicked,
  onClose,
}: CloudProfilePickerProps) {
  const [activeProvider, setActiveProvider] = useState<CloudProvider>(
    DEFAULT_CLOUD_PROVIDER,
  );

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-surface border border-border rounded-xl flex flex-col overflow-hidden shadow-2xl"
        style={{ width: 520, height: 480 }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <div>
            <h3 className="text-[14px] font-semibold text-text">
              클라우드에서 파일 선택
            </h3>
            <p className="text-[11px] text-text-dim mt-0.5">
              CSV 또는 TXT 파일을 선택하면 AI가 프로필을 추출합니다
            </p>
          </div>
          <button
            className="flex items-center justify-center w-7 h-7 rounded-md bg-transparent border-none text-text-dim hover:text-text hover:bg-surface-3 cursor-pointer transition-colors"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Provider 탭 */}
        <div className="flex border-b border-border flex-shrink-0">
          {CLOUD_PROVIDER_ORDER.map((provider) => (
            <button
              key={provider}
              className={`flex-1 py-2.5 text-[13px] font-medium bg-transparent border-0 border-b-2 cursor-pointer transition-colors font-[inherit] ${
                activeProvider === provider
                  ? "text-accent border-b-accent"
                  : "text-text-dim border-b-transparent hover:text-text"
              }`}
              onClick={() => setActiveProvider(provider)}
            >
              {getCloudProviderLabel(provider)}
            </button>
          ))}
        </div>

        {/* 파일 브라우저 */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <FileBrowser
            key={activeProvider}
            provider={activeProvider}
            onFilePicked={(file) => {
              onFilePicked(file);
              onClose();
            }}
          />
        </div>
      </div>
    </div>
  );
}
