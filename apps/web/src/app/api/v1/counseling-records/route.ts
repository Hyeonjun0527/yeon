import {
  counselingRecordDetailResponseSchema,
  listCounselingRecordsResponseSchema,
} from "@yeon/api-contract";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  createCounselingRecordAndQueueTranscription,
  listCounselingRecords,
} from "@/server/services/counseling-records-service";
import { ServiceError } from "@/server/services/service-error";

import { jsonError, requireAuthenticatedUser } from "./_shared";

export const runtime = "nodejs";

function parseOptionalDurationMs(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new ServiceError(400, "오디오 길이 값이 올바르지 않습니다.");
  }

  return Math.round(parsed);
}

export async function GET(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  try {
    const records = await listCounselingRecords(currentUser.id);

    return NextResponse.json(
      listCounselingRecordsResponseSchema.parse({
        records,
      }),
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("상담 기록 목록을 불러오지 못했습니다.", 500);
  }
}

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);

  if (!currentUser) {
    return response;
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("음성 업로드 요청 형식이 올바르지 않습니다.", 400);
  }

  const fileEntry = formData.get("audio");

  if (!(fileEntry instanceof File)) {
    return jsonError("업로드할 음성 파일이 필요합니다.", 400);
  }

  try {
    const record = await createCounselingRecordAndQueueTranscription({
      currentUser,
      file: fileEntry,
      studentName: String(formData.get("studentName") ?? ""),
      sessionTitle: String(formData.get("sessionTitle") ?? ""),
      counselingType: String(formData.get("counselingType") ?? ""),
      audioDurationMs: parseOptionalDurationMs(formData.get("audioDurationMs")),
      clientRequestId: request.headers.get("x-client-request-id"),
    });

    return NextResponse.json(
      counselingRecordDetailResponseSchema.parse({ record }),
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("상담 음성 업로드를 처리하지 못했습니다.", 500);
  }
}
