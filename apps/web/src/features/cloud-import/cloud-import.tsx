"use client";

/**
 * CloudImport - 레거시 사이드바 위젯.
 * 인라인 브라우저(CloudImportInline)로 교체되어 더 이상 layout에서 사용하지 않지만,
 * 다른 곳에서 단독으로 쓸 가능성을 위해 유지한다.
 */

import { useEffect } from "react";
import { CloudCog, Loader2, Upload } from "lucide-react";
import type { CloudProvider } from "./types";
import { useCloudImport } from "./hooks/use-cloud-import";

interface ProviderImportProps {
  provider: CloudProvider;
  onImportComplete?: () => void;
}

function ProviderImport({ provider, onImportComplete }: ProviderImportProps) {
  const hook = useCloudImport(provider, onImportComplete);
  const label = provider === "onedrive" ? "OneDrive" : "Google Drive";

  useEffect(() => {
    hook.checkStatus();
  }, [hook.checkStatus]);

  if (hook.connecting) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-xs text-text-dim">확인 중...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {hook.connected ? (
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-[13px] font-medium cursor-pointer border border-border bg-surface text-text-secondary transition-[border-color,color,background] duration-150 w-full justify-center hover:border-accent-border hover:text-accent hover:bg-accent-dim disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={() => {
            hook.loadFiles();
          }}
          type="button"
          disabled={hook.analyzing}
        >
          {hook.analyzing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Upload size={16} />
          )}
          {hook.analyzing ? "분석 중..." : `${label}에서 가져오기`}
        </button>
      ) : (
        <button
          className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] text-[13px] font-medium cursor-pointer border border-border bg-surface text-text-secondary transition-[border-color,color,background] duration-150 w-full justify-center hover:border-accent-border hover:text-accent hover:bg-accent-dim disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={hook.connectDrive}
          type="button"
        >
          <CloudCog size={16} />
          {label} 연결
        </button>
      )}
    </div>
  );
}

interface CloudImportProps {
  onImportComplete?: () => void;
}

export function CloudImport({ onImportComplete }: CloudImportProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <ProviderImport provider="onedrive" onImportComplete={onImportComplete} />
      <ProviderImport
        provider="googledrive"
        onImportComplete={onImportComplete}
      />
    </div>
  );
}
