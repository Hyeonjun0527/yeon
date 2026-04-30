import { NextResponse, type NextRequest } from "next/server";
import { upsertLifeOsDayBodySchema } from "@yeon/api-contract/life-os";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import {
  listLifeOsDays,
  upsertLifeOsDay,
} from "@/server/services/life-os-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) {
    return response;
  }

  try {
    const days = await listLifeOsDays(currentUser.id);
    return NextResponse.json({ days });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Life OS 기록 목록을 불러오지 못했습니다.", 500);
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

  const parsed = upsertLifeOsDayBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Life OS 기록 형식이 올바르지 않습니다.", 400);
  }

  try {
    const day = await upsertLifeOsDay(currentUser.id, parsed.data);
    return NextResponse.json({ day }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("Life OS 기록을 저장하지 못했습니다.", 500);
  }
}
