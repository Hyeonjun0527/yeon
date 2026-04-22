import { errorResponseSchema } from "@yeon/api-contract/error";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import {
  CHAT_SERVICE_SESSION_COOKIE_NAME,
  getChatServiceAuthByToken,
} from "@/server/services/chat-service/auth-service";
import { ServiceError } from "@/server/services/service-error";

export function jsonChatServiceError(message: string, status: number) {
  return NextResponse.json(errorResponseSchema.parse({ message }), { status });
}

export function getChatServiceSessionToken(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (authorization?.startsWith("Bearer ")) {
    return authorization.slice("Bearer ".length);
  }

  return request.cookies.get(CHAT_SERVICE_SESSION_COOKIE_NAME)?.value ?? null;
}

export async function requireChatServiceAuth(request: NextRequest) {
  const sessionToken = getChatServiceSessionToken(request);
  const auth = await getChatServiceAuthByToken(sessionToken);

  if (!auth || !sessionToken) {
    throw new ServiceError(401, "chat-service 로그인이 필요합니다.");
  }

  return {
    sessionToken,
    profile: auth.profile,
  };
}

export async function parseJsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    throw new ServiceError(400, "요청 본문 JSON 형식이 올바르지 않습니다.");
  }
}

export function clearChatServiceSessionCookie(response: NextResponse) {
  response.cookies.set(CHAT_SERVICE_SESSION_COOKIE_NAME, "", {
    expires: new Date(0),
    path: "/",
  });
}
