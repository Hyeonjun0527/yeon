import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSpaceBodySchema } from "@yeon/api-contract/spaces";

import {
  deleteSpace,
  getSpaceById,
  updateSpace,
} from "@/server/services/spaces-service";
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { spaceId } = await params;

  try {
    await deleteSpace(currentUser.id, spaceId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("스페이스를 삭제하지 못했습니다.", 500);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { spaceId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바르지 않습니다.", 400);
  }

  const parsed = updateSpaceBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("수정 요청 형식이 올바르지 않습니다.", 400);
  }

  try {
    const space = await updateSpace(currentUser.id, spaceId, parsed.data);
    return NextResponse.json({ space });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("스페이스를 수정하지 못했습니다.", 500);
  }
}
