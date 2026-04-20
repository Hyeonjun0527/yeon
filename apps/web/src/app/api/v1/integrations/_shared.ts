import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { resolveAppHrefForBasePath } from "@/lib/app-route-paths";
import { DEFAULT_PLATFORM_SERVICE_HREF } from "@/lib/platform-services";
import {
  createCloudImportDraft,
  markImportDraftAnalyzing,
  markImportDraftImported,
  markImportDraftImporting,
  saveImportDraftError,
  saveImportDraftPreview,
  saveImportDraftProcessingState,
  getImportDraftSource,
} from "@/server/services/import-drafts-service";
import {
  importPreviewBodySchema,
  importPreviewIntoSpaces,
} from "@/server/services/import-preview-service";
import type {
  FieldSchemaHint,
  ImportPreview,
  RefineContext,
} from "@/server/services/file-analysis-service";
import { analyzeBuffer } from "@/server/services/file-analysis-service";
import { createImportSSEStream } from "@/server/services/import-stream";
import { ServiceError } from "@/server/services/service-error";
import type { FileKind } from "@/features/cloud-import/file-kind";
import { detectFileKind } from "@/features/cloud-import/file-kind";
import { jsonError } from "@/app/api/v1/counseling-records/_shared";

const importRequestSchema = z.object({
  draftId: z.string().uuid().optional(),
  preview: importPreviewBodySchema,
});

const cloudAnalyzeRequestSchema = z.object({
  draftId: z.string().uuid().optional(),
  fileId: z.string().min(1).optional(),
  fileName: z.string().optional(),
  mimeType: z.string().optional(),
  size: z.number().nonnegative().optional(),
  lastModifiedAt: z.string().optional(),
  instruction: z.string().optional(),
  previousResult: z.unknown().optional(),
});

type CloudProvider = "onedrive" | "googledrive";

type CloudAnalyzeRequest = z.infer<typeof cloudAnalyzeRequestSchema>;

interface HandleImportCommitRouteParams {
  request: NextRequest;
  userId: string;
}

interface HandleCloudAnalyzeRouteParams {
  request: NextRequest;
  userId: string;
  provider: CloudProvider;
  providerLabel: string;
  getAccessToken: (userId: string) => Promise<string | null>;
  downloadFile: (
    accessToken: string,
    fileId: string,
    mimeType: string,
  ) => Promise<Buffer>;
  requireMimeType: boolean;
}

interface ExecuteAnalyzeRouteParams {
  request: NextRequest;
  userId: string;
  draftId: string;
  buffer: Buffer;
  fileName: string;
  mimeType: string;
  kind: FileKind;
  refine?: RefineContext;
  fieldHints?: FieldSchemaHint[];
}

interface HandleProviderStatusRouteParams<T extends Record<string, unknown>> {
  userId: string;
  getPayload: (userId: string) => Promise<T>;
  failureMessage: string;
}

interface HandleProviderFilesRouteParams<TFile> {
  request: NextRequest;
  userId: string;
  getAccessToken: (userId: string) => Promise<string | null>;
  listFiles: (accessToken: string, folderId?: string) => Promise<TFile[]>;
  disconnectedMessage: string;
  failureMessage: string;
}

interface HandleProviderFileProxyRouteParams {
  userId: string;
  fileId: string;
  mimeType: string;
  getAccessToken: (userId: string) => Promise<string | null>;
  downloadFile: (
    accessToken: string,
    fileId: string,
    mimeType: string,
  ) => Promise<Buffer>;
  disconnectedMessage: string;
  logLabel: string;
  resolveContentType?: (mimeType: string) => string;
}

interface HandleOAuthStartRouteParams {
  userId: string;
  providerKey: CloudProvider;
  getOAuthUrl: (state: string) => string;
  failureMessage: string;
}

interface ResolveOAuthCallbackContextParams {
  request: NextRequest;
  providerKey: CloudProvider;
}

type OAuthCallbackErrorCode =
  | "missing_params"
  | "invalid_state"
  | "exchange_failed"
  | "save_failed";

function buildRefineContext(
  body: CloudAnalyzeRequest,
): RefineContext | undefined {
  return body.instruction?.trim() && body.previousResult
    ? {
        instruction: body.instruction.trim(),
        previousResult: body.previousResult as ImportPreview,
      }
    : undefined;
}

function buildOAuthCookieName(
  providerKey: CloudProvider,
  field: "state" | "user",
) {
  return `${providerKey}_oauth_${field}`;
}

