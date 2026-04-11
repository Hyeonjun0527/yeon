import { and, eq, gt } from "drizzle-orm";
import { z } from "zod";

import type { FileKind } from "@/lib/file-kind";
import { getDb } from "@/server/db";
import { importDrafts } from "@/server/db/schema";

import {
  importPreviewBodySchema,
  type ImportPreviewBody,
} from "./import-preview-service";
import { ServiceError } from "./service-error";

const importDraftProviderSchema = z.enum(["local", "onedrive", "googledrive"]);
const IMPORT_DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const importDraftStatusSchema = z.enum([
  "uploaded",
  "analyzing",
  "analyzed",
  "edited",
  "imported",
  "error",
]);

export const importResultSchema = z.object({
  spaces: z.number().int().nonnegative(),
  members: z.number().int().nonnegative(),
});

type ImportDraftStatus = z.infer<typeof importDraftStatusSchema>;
type ImportDraftProvider = z.infer<typeof importDraftProviderSchema>;
type ImportDraftRow = typeof importDrafts.$inferSelect;
type PersistedSourceFile = {
  id: string;
  name: string;
  size: number;
  lastModifiedAt: string;
  mimeType?: string;
  isFolder: boolean;
  isSpreadsheet: boolean;
  isImage: boolean;
  fileKind: FileKind;
};

const LOCAL_IMPORT_FILE_KIND_SET = new Set<FileKind>([
  "spreadsheet",
  "csv",
  "txt",
  "pdf",
  "image",
]);

function ensureImportDraftStatus(value: string): ImportDraftStatus {
  const parsed = importDraftStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : "error";
}

function parseStoredPreview(
  preview: ImportDraftRow["preview"],
): ImportPreviewBody | null {
  const parsed = importPreviewBodySchema.safeParse(preview);
  return parsed.success ? parsed.data : null;
}

function parseStoredImportResult(
  result: ImportDraftRow["importResult"],
): z.infer<typeof importResultSchema> | null {
  const parsed = importResultSchema.safeParse(result);
  return parsed.success ? parsed.data : null;
}

function buildDriveFile(row: ImportDraftRow) {
  const kind = row.sourceFileKind as FileKind;
  return {
    id: row.sourceFileId ?? `local-draft:${row.id}`,
    name: row.sourceFileName,
    size: row.sourceByteSize,
    lastModifiedAt: (row.sourceLastModifiedAt ?? row.createdAt).toISOString(),
    mimeType: row.sourceMimeType ?? undefined,
    isFolder: false,
    isSpreadsheet: kind === "spreadsheet",
    isImage: kind === "image",
    fileKind: kind,
  } satisfies PersistedSourceFile;
}

function ensureImportDraftProvider(value: string): ImportDraftProvider {
  const parsed = importDraftProviderSchema.safeParse(value);
  if (!parsed.success) {
    throw new ServiceError(
      500,
      "가져오기 초안 제공자 정보가 올바르지 않습니다.",
    );
  }
  return parsed.data;
}

function assertLocalImportKind(kind: FileKind) {
  if (!LOCAL_IMPORT_FILE_KIND_SET.has(kind)) {
    throw new ServiceError(400, "지원하지 않는 파일 형식입니다.");
  }
}

async function findAccessibleDraft(userId: string, draftId: string) {
  const db = getDb();
  const row = await db.query.importDrafts.findFirst({
    where: and(
      eq(importDrafts.id, draftId),
      eq(importDrafts.createdByUserId, userId),
      gt(importDrafts.expiresAt, new Date()),
    ),
  });

  if (!row) {
    throw new ServiceError(404, "복구할 가져오기 초안을 찾지 못했습니다.");
  }

  return row;
}

export async function createLocalImportDraft(params: {
  userId: string;
  fileName: string;
  mimeType: string;
  fileKind: FileKind;
  byteSize: number;
  lastModifiedAt?: Date | null;
  buffer: Buffer;
}) {
  assertLocalImportKind(params.fileKind);
  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + IMPORT_DRAFT_TTL_MS);

  const [row] = await db
    .insert(importDrafts)
    .values({
      createdByUserId: params.userId,
      provider: "local",
      status: "uploaded",
      sourceFileId: null,
      sourceFileName: params.fileName,
      sourceMimeType: params.mimeType || null,
      sourceFileKind: params.fileKind,
      sourceByteSize: params.byteSize,
      sourceLastModifiedAt: params.lastModifiedAt ?? null,
      sourceFileBase64: params.buffer.toString("base64"),
      expiresAt,
      updatedAt: now,
    })
    .returning();

  return row;
}

