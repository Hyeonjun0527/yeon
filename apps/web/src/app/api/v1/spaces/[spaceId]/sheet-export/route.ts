import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { getDb } from "@/server/db";
import { sheetIntegrations } from "@/server/db/schema";
import { extractSheetId } from "@/server/services/google-sheets-export-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const EXPORT_DATA_TYPE = "export";

const createExportBodySchema = z.object({
  sheetUrl: z.string().url(),
});

async function getExportIntegration(spaceId: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(sheetIntegrations)
    .where(
      and(
        eq(sheetIntegrations.spaceId, spaceId),
        eq(sheetIntegrations.dataType, EXPORT_DATA_TYPE),
      ),
    )
    .limit(1);
  return row ?? null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId } = await params;

  try {
    const integration = await getExportIntegration(spaceId);
    return NextResponse.json({ integration });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("시트 익스포트 설정을 불러오지 못했습니다.", 500);
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

  const parsed = createExportBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);
  }

  try {
    const sheetId = extractSheetId(parsed.data.sheetUrl);
    const db = getDb();
    const now = new Date();

    const existing = await getExportIntegration(spaceId);

    let integration: typeof sheetIntegrations.$inferSelect;

    if (existing) {
      const [updated] = await db
        .update(sheetIntegrations)
        .set({
          sheetUrl: parsed.data.sheetUrl,
          sheetId,
          lastSyncedAt: null,
          updatedAt: now,
        })
        .where(eq(sheetIntegrations.id, existing.id))
        .returning();
      integration = updated;
    } else {
      const [created] = await db
        .insert(sheetIntegrations)
        .values({
          spaceId,
          sheetUrl: parsed.data.sheetUrl,
          sheetId,
          dataType: EXPORT_DATA_TYPE,
          columnMapping: null,
          updatedAt: now,
        })
        .returning();
      integration = created;
    }

    return NextResponse.json({ integration }, { status: 201 });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("시트 익스포트 연동을 저장하지 못했습니다.", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId } = await params;

  try {
    const db = getDb();
    await db
      .delete(sheetIntegrations)
      .where(
        and(
          eq(sheetIntegrations.spaceId, spaceId),
          eq(sheetIntegrations.dataType, EXPORT_DATA_TYPE),
        ),
      );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("시트 익스포트 연동을 해제하지 못했습니다.", 500);
  }
}
