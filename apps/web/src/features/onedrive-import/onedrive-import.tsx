"use client";

import { useEffect } from "react";
import { CloudCog, Loader2, Upload } from "lucide-react";
import { useOnedrive } from "./hooks/use-onedrive";
import { FileBrowserModal } from "./components/file-browser-modal";
import { ImportPreviewModal } from "./components/import-preview-modal";
import styles from "./onedrive-import.module.css";

interface OneDriveImportProps {
  onImportComplete?: () => void;
}

export function OneDriveImport({ onImportComplete }: OneDriveImportProps) {
  const od = useOnedrive(onImportComplete);

  useEffect(() => {
    od.checkStatus();
  }, [od.checkStatus]);

  const handleOpenBrowser = () => {
    od.setShowFileBrowser(true);
    od.loadFiles();
  };

  if (od.connecting) {
    return (
      <div className={styles.wrapper}>
        <Loader2 size={16} className={styles.spinner} />
        <span className={styles.statusText}>확인 중...</span>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      {od.connected ? (
        <button
          className={styles.actionBtn}
          onClick={handleOpenBrowser}
          type="button"
          disabled={od.analyzing}
        >
          {od.analyzing ? (
            <Loader2 size={16} className={styles.spinner} />
          ) : (
            <Upload size={16} />
          )}
          {od.analyzing ? "분석 중..." : "OneDrive에서 가져오기"}
        </button>
      ) : (
        <button
          className={styles.actionBtn}
          onClick={od.connectOneDrive}
          type="button"
        >
          <CloudCog size={16} />
          OneDrive 연결
        </button>
      )}

      {od.showFileBrowser && (
        <FileBrowserModal
          files={od.files}
          loading={od.filesLoading}
          analyzing={od.analyzing}
          error={od.error}
          onSelectFile={od.selectFile}
          onLoadFolder={(folderId) => od.loadFiles(folderId)}
          onClose={() => od.setShowFileBrowser(false)}
        />
      )}

      {od.showPreview && od.editablePreview && (
        <ImportPreviewModal
          preview={od.editablePreview}
          importing={od.importing}
          importResult={od.importResult}
          error={od.error}
          onUpdate={od.updatePreview}
          onConfirm={od.confirmImport}
          onClose={() => {
            od.setShowPreview(false);
            if (od.importResult) od.resetState();
          }}
        />
      )}
    </div>
  );
}
