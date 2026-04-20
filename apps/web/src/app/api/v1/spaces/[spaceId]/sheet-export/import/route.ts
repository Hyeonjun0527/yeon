import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { getDb } from "@/server/db";
import { sheetIntegrations } from "@/server/db/schema";
import {
  importSpaceFromLinkedSheet,
  type SheetImportResult,
} from "@/server/services/google-sheets-export-service";
import { ServiceError } from "@/server/services/service-error";
import { requireSpaceInternalIdByPublicId } from "@/server/services/spaces-service";

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
    const spaceInternalId = await requireSpaceInternalIdByPublicId(spaceId);
    const db = getDb();
    const [integration] = await db
      .select()
      .from(sheetIntegrations)
      .where(
        and(
          eq(sheetIntegrations.spaceId, spaceInternalId),
          eq(sheetIntegrations.dataType, EXPORT_DATA_TYPE),
        ),
      )
      .limit(1);

    if (!integration) {
      return jsonError(
        "연동된 시트가 없어 수강생 데이터를 가져올 수 없습니다.",
        404,
      );
    }

    const result = await importSpaceFromLinkedSheet(
      spaceId,
      integration.sheetId,
      currentUser.id,
    );

    return NextResponse.json(
      {
        status: result.status,
        summary: result.summary,
        conflicts: result.conflicts,
        lastSyncedAt: result.lastSyncedAt?.toISOString() ?? null,
      } satisfies Omit<SheetImportResult, "lastSyncedAt"> & {
        lastSyncedAt: string | null;
      },
      { status: result.status === "blocked" ? 409 : 200 },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError(
      "연동된 시트에서 수강생 데이터를 가져오지 못했습니다.",
      500,
    );
  }
}
