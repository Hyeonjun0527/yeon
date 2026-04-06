import { healthResponseSchema } from "@yeon/api-contract";
import { NextResponse } from "next/server";

export async function GET() {
  const response = healthResponseSchema.parse({
    status: "ok",
    service: "web",
    timestamp: new Date().toISOString(),
  });

  return NextResponse.json(response);
}
