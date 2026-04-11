import type { NextRequest } from "next/server";
import * as XLSX from "xlsx";

import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { buildSpaceExportData } from "@/server/services/google-sheets-export-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const EXPORT_SHEET_NAME = "수강생";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  const { spaceId } = await params;

  try {
    const { values } = await buildSpaceExportData(spaceId);

    const worksheet = XLSX.utils.aoa_to_sheet(values);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, EXPORT_SHEET_NAME);

    const buffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    }) as Uint8Array;
    const body = Buffer.from(buffer);

    const filename = encodeURIComponent(`수강생_${spaceId}.xlsx`);

    return new Response(body, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("엑셀 다운로드에 실패했습니다.", 500);
  }
}
