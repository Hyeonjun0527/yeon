import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createMemberBodySchema } from "@yeon/api-contract/spaces";

import {
  createMember,
  getMembersWithRisk,
} from "@/server/services/members-service";
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
    const memberList = await getMembersWithRisk(currentUser.id, spaceId);

    return NextResponse.json({ members: memberList });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("수강생 목록을 불러오지 못했습니다.", 500);
  }
}

export async function POST(
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
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = createMemberBodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);
  }

  try {
    const member = await createMember(spaceId, parsed.data);

    return NextResponse.json({ member }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("수강생을 추가하지 못했습니다.", 500);
  }
}
