import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

// 개발 전용 테스트 엔드포인트 — 프로덕션에서는 응답하지 않음
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, { status: 404 });
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["이름", "이메일", "트랙"],
    ["홍길동", "hong@example.com", "백엔드"],
    ["김철수", "kim@example.com", "프론트엔드"],
    ["이영희", "lee@example.com", "데이터"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");

  const buffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
  }) as Uint8Array;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'inline; filename="sample.xlsx"',
    },
  });
}
