import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { listImportDraftSnapshots } from "@/server/services/import-drafts-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const ACTIVE_LOCAL_DRAFT_STATUSES = [
  "uploaded",
  "analyzing",
  "analyzed",
  "edited",
  "error",
] as const;

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const parsedLimit = Number(limitRaw);
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.trunc(parsedLimit), 20)
      : 20;

  try {
    const drafts = await listImportDraftSnapshots({
      userId: currentUser.id,
      provider: "local",
      statuses: [...ACTIVE_LOCAL_DRAFT_STATUSES],
      limit,
    });

    return NextResponse.json({ drafts });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("가져오기 초안 목록을 불러오지 못했습니다.", 500);
  }
}
