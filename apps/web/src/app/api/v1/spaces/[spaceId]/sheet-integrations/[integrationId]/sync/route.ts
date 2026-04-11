import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { sheetIntegrations } from "@/server/db/schema";
import { syncSheetToActivityLogs } from "@/server/services/google-sheets-service";
import { ServiceError } from "@/server/services/service-error";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";

export const runtime = "nodejs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string; integrationId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  const { spaceId, integrationId } = await params;

  try {
    const db = getDb();

    const [integration] = await db
      .select()
      .from(sheetIntegrations)
      .where(
        and(
          eq(sheetIntegrations.id, integrationId),
          eq(sheetIntegrations.spaceId, spaceId),
        ),
      )
      .limit(1);

    if (!integration) {
      return jsonError("시트 연동을 찾지 못했습니다.", 404);
    }

    const result = await syncSheetToActivityLogs(integration);

    return NextResponse.json({ synced: result.synced, errors: result.errors });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("시트 동기화를 처리하지 못했습니다.", 500);
  }
}
