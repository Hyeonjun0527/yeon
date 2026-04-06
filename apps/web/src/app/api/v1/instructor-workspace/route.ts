import { instructorWorkspaceResponseSchema } from "@yeon/api-contract/instructor-workspace";
import { NextResponse } from "next/server";

import { getInstructorWorkspace } from "@/lib/instructor-workspace";

export async function GET() {
  const response = instructorWorkspaceResponseSchema.parse(
    getInstructorWorkspace(),
  );

  return NextResponse.json(response);
}
