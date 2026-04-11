import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSpaceBodySchema } from "@yeon/api-contract/spaces";

import { createSpace, getSpaces } from "@/server/services/spaces-service";
import { createDefaultSystemTabs } from "@/server/services/member-tabs-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  try {
    const spaceList = await getSpaces(currentUser.id);

    return NextResponse.json({ spaces: spaceList });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("스페이스 목록을 불러오지 못했습니다.", 500);
  }
}

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

  const parsed = createSpaceBodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);
  }

  try {
    const space = await createSpace(currentUser.id, parsed.data);
    await createDefaultSystemTabs(space.id, currentUser.id);

    return NextResponse.json({ space }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("스페이스를 생성하지 못했습니다.", 500);
  }
}
