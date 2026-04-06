import {
  createUserBodySchema,
  createUserResponseSchema,
  errorResponseSchema,
  listUsersResponseSchema,
} from "@yeon/api-contract";
import { NextResponse } from "next/server";

import { ServiceError } from "@/server/services/service-error";
import { createUser, listUsers } from "@/server/services/users-service";

function jsonError(message: string, status: number) {
  return NextResponse.json(errorResponseSchema.parse({ message }), { status });
}

export async function GET() {
  try {
    const users = await listUsers();

    return NextResponse.json(listUsersResponseSchema.parse({ users }));
  } catch (error) {
    console.error(error);
    return jsonError("사용자 목록을 불러오지 못했습니다.", 500);
  }
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return jsonError("요청 본문 JSON 형식이 올바르지 않습니다.", 400);
  }

  const parseResult = createUserBodySchema.safeParse(body);

  if (!parseResult.success) {
    return jsonError("사용자 생성 요청 값이 올바르지 않습니다.", 400);
  }

  try {
    const user = await createUser(parseResult.data);

    return NextResponse.json(
      createUserResponseSchema.parse({ user }),
      {
        status: 201,
      },
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return jsonError(error.message, error.status);
    }

    console.error(error);
    return jsonError("사용자를 생성하지 못했습니다.", 500);
  }
}
