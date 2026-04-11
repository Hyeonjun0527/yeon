import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import type { FileKind } from "@/features/cloud-import/file-kind";
import { detectFileKind } from "@/features/cloud-import/file-kind";
import {
  analyzeBuffer,
  type ImportPreview,
  type RefineContext,
} from "@/server/services/file-analysis-service";
import {
  createCloudImportDraft,
  getImportDraftSource,
  markImportDraftAnalyzing,
  saveImportDraftError,
  saveImportDraftPreview,
} from "@/server/services/import-drafts-service";
import { createImportSSEStream } from "@/server/services/import-stream";
import {
  downloadFile,
  getValidAccessToken,
} from "@/server/services/onedrive-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const bodySchema = z.object({
  draftId: z.string().uuid().optional(),
  fileId: z.string().min(1).optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().nonnegative().optional(),
  lastModifiedAt: z.string().optional(),
  instruction: z.string().optional(),
  previousResult: z.unknown().optional(),
});

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("draftId 또는 fileId가 필요합니다.", 400);
  }

  let activeDraftId: string | null = null;

  try {
    const accessToken = await getValidAccessToken(currentUser.id);
    if (!accessToken) {
      return jsonError("OneDrive가 연결되어 있지 않습니다.", 401);
    }

    let fileId: string;
    let fileName: string;
    let mimeType: string;
    let kind: FileKind;

    if (parsed.data.draftId) {
      const draft = await getImportDraftSource(
        currentUser.id,
        parsed.data.draftId,
      );
      if (draft.provider !== "onedrive") {
        return jsonError("OneDrive 초안만 복구할 수 있습니다.", 400);
      }

      fileId = draft.selectedFile.id;
      fileName = draft.selectedFile.name;
      mimeType = draft.selectedFile.mimeType ?? "";
      kind = draft.selectedFile.fileKind;
      activeDraftId = draft.id;
    } else {
      if (!parsed.data.fileId || !parsed.data.fileName) {
        return jsonError("fileId와 fileName이 필요합니다.", 400);
      }

      fileId = parsed.data.fileId;
      fileName = parsed.data.fileName;
      mimeType = parsed.data.mimeType ?? "";
      kind = detectFileKind(fileName, mimeType);

      const createdDraft = await createCloudImportDraft({
        userId: currentUser.id,
        provider: "onedrive",
        file: {
          id: fileId,
          name: fileName,
          size: parsed.data.size ?? 0,
          lastModifiedAt:
            parsed.data.lastModifiedAt ?? new Date().toISOString(),
          mimeType: mimeType || undefined,
          isFolder: false,
          isSpreadsheet: kind === "spreadsheet",
          isImage: kind === "image",
          fileKind: kind,
        },
      });
      activeDraftId = createdDraft.id;
    }

    const ensuredDraftId = activeDraftId;
    const buffer = await downloadFile(accessToken, fileId);
    const refine: RefineContext | undefined =
      parsed.data.instruction?.trim() && parsed.data.previousResult
        ? {
            instruction: parsed.data.instruction.trim(),
            previousResult: parsed.data.previousResult as ImportPreview,
          }
        : undefined;

    if (request.headers.get("accept")?.includes("text/event-stream")) {
      await markImportDraftAnalyzing(currentUser.id, ensuredDraftId);
      return createImportSSEStream(
        buffer,
        fileName,
        mimeType,
        kind,
        refine,
        undefined,
        {
          extraHeaders: {
            "x-import-draft-id": ensuredDraftId,
          },
          onDone: (preview) =>
            saveImportDraftPreview({
              userId: currentUser.id,
              draftId: ensuredDraftId,
              preview,
              status: "analyzed",
            }),
          onError: (message) =>
            saveImportDraftError({
              userId: currentUser.id,
              draftId: ensuredDraftId,
              message,
            }),
        },
      );
    }

    await markImportDraftAnalyzing(currentUser.id, ensuredDraftId);
    const preview = await analyzeBuffer(
      buffer,
      fileName,
      mimeType,
      kind,
      refine,
    );
    await saveImportDraftPreview({
      userId: currentUser.id,
      draftId: ensuredDraftId,
      preview,
      status: "analyzed",
    });

    return NextResponse.json({ draftId: ensuredDraftId, preview });
  } catch (error) {
    if (activeDraftId) {
      await saveImportDraftError({
        userId: currentUser.id,
        draftId: activeDraftId,
        message:
          error instanceof ServiceError
            ? error.message
            : "파일 분석에 실패했습니다.",
      });
    }
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("파일 분석에 실패했습니다.", 500);
  }
}
