import type { NextRequest } from "next/server";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { buildSpaceExportData } from "@/server/services/google-sheets-export-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

function toCsvRow(cells: string[]): string {
  return cells
    .map((cell) => {
      const s = String(cell);
      if (s.includes('"') || s.includes(",") || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    })
    .join(",");
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId } = await params;

  try {
    const { values } = await buildSpaceExportData(spaceId);

    // Excel에서 한글이 깨지지 않도록 UTF-8 BOM 추가
    const BOM = "\uFEFF";
    const csv = BOM + values.map(toCsvRow).join("\r\n");

    const filename = encodeURIComponent(`수강생_${spaceId}.csv`);

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("CSV 내보내기에 실패했습니다.", 500);
  }
}
