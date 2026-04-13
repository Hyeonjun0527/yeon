import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";

const mockRequireAuthenticatedUser = vi.fn();
const mockCreateLocalImportDraft = vi.fn();
const mockGetImportDraftBuffer = vi.fn();
const mockMarkImportDraftAnalyzing = vi.fn();
const mockSaveImportDraftError = vi.fn();
const mockSaveImportDraftPreview = vi.fn();
const mockSaveImportDraftProcessingState = vi.fn();
const mockAnalyzeBuffer = vi.fn();
const mockGetOverviewTab = vi.fn();
const mockGetFieldsForTab = vi.fn();

vi.mock("@/app/api/v1/counseling-records/_shared", () => ({
  jsonError: (message: string, status: number) =>
    Response.json({ message }, { status }),
  requireAuthenticatedUser: (...args: unknown[]) =>
    mockRequireAuthenticatedUser(...args),
}));
vi.mock("@/server/services/import-drafts-service", () => ({
  createLocalImportDraft: (...args: unknown[]) =>
    mockCreateLocalImportDraft(...args),
  getImportDraftBuffer: (...args: unknown[]) =>
    mockGetImportDraftBuffer(...args),
  markImportDraftAnalyzing: (...args: unknown[]) =>
    mockMarkImportDraftAnalyzing(...args),
  saveImportDraftError: (...args: unknown[]) =>
    mockSaveImportDraftError(...args),
  saveImportDraftPreview: (...args: unknown[]) =>
    mockSaveImportDraftPreview(...args),
  saveImportDraftProcessingState: (...args: unknown[]) =>
    mockSaveImportDraftProcessingState(...args),
}));
vi.mock("@/server/services/file-analysis-service", () => ({
  analyzeBuffer: (...args: unknown[]) => mockAnalyzeBuffer(...args),
}));
vi.mock("@/server/services/import-stream", () => ({
  createImportSSEStream: vi.fn(),
}));
vi.mock("@/server/services/member-tabs-service", () => ({
  getOverviewTab: (...args: unknown[]) => mockGetOverviewTab(...args),
}));
vi.mock("@/server/services/member-fields-service", () => ({
  getFieldsForTab: (...args: unknown[]) => mockGetFieldsForTab(...args),
}));

import { POST } from "../analyze/route";

describe("local analyze route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("file도 draftId도 없으면 400을 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });

    const request = new NextRequest(
      "http://localhost/api/v1/integrations/local/analyze",
      {
        method: "POST",
        body: new FormData(),
      },
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("draftId로 복구하면 buffer를 분석하고 preview를 저장한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockGetImportDraftBuffer.mockResolvedValue({
      row: {
        id: "draft-1",
        sourceFileName: "students.csv",
        sourceMimeType: "text/csv",
        sourceFileKind: "csv",
      },
      buffer: Buffer.from("name,email\n홍길동,hong@yeon.world"),
    });
    mockAnalyzeBuffer.mockResolvedValue({
      preview: {
        cohorts: [{ name: "1기", students: [{ name: "홍길동" }] }],
      },
      assistantMessage: null,
    });

    const form = new FormData();
    form.set("draftId", "draft-1");
    const response = await POST(
      new NextRequest("http://localhost/api/v1/integrations/local/analyze", {
        method: "POST",
        body: form,
      }),
    );

    expect(mockMarkImportDraftAnalyzing).toHaveBeenCalled();
    expect(mockSaveImportDraftPreview).toHaveBeenCalled();
    expect(response.status).toBe(200);
  });

  it("ServiceError가 나면 draft error 상태를 저장하고 그대로 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockCreateLocalImportDraft.mockResolvedValue({ id: "draft-1" });
    mockAnalyzeBuffer.mockRejectedValue(
      new ServiceError(400, "지원하지 않는 파일 형식입니다."),
    );

    const file = new File(["bad"], "archive.zip", { type: "application/zip" });
    const form = new FormData();
    form.set("file", file);

    const response = await POST(
      new NextRequest("http://localhost/api/v1/integrations/local/analyze", {
        method: "POST",
        body: form,
      }),
    );

    expect(mockSaveImportDraftError).toHaveBeenCalledWith({
      userId: "user-1",
      draftId: "draft-1",
      message: "지원하지 않는 파일 형식입니다.",
    });
    expect(response.status).toBe(400);
  });
});
