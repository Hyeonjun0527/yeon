import {
  counselingRecordDetailResponseSchema,
  listCounselingRecordsResponseSchema,
} from "@yeon/api-contract/counseling-records";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  createCounselingRecordAndQueueTranscription,
  createTextMemoRecord,
  listCounselingRecords,
  listCounselingRecordsBySpace,
  listUnlinkedCounselingRecords,
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

  const { searchParams } = new URL(request.url);
  const spaceId = searchParams.get("spaceId");
  const unlinked = searchParams.get("unlinked") === "true";

  try {
    let records;

    if (spaceId) {
      records = await listCounselingRecordsBySpace(currentUser.id, spaceId);
    } else if (unlinked) {
      records = await listUnlinkedCounselingRecords(currentUser.id);
    } else {
      records = await listCounselingRecords(currentUser.id);
    }

    return NextResponse.json(
      listCounselingRecordsResponseSchema.parse({ records }),
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

  /* 텍스트 메모 분기 */
  if (formData.get("recordType") === "text_memo") {
    const sessionTitle = String(formData.get("sessionTitle") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();

    if (!sessionTitle) return jsonError("메모 제목을 입력해 주세요.", 400);
    if (!content) return jsonError("메모 내용을 입력해 주세요.", 400);

    try {
      const record = await createTextMemoRecord({
        currentUser,
        sessionTitle,
        content,
        counselingType: String(formData.get("counselingType") ?? ""),
      });
      return NextResponse.json(
        counselingRecordDetailResponseSchema.parse({ record }),
        { status: 201 },
      );
    } catch (error) {
      if (error instanceof ServiceError) return jsonError(error.message, error.status);
      console.error(error);
      return jsonError("텍스트 메모 생성에 실패했습니다.", 500);
    }
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
