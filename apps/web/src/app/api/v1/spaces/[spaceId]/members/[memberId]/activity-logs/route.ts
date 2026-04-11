import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  countActivityLogsForMember,
  createMemberMemoLog,
  listActivityLogsForMember,
} from "@/server/services/activity-logs-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ spaceId: string; memberId: string }>;
};

const createLogBodySchema = z.object({
  text: z.string().min(1).max(2000),
});

export async function GET(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { spaceId, memberId } = await context.params;
  const type = request.nextUrl.searchParams.get("type");
  const rawLimit = request.nextUrl.searchParams.get("limit");

  try {
    const limit = rawLimit ? Number(rawLimit) : undefined;

    if (
      limit !== undefined &&
      (!Number.isInteger(limit) || limit <= 0 || limit > 500)
    ) {
      return jsonError("limit은 1 이상 500 이하의 정수여야 합니다.", 400);
    }

    const [logs, totalCount] = await Promise.all([
      listActivityLogsForMember({
        userId: currentUser.id,
        spaceId,
        memberId,
        type,
        limit,
      }),
      countActivityLogsForMember({
        userId: currentUser.id,
        spaceId,
        memberId,
        type,
      }),
    ]);

    return NextResponse.json({ logs, totalCount });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("활동 로그를 불러오지 못했습니다.", 500);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { spaceId, memberId } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = createLogBodySchema.safeParse(body);

  if (!parsed.success) {
    return jsonError("메모 요청 값이 올바르지 않습니다.", 400);
  }

  try {
    const log = await createMemberMemoLog({
      userId: currentUser.id,
      spaceId,
      memberId,
      text: parsed.data.text,
      authorLabel: currentUser.displayName,
    });

    return NextResponse.json({ log }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("메모를 저장하지 못했습니다.", 500);
  }
}
