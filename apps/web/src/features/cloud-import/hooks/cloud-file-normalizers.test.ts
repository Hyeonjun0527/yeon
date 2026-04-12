import { describe, expect, it } from "vitest";

import { normalizeCloudDriveFile } from "./cloud-file-normalizers";

describe("normalizeCloudDriveFile", () => {
  it("OneDrive는 mimeType이 없으면 폴더로 판정한다", () => {
    const result = normalizeCloudDriveFile("onedrive", {
      id: "folder-1",
      name: "문서",
      size: 0,
      lastModifiedAt: new Date().toISOString(),
    });

    expect(result.isFolder).toBe(true);
    expect(result.fileKind).toBe("folder");
  });

  it("Google Drive는 전용 folder mimeType만 폴더로 판정한다", () => {
    const result = normalizeCloudDriveFile("googledrive", {
      id: "folder-2",
      name: "드라이브 폴더",
      size: 0,
      lastModifiedAt: new Date().toISOString(),
      mimeType: "application/vnd.google-apps.folder",
    });

    expect(result.isFolder).toBe(true);
    expect(result.fileKind).toBe("folder");
  });
});
