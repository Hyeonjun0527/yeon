import type { NextRequest } from "next/server";

import { socialProviders } from "@/server/auth/constants";
import { startSocialAuth } from "@/server/auth/handlers";

export async function GET(request: NextRequest) {
  return startSocialAuth(request, socialProviders.google);
}
