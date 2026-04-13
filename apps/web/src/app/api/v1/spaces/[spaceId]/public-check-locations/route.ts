import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { publicCheckLocationSearchResponseSchema } from "@yeon/api-contract";

import {
  jsonError,
  requireAuthenticatedUser,
  withHandler,
} from "@/app/api/v1/counseling-records/_shared";
import { searchPublicCheckLocations } from "@/server/services/public-check-location-search-service";
import { ServiceError } from "@/server/services/service-error";
import { assertSpaceOwnedByUser } from "@/server/services/student-board-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ spaceId: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  return withHandler(async () => {
    const { currentUser, response } = await requireAuthenticatedUser(request);

    if (!currentUser) {
      return response as Response;
    }

    const { spaceId } = await context.params;
    await assertSpaceOwnedByUser(currentUser.id, spaceId);

    const query = request.nextUrl.searchParams.get("query")?.trim() ?? "";

    if (!query) {
      return NextResponse.json(
        publicCheckLocationSearchResponseSchema.parse({ results: [] }),
      );
    }

    try {
      const data = await searchPublicCheckLocations(query);
      return NextResponse.json(
        publicCheckLocationSearchResponseSchema.parse(data),
      );
    } catch (error) {
      if (error instanceof ServiceError) {
        return jsonError(error.message, error.status);
      }

      throw error;
    }
  });
}
