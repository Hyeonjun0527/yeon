import fs from "node:fs";

import { analyzeBuffer } from "../src/server/services/file-analysis-service";

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    throw new Error("filePath 인자가 필요합니다.");
  }

  const buffer = fs.readFileSync(filePath);
  const result = await analyzeBuffer(
    buffer,
    filePath.split("/").pop() ?? "test.xlsx",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "spreadsheet",
  );

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
