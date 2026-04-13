import QRCode from "qrcode";
import type { NextRequest } from "next/server";
import { publicCheckEntrySchema } from "@yeon/api-contract";
import { NextResponse } from "next/server";

import { jsonError } from "@/app/api/v1/counseling-records/_shared";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const { token } = await context.params;
  const parsedEntry = publicCheckEntrySchema.safeParse(
    request.nextUrl.searchParams.get("entry"),
  );
  const entry = parsedEntry.success ? parsedEntry.data : "qr";
  const publicUrl = `${request.nextUrl.origin}/check/${token}?entry=${entry}`;

  try {
    const svg = await QRCode.toString(publicUrl, {
      type: "svg",
      width: 960,
      margin: 1,
      color: {
        dark: "#111113",
        light: "#ffffff",
      },
    });

    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Content-Disposition": `attachment; filename="public-check-${entry}.svg"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    console.error(error);
    return jsonError("QR 이미지를 생성하지 못했습니다.", 500);
  }
}
