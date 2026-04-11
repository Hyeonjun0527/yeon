import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { analyzeBuffer } from "@/server/services/file-analysis-service";
import type {
  FieldSchemaHint,
  ImportPreview,
  RefineContext,
} from "@/server/services/file-analysis-service";
import {
  createLocalImportDraft,
  getImportDraftBuffer,
  markImportDraftAnalyzing,
  saveImportDraftError,
  saveImportDraftPreview,
} from "@/server/services/import-drafts-service";
import { createImportSSEStream } from "@/server/services/import-stream";
import type { FileKind } from "@/features/cloud-import/file-kind";
import { detectFileKind } from "@/features/cloud-import/file-kind";
import { ServiceError } from "@/server/services/service-error";
import { getOverviewTab } from "@/server/services/member-tabs-service";
import { getFieldsForTab } from "@/server/services/member-fields-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("multipart form 데이터를 읽을 수 없습니다.", 400);
  }

  const file = formData.get("file");
  const draftIdRaw = formData.get("draftId");
  const requestedDraftId =
    typeof draftIdRaw === "string" && draftIdRaw.trim()
      ? draftIdRaw.trim()
      : null;

  const instruction = formData.get("instruction");
  const previousResultRaw = formData.get("previousResult");
  let refine: RefineContext | undefined;
  if (
    typeof instruction === "string" &&
    instruction.trim() &&
    typeof previousResultRaw === "string"
  ) {
    try {
      const previousResult = JSON.parse(previousResultRaw) as ImportPreview;
      refine = { instruction: instruction.trim(), previousResult };
    } catch {
      // 파싱 실패 시 refinement 없이 진행
    }
  }

  // 커스텀 필드 힌트 (spaceId 제공 시)
  const spaceId = formData.get("spaceId");
  let fieldHints: FieldSchemaHint[] | undefined;
  if (typeof spaceId === "string" && spaceId.trim()) {
    try {
      const overviewTab = await getOverviewTab(spaceId.trim());
      if (overviewTab) {
        const fields = await getFieldsForTab(overviewTab.id, spaceId.trim());
        fieldHints = fields.map((f) => ({
          name: f.name,
          fieldType: f.fieldType,
        }));
      }
    } catch {
      // 필드 힌트 조회 실패 시 무시하고 진행
    }
  }

  let activeDraftId: string | null = null;

  try {
    let buffer: Buffer;
    let fileName: string;
    let mimeType: string;
    let kind: FileKind;

    if (requestedDraftId) {
      const draft = await getImportDraftBuffer(
        currentUser.id,
        requestedDraftId,
      );
      buffer = draft.buffer;
      fileName = draft.row.sourceFileName;
      mimeType = draft.row.sourceMimeType ?? "";
      kind = draft.row.sourceFileKind as FileKind;
      activeDraftId = draft.row.id;
    } else if (file instanceof Blob) {
      fileName = (file as File).name;
      mimeType = file.type;
      buffer = Buffer.from(await file.arrayBuffer());
      kind = detectFileKind(fileName, mimeType);

      const createdDraft = await createLocalImportDraft({
        userId: currentUser.id,
        fileName,
        mimeType,
        fileKind: kind,
        byteSize: buffer.byteLength,
        lastModifiedAt:
          file instanceof File ? new Date(file.lastModified) : null,
        buffer,
      });
      activeDraftId = createdDraft.id;
    } else {
      return jsonError("file 또는 draftId 필드가 필요합니다.", 400);
    }

    const ensuredDraftId = activeDraftId;

    // SSE 스트리밍 요청인 경우
    if (request.headers.get("accept")?.includes("text/event-stream")) {
      await markImportDraftAnalyzing(currentUser.id, ensuredDraftId);
      return createImportSSEStream(
        buffer,
        fileName,
        mimeType,
        kind,
        refine,
        fieldHints,
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
      fieldHints,
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
