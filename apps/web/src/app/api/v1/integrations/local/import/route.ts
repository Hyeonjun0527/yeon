import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  jsonError,
  requireAuthenticatedUser,
} from "@/app/api/v1/counseling-records/_shared";
import { createSpace } from "@/server/services/spaces-service";
import { createMember } from "@/server/services/members-service";
import { ServiceError } from "@/server/services/service-error";

export const runtime = "nodejs";

const studentSchema = z.object({
  name: z.string().min(1),
  email: z.string().nullish(),
  phone: z.string().nullish(),
  status: z.string().nullish(),
});

const cohortSchema = z.object({
  name: z.string().min(1),
  students: z.array(studentSchema),
});

const bodySchema = z.object({
  cohorts: z.array(cohortSchema).min(1),
});

export async function POST(request: NextRequest) {
  const { currentUser, response } = await requireAuthenticatedUser(request);
  if (!currentUser) return response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문이 올바른 JSON 형식이 아닙니다.", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("요청 데이터가 올바르지 않습니다.", 400);
  }

  try {
    let spacesCreated = 0;
    let membersCreated = 0;

    for (const cohort of parsed.data.cohorts) {
      const space = await createSpace(currentUser.id, { name: cohort.name });
      spacesCreated++;

      for (const student of cohort.students) {
        await createMember(space.id, {
          name: student.name,
          email: student.email,
          phone: student.phone,
          status: student.status,
        });
        membersCreated++;
      }
    }

    return NextResponse.json(
      { created: { spaces: spacesCreated, members: membersCreated } },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }
    console.error(error);
    return jsonError("스페이스/수강생 생성에 실패했습니다.", 500);
  }
}