function buildOAuthRedirectTarget() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const studentManagementPath = resolveAppHrefForBasePath(
    DEFAULT_PLATFORM_SERVICE_HREF,
    "/counseling-service/student-management",
  );

  return new URL(studentManagementPath, baseUrl).toString();
}

export function handleOAuthStartRoute({
  userId,
  providerKey,
  getOAuthUrl,
  failureMessage,
}: HandleOAuthStartRouteParams) {
  try {
    const state = randomUUID();
    const redirectUrl = getOAuthUrl(state);

    const response = NextResponse.redirect(redirectUrl);
    response.cookies.set(buildOAuthCookieName(providerKey, "state"), state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });
    response.cookies.set(buildOAuthCookieName(providerKey, "user"), userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError(failureMessage, 500);
  }
}

export function createOAuthCallbackErrorResponse(
  providerKey: CloudProvider,
  errorCode: OAuthCallbackErrorCode,
) {
  return NextResponse.redirect(
    `${buildOAuthRedirectTarget()}?${providerKey}_error=${errorCode}`,
  );
}

export function createOAuthCallbackSuccessResponse(providerKey: CloudProvider) {
  const response = NextResponse.redirect(
    `${buildOAuthRedirectTarget()}?${providerKey}_connected=true`,
  );
  response.cookies.delete(buildOAuthCookieName(providerKey, "state"));
  response.cookies.delete(buildOAuthCookieName(providerKey, "user"));
  return response;
}

export function resolveOAuthCallbackContext({
  request,
  providerKey,
}: ResolveOAuthCallbackContextParams):
  | { code: string; userId: string }
  | { response: Response } {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(
    buildOAuthCookieName(providerKey, "state"),
  )?.value;
  const userId = request.cookies.get(
    buildOAuthCookieName(providerKey, "user"),
  )?.value;

  if (!code || !state || !savedState || !userId) {
    return {
      response: createOAuthCallbackErrorResponse(providerKey, "missing_params"),
    };
  }

  if (state !== savedState) {
    return {
      response: createOAuthCallbackErrorResponse(providerKey, "invalid_state"),
    };
  }

  return { code, userId };
}

async function parseJsonBody<T>(
  request: NextRequest,
  schema: z.ZodType<T>,
  invalidDataMessage: string,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400),
    };
  }

  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(invalidDataMessage, 400),
    };
  }

  return {
    ok: true,
    data: parsed.data,
  };
}

