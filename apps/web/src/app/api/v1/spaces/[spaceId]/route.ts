import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getSpaceById } from "@/server/services/spaces-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { spaceId } = await params;

  try {
    const space = await getSpaceById(spaceId);

    return NextResponse.json({ space });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("스페이스를 불러오지 못했습니다.", 500);
  }
}
