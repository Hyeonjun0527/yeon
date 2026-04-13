import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SAMPLE_FILE_PATH = "/test-data/space-import-sample.xlsx";

export async function GET(request: NextRequest) {
  return NextResponse.redirect(
    new URL(SAMPLE_FILE_PATH, request.nextUrl.origin),
    307,
  );
}