export async function createCloudImportDraft(params: {
  userId: string;
  provider: Extract<ImportDraftProvider, "onedrive" | "googledrive">;
  file: PersistedSourceFile;
}) {
  assertLocalImportKind(params.file.fileKind);
  const db = getDb();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + IMPORT_DRAFT_TTL_MS);

  const [row] = await db
    .insert(importDrafts)
    .values({
      createdByUserId: params.userId,
      provider: params.provider,
      status: "uploaded",
      sourceFileId: params.file.id,
      sourceFileName: params.file.name,
      sourceMimeType: params.file.mimeType ?? null,
      sourceFileKind: params.file.fileKind,
      sourceByteSize: params.file.size,
      sourceLastModifiedAt: params.file.lastModifiedAt
        ? new Date(params.file.lastModifiedAt)
        : null,
      sourceFileBase64: null,
      expiresAt,
      updatedAt: now,
    })
    .returning();

  return row;
}

export async function getImportDraftSnapshot(userId: string, draftId: string) {
  const row = await findAccessibleDraft(userId, draftId);
  return {
    id: row.id,
    provider: ensureImportDraftProvider(row.provider),
    status: ensureImportDraftStatus(row.status),
    selectedFile: buildDriveFile(row),
    preview: parseStoredPreview(row.preview),
    importResult: parseStoredImportResult(row.importResult),
    error: row.errorMessage,
    expiresAt: row.expiresAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteImportDraft(userId: string, draftId: string) {
  await findAccessibleDraft(userId, draftId);
  const db = getDb();
  await db
    .delete(importDrafts)
    .where(
      and(
        eq(importDrafts.id, draftId),
        eq(importDrafts.createdByUserId, userId),
      ),
    );
}

export async function getImportDraftFile(userId: string, draftId: string) {
  const row = await findAccessibleDraft(userId, draftId);
  if (!row.sourceFileBase64) {
    throw new ServiceError(400, "로컬 초안 파일만 직접 복구할 수 있습니다.");
  }
  return {
    fileName: row.sourceFileName,
    mimeType: row.sourceMimeType || "application/octet-stream",
    bytes: Buffer.from(row.sourceFileBase64, "base64"),
  };
}

export async function getImportDraftBuffer(userId: string, draftId: string) {
  const row = await findAccessibleDraft(userId, draftId);
  if (!row.sourceFileBase64) {
    throw new ServiceError(400, "원본 파일 바이트가 저장되지 않은 초안입니다.");
  }
  return {
    row,
    buffer: Buffer.from(row.sourceFileBase64, "base64"),
  };
}

export async function getImportDraftSource(userId: string, draftId: string) {
  const row = await findAccessibleDraft(userId, draftId);
  return {
    id: row.id,
    provider: ensureImportDraftProvider(row.provider),
    selectedFile: buildDriveFile(row),
    expiresAt: row.expiresAt.toISOString(),
  };
}

export async function markImportDraftAnalyzing(
  userId: string,
  draftId: string,
) {
  await findAccessibleDraft(userId, draftId);
  const db = getDb();
  await db
    .update(importDrafts)
    .set({
      status: "analyzing",
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importDrafts.id, draftId),
        eq(importDrafts.createdByUserId, userId),
      ),
    );
}

export async function saveImportDraftPreview(params: {
  userId: string;
  draftId: string;
  preview: ImportPreviewBody;
  status: Extract<ImportDraftStatus, "analyzed" | "edited">;
}) {
  await findAccessibleDraft(params.userId, params.draftId);
  const db = getDb();
  await db
    .update(importDrafts)
    .set({
      status: params.status,
      preview: params.preview,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importDrafts.id, params.draftId),
        eq(importDrafts.createdByUserId, params.userId),
      ),
    );
}

export async function saveImportDraftError(params: {
  userId: string;
  draftId: string;
  message: string;
}) {
  await findAccessibleDraft(params.userId, params.draftId);
  const db = getDb();
  await db
    .update(importDrafts)
    .set({
      status: "error",
      errorMessage: params.message,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importDrafts.id, params.draftId),
        eq(importDrafts.createdByUserId, params.userId),
      ),
    );
}

export async function markImportDraftImported(params: {
  userId: string;
  draftId: string;
  result: z.infer<typeof importResultSchema>;
}) {
  await findAccessibleDraft(params.userId, params.draftId);
  const db = getDb();
  await db
    .update(importDrafts)
    .set({
      status: "imported",
      importResult: params.result,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importDrafts.id, params.draftId),
        eq(importDrafts.createdByUserId, params.userId),
      ),
    );
}
