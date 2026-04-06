import { instructorDashboardResponseSchema } from "@yeon/api-contract";
import { NextResponse } from "next/server";

import { getInstructorDashboard } from "@/lib/instructor-dashboard";

export async function GET() {
  const response = instructorDashboardResponseSchema.parse(
    getInstructorDashboard(),
  );

  return NextResponse.json(response);
}
