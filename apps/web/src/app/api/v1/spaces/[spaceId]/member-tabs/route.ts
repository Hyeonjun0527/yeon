import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";

import { jsonError, requireAuthenticatedUser } from "@/app/api/v1/counseling-records/_shared";
import {
  createCustomTab,
  createDefaultSystemTabs,
  getTabsForSpace,
} from "@/server/services/member-tabs-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const createTabBodySchema = z.object({
  name: z.string().min(1).max(80),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId } = await params;

  try {
    let tabs = await getTabsForSpace(spaceId);
    // 시스템 탭이 없으면 lazy init (기존 스페이스 backfill)
    const hasSystemTabs = tabs.some((t) => t.tabType === "system");
    if (!hasSystemTabs) {
      await createDefaultSystemTabs(spaceId, currentUser.id);
      tabs = await getTabsForSpace(spaceId);
    }
    return NextResponse.json({ tabs });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("탭 목록을 불러오지 못했습니다.", 500);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = createTabBodySchema.safeParse(body);
  if (!parsed.success) return jsonError("요청 데이터가 올바르지 않습니다.", 400);

  try {
    const tab = await createCustomTab(spaceId, currentUser.id, parsed.data);
    return NextResponse.json({ tab }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) return jsonError(error.message, error.status);
    console.error(error);
    return jsonError("탭을 생성하지 못했습니다.", 500);
  }
}
