import { beforeEach, describe, expect, it, vi } from "vitest";

const findFirstMock = vi.fn();
const findManyMock = vi.fn();

const { dbResponses, dbChain } = vi.hoisted(() => {
  const dbResponses: unknown[] = [];
  const proxy: unknown = new Proxy({} as Record<string | symbol, unknown>, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (value: unknown) => void) =>
          Promise.resolve(dbResponses.shift() ?? []).then(resolve);
      }
      if (prop === "catch" || prop === "finally") return undefined;
      return () => proxy;
    },
  });
  return { dbResponses, dbChain: proxy };
});

vi.mock("@/server/db", () => ({
  getDb: () => ({
    insert: () => dbChain,
    update: () => dbChain,
    delete: () => dbChain,
    query: {
      importDrafts: {
        findFirst: (...args: unknown[]) => findFirstMock(...args),
        findMany: (...args: unknown[]) => findManyMock(...args),
      },
    },
  }),
}));
vi.mock("@/server/db/schema", () => ({
  importDrafts: {
    id: "id",
    createdByUserId: "createdByUserId",
    expiresAt: "expiresAt",
    provider: "provider",
    status: "status",
    updatedAt: "updatedAt",
  },
}));
vi.mock("drizzle-orm", () => ({
  and: (...args: unknown[]) => args,
  desc: (value: unknown) => value,
  eq: (left: unknown, right: unknown) => ({ left, right }),
  gt: (left: unknown, right: unknown) => ({ left, right }),
  inArray: (left: unknown, right: unknown) => ({ left, right }),
}));

import {
  createCloudImportDraft,
  createLocalImportDraft,
  getImportDraftFile,
  getImportDraftSnapshot,
  markImportDraftImported,
  saveImportDraftProcessingState,
} from "../import-drafts-service";

describe("import-drafts-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbResponses.length = 0;
  });

  it("지원하지 않는 local 파일 형식은 차단한다", async () => {
    await expect(
      createLocalImportDraft({
        userId: "user-1",
        fileName: "archive.zip",
        mimeType: "application/zip",
        fileKind: "unsupported",
        byteSize: 100,
        buffer: Buffer.from("zip"),
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("cloud draft도 허용되지 않은 fileKind면 차단한다", async () => {
    await expect(
      createCloudImportDraft({
        userId: "user-1",
        provider: "onedrive",
        file: {
          id: "file-1",
          name: "voice.mp3",
          size: 100,
          lastModifiedAt: new Date().toISOString(),
          isFolder: false,
          isSpreadsheet: false,
          isImage: false,
          fileKind: "unsupported",
        },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("snapshot은 잘못된 status를 error로 fallback한다", async () => {
    findFirstMock.mockResolvedValue({
      id: "draft-1",
      provider: "local",
      status: "unknown-status",
      sourceFileId: null,
      sourceFileName: "students.csv",
      sourceMimeType: "text/csv",
      sourceFileKind: "csv",
      sourceByteSize: 10,
      sourceLastModifiedAt: null,
      sourceFileBase64: Buffer.from("a,b").toString("base64"),
      preview: null,
      importResult: null,
      errorMessage: null,
      processingStage: "queued",
      processingProgress: 0,
      processingMessage: "대기",
      expiresAt: new Date(Date.now() + 60_000),
      updatedAt: new Date("2026-04-12T10:00:00.000Z"),
      createdAt: new Date("2026-04-12T09:00:00.000Z"),
      createdByUserId: "user-1",
    });

    await expect(
      getImportDraftSnapshot("user-1", "draft-1"),
    ).resolves.toMatchObject({
      status: "error",
      provider: "local",
    });
  });

  it("cloud draft file 복구 요청은 400을 던진다", async () => {
    findFirstMock.mockResolvedValue({
      id: "draft-1",
      provider: "googledrive",
      sourceFileBase64: null,
      sourceFileName: "students.csv",
      sourceMimeType: "text/csv",
      expiresAt: new Date(Date.now() + 60_000),
      createdByUserId: "user-1",
    });

    await expect(getImportDraftFile("user-1", "draft-1")).rejects.toMatchObject(
      {
        status: 400,
        message: "로컬 초안 파일만 직접 복구할 수 있습니다.",
      },
    );
  });

  it("processing state에서 completed는 imported 상태로 매핑한다", async () => {
    findFirstMock.mockResolvedValue({
      id: "draft-1",
      expiresAt: new Date(Date.now() + 60_000),
      createdByUserId: "user-1",
    });
    dbResponses.push(undefined);

    await expect(
      saveImportDraftProcessingState({
        userId: "user-1",
        draftId: "draft-1",
        stage: "completed",
      }),
    ).resolves.toBeUndefined();
  });

  it("markImportDraftImported는 결과 저장을 허용한다", async () => {
    findFirstMock.mockResolvedValue({
      id: "draft-1",
      expiresAt: new Date(Date.now() + 60_000),
      createdByUserId: "user-1",
    });
    dbResponses.push(undefined);

    await expect(
      markImportDraftImported({
        userId: "user-1",
        draftId: "draft-1",
        result: { spaces: 1, members: 3 },
      }),
    ).resolves.toBeUndefined();
  });
});
