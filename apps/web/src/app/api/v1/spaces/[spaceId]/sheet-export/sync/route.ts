import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { getDb } from "@/server/db";
import { sheetIntegrations } from "@/server/db/schema";
import { exportSpaceToSheet } from "@/server/services/google-sheets-export-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const EXPORT_DATA_TYPE = "export";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId } = await params;

  try {
    const db = getDb();
    const [integration] = await db
      .select()
      .from(sheetIntegrations)
      .where(
        and(
          eq(sheetIntegrations.spaceId, spaceId),
          eq(sheetIntegrations.dataType, EXPORT_DATA_TYPE),
        ),
      )
      .limit(1);

    if (!integration) {
      return jsonError("연동된 익스포트 시트가 없습니다.", 404);
    }

    const result = await exportSpaceToSheet(
      spaceId,
      integration.sheetId,
      currentUser.id,
    );

    return NextResponse.json({
      exported: result.exported,
      lastSyncedAt: result.lastSyncedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("시트에 반영하지 못했습니다.", 500);
  }
}
