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
import styles from "./cloud-import.module.css";

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
      <div className={styles.wrapper}>
        <Loader2 size={16} className={styles.spinner} />
        <span className={styles.statusText}>확인 중...</span>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {hook.connected ? (
        <button
          className={styles.actionBtn}
          onClick={() => {
            hook.loadFiles();
          }}
          type="button"
          disabled={hook.analyzing}
        >
          {hook.analyzing ? (
            <Loader2 size={16} className={styles.spinner} />
          ) : (
            <Upload size={16} />
          )}
          {hook.analyzing ? "분석 중..." : `${label}에서 가져오기`}
        </button>
      ) : (
        <button className={styles.actionBtn} onClick={hook.connectDrive} type="button">
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
    <div className={styles.providerList}>
      <ProviderImport provider="onedrive" onImportComplete={onImportComplete} />
      <ProviderImport provider="googledrive" onImportComplete={onImportComplete} />
    </div>
  );
}
