import { z } from "zod";
import type { NextRequest } from "next/server";

import { getMultipleRecordsWithSegments } from "@/server/services/counseling-records-service";
import { streamTrendAnalysis } from "@/server/services/counseling-ai-service";

import { jsonError, requireAuthenticatedUser, withHandler } from "../_shared";

export const runtime = "nodejs";

const analyzeTrendBodySchema = z.object({
  recordIds: z.array(z.string()).min(1, "recordIds는 비어 있을 수 없습니다."),
});

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return jsonError("요청 본문 형식이 올바르지 않습니다.", 400);
  }

  const parsed = analyzeTrendBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "잘못된 요청입니다.",
      400,
    );
  }

  const { recordIds } = parsed.data;

  return withHandler(async () => {
    const records = await getMultipleRecordsWithSegments(
      currentUser.id,
      recordIds,
    );

    if (records.length === 0) {
      return jsonError("분석할 기록이 없습니다.", 400);
    }

    const studentName = records[0].studentName;
    const stream = await streamTrendAnalysis(studentName, records);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  });
}
