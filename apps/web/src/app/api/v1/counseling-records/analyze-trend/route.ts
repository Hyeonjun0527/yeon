import type { NextRequest } from "next/server";

import { getMultipleRecordsWithSegments } from "@/server/services/counseling-records-service";
import { streamTrendAnalysis } from "@/server/services/counseling-ai-service";
import { ServiceError } from "@/server/services/service-error";

import { jsonError, requireAuthenticatedUser } from "../_shared";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  let body: { recordIds?: unknown };

  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문 형식이 올바르지 않습니다.", 400);
  }

  const { recordIds } = body;

  if (
    !Array.isArray(recordIds) ||
    recordIds.length === 0 ||
    !recordIds.every((id) => typeof id === "string")
  ) {
    return jsonError("recordIds는 문자열 배열이어야 합니다.", 400);
  }

  try {
    const records = await getMultipleRecordsWithSegments(
      currentUser.id,
      recordIds as string[],
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
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("추이 분석에 실패했습니다.", 500);
  }
}
