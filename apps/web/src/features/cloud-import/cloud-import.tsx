"use client";

import { useEffect } from "react";
import { CloudCog, Loader2, Upload } from "lucide-react";
import type { CloudProvider } from "./types";
import { useCloudImport } from "./hooks/use-cloud-import";
import { FileBrowserModal } from "./components/file-browser-modal";
import { ImportPreviewModal } from "./components/import-preview-modal";
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
            hook.setShowFileBrowser(true);
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

      {hook.showFileBrowser && (
        <FileBrowserModal
          provider={provider}
          files={hook.files}
          loading={hook.filesLoading}
          analyzing={hook.analyzing}
          error={hook.error}
          onSelectFile={hook.selectFile}
          onLoadFolder={(folderId) => hook.loadFiles(folderId)}
          onClose={() => hook.setShowFileBrowser(false)}
        />
      )}

      {hook.showPreview && hook.editablePreview && (
        <ImportPreviewModal
          preview={hook.editablePreview}
          importing={hook.importing}
          importResult={hook.importResult}
          error={hook.error}
          onUpdate={hook.updatePreview}
          onConfirm={hook.confirmImport}
          onClose={() => {
            hook.setShowPreview(false);
            if (hook.importResult) hook.resetState();
          }}
        />
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
