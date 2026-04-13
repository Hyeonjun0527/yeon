import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";

const mockCreateCloudImportDraft = vi.fn();
const mockMarkImportDraftAnalyzing = vi.fn();
const mockMarkImportDraftImported = vi.fn();
const mockMarkImportDraftImporting = vi.fn();
const mockSaveImportDraftError = vi.fn();
const mockSaveImportDraftPreview = vi.fn();
const mockSaveImportDraftProcessingState = vi.fn();
const mockGetImportDraftSource = vi.fn();
const mockImportPreviewIntoSpaces = vi.fn();
const mockAnalyzeBuffer = vi.fn();
const mockCreateImportSSEStream = vi.fn();

vi.mock("@/server/services/import-drafts-service", () => ({
  createCloudImportDraft: (...args: unknown[]) =>
    mockCreateCloudImportDraft(...args),
  markImportDraftAnalyzing: (...args: unknown[]) =>
    mockMarkImportDraftAnalyzing(...args),
  markImportDraftImported: (...args: unknown[]) =>
    mockMarkImportDraftImported(...args),
  markImportDraftImporting: (...args: unknown[]) =>
    mockMarkImportDraftImporting(...args),
  saveImportDraftError: (...args: unknown[]) =>
    mockSaveImportDraftError(...args),
  saveImportDraftPreview: (...args: unknown[]) =>
    mockSaveImportDraftPreview(...args),
  saveImportDraftProcessingState: (...args: unknown[]) =>
    mockSaveImportDraftProcessingState(...args),
  getImportDraftSource: (...args: unknown[]) =>
    mockGetImportDraftSource(...args),
}));
vi.mock("@/server/services/import-preview-service", async () => {
  const { z } = await import("zod");

  return {
    importPreviewBodySchema: z.object({ cohorts: z.array(z.unknown()) }),
    importPreviewIntoSpaces: (...args: unknown[]) =>
      mockImportPreviewIntoSpaces(...args),
  };
});
vi.mock("@/server/services/file-analysis-service", () => ({
  analyzeBuffer: (...args: unknown[]) => mockAnalyzeBuffer(...args),
}));
vi.mock("@/server/services/import-stream", () => ({
  createImportSSEStream: (...args: unknown[]) =>
    mockCreateImportSSEStream(...args),
}));
vi.mock("@/features/cloud-import/file-kind", () => ({
  detectFileKind: () => "spreadsheet",
}));
vi.mock("@/app/api/v1/counseling-records/_shared", () => ({
  jsonError: (message: string, status: number) =>
    Response.json({ message }, { status }),
}));

import { handleCloudAnalyzeRoute, handleImportCommitRoute } from "../_shared";

describe("integrations _shared", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("handleImportCommitRoute는 invalid JSON이면 400을 반환한다", async () => {
    const request = new NextRequest(
      "http://localhost/api/v1/integrations/local/import",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{bad json",
      },
    );

    const response = await handleImportCommitRoute({
      request,
      userId: "user-1",
    });

    expect(response.status).toBe(400);
  });

  it("handleImportCommitRoute는 draftId가 있으면 importing/imported를 모두 기록한다", async () => {
    mockImportPreviewIntoSpaces.mockResolvedValue({
      spaces: 1,
      members: 2,
      spaceIds: ["space-1"],
    });
    const request = new NextRequest(
      "http://localhost/api/v1/integrations/local/import",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftId: "550e8400-e29b-41d4-a716-446655440000",
          preview: { cohorts: [] },
        }),
      },
    );

    const response = await handleImportCommitRoute({
      request,
      userId: "user-1",
    });

    expect(mockMarkImportDraftImporting).toHaveBeenCalled();
    expect(mockMarkImportDraftImported).toHaveBeenCalledWith({
      userId: "user-1",
      draftId: "550e8400-e29b-41d4-a716-446655440000",
      result: { spaces: 1, members: 2, spaceIds: ["space-1"] },
    });
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      created: { spaces: 1, members: 2 },
      spaceIds: ["space-1"],
    });
  });

  it("handleCloudAnalyzeRoute는 access token이 없으면 401을 반환한다", async () => {
    const request = new NextRequest(
      "http://localhost/api/v1/integrations/googledrive/analyze",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileId: "file-1",
          fileName: "students.xlsx",
          mimeType: "application/vnd.ms-excel",
        }),
      },
    );

    const response = await handleCloudAnalyzeRoute({
      request,
      userId: "user-1",
      provider: "googledrive",
      providerLabel: "Google Drive",
      getAccessToken: async () => null,
      downloadFile: async () => Buffer.from(""),
      requireMimeType: true,
    });

    expect(response.status).toBe(401);
  });

  it("handleCloudAnalyzeRoute는 provider가 다른 draft 복구를 차단한다", async () => {
    mockGetImportDraftSource.mockResolvedValue({
      id: "draft-1",
      provider: "onedrive",
      selectedFile: {
        id: "file-1",
        name: "students.xlsx",
        mimeType: "application/vnd.ms-excel",
        fileKind: "spreadsheet",
      },
    });
    const request = new NextRequest(
      "http://localhost/api/v1/integrations/googledrive/analyze",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          draftId: "550e8400-e29b-41d4-a716-446655440000",
        }),
      },
    );

    const response = await handleCloudAnalyzeRoute({
      request,
      userId: "user-1",
      provider: "googledrive",
      providerLabel: "Google Drive",
      getAccessToken: async () => "token",
      downloadFile: async () => Buffer.from(""),
      requireMimeType: true,
    });

    expect(response.status).toBe(400);
  });

  it("handleCloudAnalyzeRoute는 파일 필수 필드가 없으면 400을 반환한다", async () => {
    const request = new NextRequest(
      "http://localhost/api/v1/integrations/googledrive/analyze",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileId: "file-1" }),
      },
    );

    const response = await handleCloudAnalyzeRoute({
      request,
      userId: "user-1",
      provider: "googledrive",
      providerLabel: "Google Drive",
      getAccessToken: async () => "token",
      downloadFile: async () => Buffer.from(""),
      requireMimeType: true,
    });

    expect(response.status).toBe(400);
  });

  it("handleCloudAnalyzeRoute는 분석 실패 시 draft error를 저장하고 ServiceError를 반환한다", async () => {
    mockCreateCloudImportDraft.mockResolvedValue({ id: "draft-1" });
    mockAnalyzeBuffer.mockRejectedValue(
      new ServiceError(400, "지원하지 않는 파일 형식입니다."),
    );
    const request = new NextRequest(
      "http://localhost/api/v1/integrations/googledrive/analyze",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileId: "file-1",
          fileName: "students.xlsx",
          mimeType: "application/vnd.ms-excel",
        }),
      },
    );

    const response = await handleCloudAnalyzeRoute({
      request,
      userId: "user-1",
      provider: "googledrive",
      providerLabel: "Google Drive",
      getAccessToken: async () => "token",
      downloadFile: async () => Buffer.from("xlsx"),
      requireMimeType: true,
    });

    expect(mockSaveImportDraftError).toHaveBeenCalledWith({
      userId: "user-1",
      draftId: "draft-1",
      message: "지원하지 않는 파일 형식입니다.",
    });
    expect(response.status).toBe(400);
  });
});
