import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

const SAMPLE_FILE_NAME = "스페이스_통합_수강생_현업.xlsx";

function getSampleFileCandidates() {
  return [
    path.resolve(
      /* turbopackIgnore: true */ process.cwd(),
      "space-test-data",
      SAMPLE_FILE_NAME,
    ),
    path.resolve(
      /* turbopackIgnore: true */ process.cwd(),
      "..",
      "..",
      "space-test-data",
      SAMPLE_FILE_NAME,
    ),
  ];
}

async function resolveSampleFilePath() {
  for (const candidate of getSampleFileCandidates()) {
    try {
      await access(candidate);
      return candidate;
    } catch {
      // 다음 후보를 확인한다.
    }
  }

  throw new Error("테스트 데이터 파일을 찾지 못했습니다.");
}

export async function GET() {
  try {
    const filePath = await resolveSampleFilePath();
    const buffer = await readFile(filePath);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(SAMPLE_FILE_NAME)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "테스트 데이터 파일을 내려받지 못했습니다.",
      },
      { status: 404 },
    );
  }
}
