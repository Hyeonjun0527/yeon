import { contestOverviewResponseSchema } from "@yeon/api-contract/contest";
import { NextResponse } from "next/server";

import { getContestOverview } from "@/lib/contest-overview";

export async function GET() {
  const response = contestOverviewResponseSchema.parse(getContestOverview());

  return NextResponse.json(response);
}
