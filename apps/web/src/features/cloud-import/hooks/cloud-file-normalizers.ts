import { detectFileKind } from "../file-kind";
import type { CloudProvider, DriveFile } from "../types";

type CloudFileSource = {
  id: string;
  name: string;
  size: number;
  lastModifiedAt: string;
  mimeType?: string;
};

function isProviderFolder(provider: CloudProvider, mimeType?: string) {
  if (provider === "googledrive") {
    return mimeType === "application/vnd.google-apps.folder";
  }

  return !mimeType;
}

export function normalizeCloudDriveFile(
  provider: CloudProvider,
  file: CloudFileSource,
): DriveFile {
  const isFolder = isProviderFolder(provider, file.mimeType);
  const kind = isFolder ? "folder" : detectFileKind(file.name, file.mimeType);

  return {
    ...file,
    mimeType: file.mimeType ?? undefined,
    isFolder,
    isSpreadsheet: kind === "spreadsheet",
    isImage: kind === "image",
    fileKind: kind,
  };
}

export function normalizeCloudDriveFiles(
  provider: CloudProvider,
  files: CloudFileSource[],
) {
  return files.map((file) => normalizeCloudDriveFile(provider, file));
}
