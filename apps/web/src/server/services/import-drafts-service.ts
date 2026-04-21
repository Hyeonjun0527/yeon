import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { z } from "zod";

import {
  IMPORT_ANALYSIS_STAGES,
  createImportAnalysisProgressState,
  type ImportAnalysisStage,
} from "@/lib/import-analysis-progress";
import type { FileKind } from "@/lib/file-kind";
import { getDb } from "@/server/db";
import { importDrafts } from "@/server/db/schema";
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

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
export const importDraftProcessingStageSchema = z.enum(IMPORT_ANALYSIS_STAGES);

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

function ensureImportDraftProcessingStage(value: string): ImportAnalysisStage {
  const parsed = importDraftProcessingStageSchema.safeParse(value);
  return parsed.success ? parsed.data : "error";
}

function buildDriveFile(row: ImportDraftRow) {
  const kind = row.sourceFileKind as FileKind;
  return {
    id: row.sourceFileId ?? `local-draft:${row.publicId}`,
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

async function findAccessibleDraft(userId: string, draftPublicId: string) {
  const db = getDb();
  const row = await db.query.importDrafts.findFirst({
    where: and(
      eq(importDrafts.publicId, draftPublicId),
      eq(importDrafts.createdByUserId, userId),
      gt(importDrafts.expiresAt, new Date()),
    ),
  });

  if (!row) {
    throw new ServiceError(404, "복구할 가져오기 초안을 찾지 못했습니다.");
  }

  return row;
}

function buildProcessingStateSnapshot(
  row: Pick<
    ImportDraftRow,
    "processingStage" | "processingProgress" | "processingMessage"
  >,
) {
  return {
    processingStage: ensureImportDraftProcessingStage(row.processingStage),
    processingProgress: row.processingProgress,
    processingMessage: row.processingMessage,
  };
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
  const initialProgress = createImportAnalysisProgressState("queued", {
    message: "분석 대기 중입니다.",
    progress: 0,
  });

  const [row] = await db
    .insert(importDrafts)
    .values({
      publicId: generatePublicId(ID_PREFIX.importDrafts),
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
      processingStage: initialProgress.stage,
      processingProgress: initialProgress.progress,
      processingMessage: initialProgress.message,
      expiresAt,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new ServiceError(500, "가져오기 초안을 생성하지 못했습니다.");
  }

  return {
    ...row,
    id: row.publicId,
  };
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
  const initialProgress = createImportAnalysisProgressState("queued", {
    message: "분석 대기 중입니다.",
    progress: 0,
  });

  const [row] = await db
    .insert(importDrafts)
    .values({
      publicId: generatePublicId(ID_PREFIX.importDrafts),
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
      processingStage: initialProgress.stage,
      processingProgress: initialProgress.progress,
      processingMessage: initialProgress.message,
      expiresAt,
      updatedAt: now,
    })
    .returning();

  if (!row) {
    throw new ServiceError(500, "가져오기 초안을 생성하지 못했습니다.");
  }

  return {
    ...row,
    id: row.publicId,
  };
}

export async function getImportDraftSnapshot(userId: string, draftId: string) {
  const row = await findAccessibleDraft(userId, draftId);
  return {
    id: row.publicId,
    provider: ensureImportDraftProvider(row.provider),
    status: ensureImportDraftStatus(row.status),
    selectedFile: buildDriveFile(row),
    preview: parseStoredPreview(row.preview),
    importResult: parseStoredImportResult(row.importResult),
    error: row.errorMessage,
    ...buildProcessingStateSnapshot(row),
    expiresAt: row.expiresAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listImportDraftSnapshots(params: {
  userId: string;
  provider?: ImportDraftProvider;
  statuses?: ImportDraftStatus[];
  limit?: number;
}) {
  const db = getDb();
  const filters = [
    eq(importDrafts.createdByUserId, params.userId),
    gt(importDrafts.expiresAt, new Date()),
  ];

  if (params.provider) {
    filters.push(eq(importDrafts.provider, params.provider));
  }

  if (params.statuses && params.statuses.length > 0) {
    filters.push(inArray(importDrafts.status, params.statuses));
  }

  const rows = await db.query.importDrafts.findMany({
    where: and(...filters),
    orderBy: [desc(importDrafts.updatedAt)],
    limit: params.limit,
  });

  return rows.map((row) => ({
    id: row.publicId,
    provider: ensureImportDraftProvider(row.provider),
    status: ensureImportDraftStatus(row.status),
    selectedFile: buildDriveFile(row),
    preview: parseStoredPreview(row.preview),
    importResult: parseStoredImportResult(row.importResult),
    error: row.errorMessage,
    ...buildProcessingStateSnapshot(row),
    expiresAt: row.expiresAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }));
}

export async function deleteImportDraft(userId: string, draftId: string) {
  await findAccessibleDraft(userId, draftId);
  const db = getDb();
  await db
    .delete(importDrafts)
    .where(
      and(
        eq(importDrafts.publicId, draftId),
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
    id: row.publicId,
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
  const progress = createImportAnalysisProgressState("queued");
  await db
    .update(importDrafts)
    .set({
      status: "analyzing",
      errorMessage: null,
      processingStage: progress.stage,
      processingProgress: progress.progress,
      processingMessage: progress.message,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importDrafts.publicId, draftId),
        eq(importDrafts.createdByUserId, userId),
      ),
    );
}

export async function saveImportDraftProcessingState(params: {
  userId: string;
  draftId: string;
  stage: ImportAnalysisStage;
  progress?: number;
  message?: string;
}) {
  await findAccessibleDraft(params.userId, params.draftId);
  const db = getDb();
  const state = createImportAnalysisProgressState(params.stage, {
    progress: params.progress,
    message: params.message,
  });

  await db
    .update(importDrafts)
    .set({
      status:
        params.stage === "error"
          ? "error"
          : params.stage === "completed"
            ? "imported"
            : params.stage === "preview_ready"
              ? "analyzed"
              : params.stage === "importing"
                ? "analyzing"
                : "analyzing",
      processingStage: state.stage,
      processingProgress: state.progress,
      processingMessage: state.message,
      errorMessage: params.stage === "error" ? state.message : null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importDrafts.publicId, params.draftId),
        eq(importDrafts.createdByUserId, params.userId),
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
      processingStage: "preview_ready",
      processingProgress: 100,
      processingMessage:
        params.status === "edited"
          ? "수정된 미리보기를 저장했습니다."
          : "분석이 완료되었습니다.",
      preview: params.preview,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importDrafts.publicId, params.draftId),
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
      processingStage: "error",
      processingProgress: 0,
      processingMessage: params.message,
      errorMessage: params.message,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importDrafts.publicId, params.draftId),
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
      processingStage: "completed",
      processingProgress: 100,
      processingMessage: "가져오기가 완료되었습니다.",
      importResult: params.result,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importDrafts.publicId, params.draftId),
        eq(importDrafts.createdByUserId, params.userId),
      ),
    );
}

export async function markImportDraftImporting(params: {
  userId: string;
  draftId: string;
}) {
  await findAccessibleDraft(params.userId, params.draftId);
  const db = getDb();
  const progress = createImportAnalysisProgressState("importing");
  await db
    .update(importDrafts)
    .set({
      status: "analyzing",
      processingStage: progress.stage,
      processingProgress: progress.progress,
      processingMessage: progress.message,
      errorMessage: null,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(importDrafts.publicId, params.draftId),
        eq(importDrafts.createdByUserId, params.userId),
      ),
    );
}
