import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/server/services/service-error";

const mockRequireAuthenticatedUser = vi.fn();
const mockGetImportDraftSnapshot = vi.fn();
const mockSaveImportDraftPreview = vi.fn();
const mockDeleteImportDraft = vi.fn();

vi.mock("@/app/api/v1/counseling-records/_shared", () => ({
  jsonError: (message: string, status: number) =>
    Response.json({ message }, { status }),
  requireAuthenticatedUser: (...args: unknown[]) =>
    mockRequireAuthenticatedUser(...args),
}));
vi.mock("@/server/services/import-drafts-service", () => ({
  getImportDraftSnapshot: (...args: unknown[]) =>
    mockGetImportDraftSnapshot(...args),
  saveImportDraftPreview: (...args: unknown[]) =>
    mockSaveImportDraftPreview(...args),
  deleteImportDraft: (...args: unknown[]) => mockDeleteImportDraft(...args),
}));

import { DELETE, GET, PATCH } from "../route";

describe("local draft detail route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET은 draft snapshot을 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockGetImportDraftSnapshot.mockResolvedValue({
      id: "draft-1",
      status: "uploaded",
    });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/v1/integrations/local/drafts/draft-1",
      ),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "draft-1",
      status: "uploaded",
    });
  });

  it("PATCH는 깨진 JSON이면 400을 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });

    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/v1/integrations/local/drafts/draft-1",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: "{bad json",
        },
      ),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("PATCH는 invalid body면 400을 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });

    const response = await PATCH(
      new NextRequest(
        "http://localhost/api/v1/integrations/local/drafts/draft-1",
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ previewRows: "invalid" }),
        },
      ),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(400);
  });

  it("DELETE는 ServiceError를 그대로 반환한다", async () => {
    mockRequireAuthenticatedUser.mockResolvedValue({
      currentUser: { id: "user-1" },
      response: null,
    });
    mockDeleteImportDraft.mockRejectedValue(
      new ServiceError(404, "초안을 찾지 못했습니다."),
    );

    const response = await DELETE(
      new NextRequest(
        "http://localhost/api/v1/integrations/local/drafts/draft-1",
        { method: "DELETE" },
      ),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(404);
  });
});