export async function handleImportCommitRoute({
  request,
  userId,
}: HandleImportCommitRouteParams) {
  const parsed = await parseJsonBody(
    request,
    importRequestSchema,
    "요청 데이터가 올바르지 않습니다.",
  );

  if (!parsed.ok) {
    return parsed.response;
  }

  try {
    const created = await importPreviewIntoSpaces(userId, parsed.data.preview);

    if (parsed.data.draftId) {
      await markImportDraftImporting({
        userId,
        draftId: parsed.data.draftId,
      });
      await markImportDraftImported({
        userId,
        draftId: parsed.data.draftId,
        result: created,
      });
    }

    return NextResponse.json(
      {
        created: { spaces: created.spaces, members: created.members },
        spaceIds: created.spaceIds,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("스페이스/수강생 생성에 실패했습니다.", 500);
  }
}

export async function handleProviderStatusRoute<
  T extends Record<string, unknown>,
>({ userId, getPayload, failureMessage }: HandleProviderStatusRouteParams<T>) {
  try {
    const payload = await getPayload(userId);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError(failureMessage, 500);
  }
}

export async function handleProviderFilesRoute<TFile>({
  request,
  userId,
  getAccessToken,
  listFiles,
  disconnectedMessage,
  failureMessage,
}: HandleProviderFilesRouteParams<TFile>) {
  try {
    const accessToken = await getAccessToken(userId);

    if (!accessToken) {
      return jsonError(disconnectedMessage, 401);
    }

    const folderId = request.nextUrl.searchParams.get("folderId") ?? undefined;
    const files = await listFiles(accessToken, folderId);

    return NextResponse.json({ files });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError(failureMessage, 500);
  }
}

export async function handleProviderFileProxyRoute({
  userId,
  fileId,
  mimeType,
  getAccessToken,
  downloadFile,
  disconnectedMessage,
  logLabel,
  resolveContentType,
}: HandleProviderFileProxyRouteParams) {
  try {
    const accessToken = await getAccessToken(userId);

    if (!accessToken) {
      return jsonError(disconnectedMessage, 401);
    }

    const buffer = await downloadFile(accessToken, fileId, mimeType);
    const contentType =
      (resolveContentType?.(mimeType) ?? mimeType) ||
      "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(`${logLabel} 파일 프록시 오류:`, error);
    return jsonError("파일을 가져오지 못했습니다.", 500);
  }
}

export async function executeAnalyzeRoute({
  request,
  userId,
  draftId,
  buffer,
  fileName,
  mimeType,
  kind,
  refine,
  fieldHints,
}: ExecuteAnalyzeRouteParams) {
  try {
    if (request.headers.get("accept")?.includes("text/event-stream")) {
      await markImportDraftAnalyzing(userId, draftId);
      return createImportSSEStream(
        buffer,
        fileName,
        mimeType,
        kind,
        refine,
        fieldHints,
        {
          extraHeaders: {
            "x-import-draft-id": draftId,
          },
          onDone: (result) =>
            saveImportDraftPreview({
              userId,
              draftId,
              preview: result.preview,
              status: "analyzed",
            }),
          onError: (message) =>
            saveImportDraftError({
              userId,
              draftId,
              message,
            }),
          onProgress: (progress) =>
            saveImportDraftProcessingState({
              userId,
              draftId,
              stage: progress.stage,
              progress: progress.progress,
              message: progress.message,
            }),
        },
      );
    }

    await markImportDraftAnalyzing(userId, draftId);
    const result = await analyzeBuffer(
      buffer,
      fileName,
      mimeType,
      kind,
      refine,
      fieldHints,
      (progress) =>
        saveImportDraftProcessingState({
          userId,
          draftId,
          stage: progress.stage,
          progress: progress.progress,
          message: progress.message,
        }),
    );

    await saveImportDraftPreview({
      userId,
      draftId,
      preview: result.preview,
      status: "analyzed",
    });

    return NextResponse.json({
      draftId,
      preview: result.preview,
      assistantMessage: result.assistantMessage ?? null,
    });
  } catch (error) {
    await saveImportDraftError({
      userId,
      draftId,
      message:
        error instanceof ServiceError
          ? error.message
          : "파일 분석에 실패했습니다.",
    });

    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("파일 분석에 실패했습니다.", 500);
  }
}

export async function handleCloudAnalyzeRoute({
  request,
  userId,
  provider,
  providerLabel,
  getAccessToken,
  downloadFile,
  requireMimeType,
}: HandleCloudAnalyzeRouteParams) {
  const parsed = await parseJsonBody(
    request,
    cloudAnalyzeRequestSchema,
    "draftId 또는 fileId가 필요합니다.",
  );

  if (!parsed.ok) {
    return parsed.response;
  }

  let activeDraftId: string | null = null;

  try {
    const accessToken = await getAccessToken(userId);

    if (!accessToken) {
      return jsonError(`${providerLabel}가 연결되어 있지 않습니다.`, 401);
    }

    let fileId: string;
    let fileName: string;
    let mimeType: string;
    let kind: FileKind;

    if (parsed.data.draftId) {
      const draft = await getImportDraftSource(userId, parsed.data.draftId);

      if (draft.provider !== provider) {
        return jsonError(`${providerLabel} 초안만 복구할 수 있습니다.`, 400);
      }

      fileId = draft.selectedFile.id;
      fileName = draft.selectedFile.name;
      mimeType = draft.selectedFile.mimeType ?? "";
      kind = draft.selectedFile.fileKind;
      activeDraftId = draft.id;
    } else {
      const requestedFileId = parsed.data.fileId;
      const requestedFileName = parsed.data.fileName;
      const requestedMimeType = parsed.data.mimeType;
      const hasRequiredFields = requireMimeType
        ? Boolean(requestedFileId && requestedFileName && requestedMimeType)
        : Boolean(requestedFileId && requestedFileName);

      if (!hasRequiredFields) {
        return jsonError(
          requireMimeType
            ? "fileId, fileName, mimeType이 필요합니다."
            : "fileId와 fileName이 필요합니다.",
          400,
        );
      }

      fileId = requestedFileId ?? "";
      fileName = requestedFileName ?? "";
      mimeType = requestedMimeType ?? "";
      kind = detectFileKind(fileName, mimeType);

      const createdDraft = await createCloudImportDraft({
        userId,
        provider,
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
    const buffer = await downloadFile(accessToken, fileId, mimeType);
    const refine = buildRefineContext(parsed.data);

    return executeAnalyzeRoute({
      request,
      userId,
      draftId: ensuredDraftId,
      buffer,
      fileName,
      mimeType,
      kind,
      refine,
    });
  } catch (error) {
    if (activeDraftId) {
      await saveImportDraftError({
        userId,
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
