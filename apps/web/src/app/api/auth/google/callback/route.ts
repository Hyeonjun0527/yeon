import type { NextRequest } from "next/server";

import { socialProviders } from "@/server/auth/constants";
import { completeSocialAuth } from "@/server/auth/handlers";

export async function GET(request: NextRequest) {
  return completeSocialAuth(request, socialProviders.google);
}
