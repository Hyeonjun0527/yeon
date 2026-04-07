import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getCounselingRecordAudio } from "@/server/services/counseling-records-service";
import { ServiceError } from "@/server/services/service-error";

import { jsonError, requireAuthenticatedUser } from "../../_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{
    recordId: string;
  }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { recordId } = await context.params;

  try {
    const audio = await getCounselingRecordAudio(
      currentUser.id,
      recordId,
      request.headers.get("range"),
    );

    return new NextResponse(audio.stream, {
      status: audio.status,
      headers: {
        "content-type": audio.mimeType,
        "content-length": String(audio.contentLength),
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(audio.originalName)}`,
        "cache-control": "private, no-store",
        "accept-ranges": "bytes",
        ...(audio.contentRange
          ? {
              "content-range": audio.contentRange,
            }
          : {}),
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("원본 음성 파일을 불러오지 못했습니다.", 500);
  }
}
