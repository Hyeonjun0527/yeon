import { createHash, randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import {
  deleteCounselingAudioObject,
  downloadCounselingAudioObject,
  downloadCounselingAudioObjectRange,
  uploadCounselingAudioObject,
} from "../src/server/services/counseling-record-audio-storage";

function loadEnvFiles() {
  const appRoot = path.resolve(__dirname, "..");
  const repoRoot = path.resolve(appRoot, "..", "..");
  const envCandidates = [
    path.join(repoRoot, ".env.local"),
    path.join(repoRoot, ".env"),
    path.join(appRoot, ".env.local"),
    path.join(appRoot, ".env"),
  ];

  for (const envPath of envCandidates) {
    if (!existsSync(envPath)) {
      continue;
    }

    dotenv.config({
      path: envPath,
      override: false,
    });
  }
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} 환경변수가 비어 있습니다.`);
  }

  return value;
}

async function main() {
  loadEnvFiles();

  const accountId = requireEnv("R2_ACCOUNT_ID");
  const bucketName = requireEnv("R2_BUCKET_NAME");
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    `https://${accountId}.r2.cloudflarestorage.com`;
  const testPayload = Buffer.from(
    [
      "yeon counseling audio storage test",
      `timestamp=${new Date().toISOString()}`,
      "purpose=upload-download-range-delete",
    ].join("\n"),
    "utf8",
  );
  const sha256 = createHash("sha256").update(testPayload).digest("hex");
  const objectKey = [
    "_integration-tests",
    "r2-storage",
    `${new Date().toISOString().slice(0, 10)}`,
    `${randomUUID()}.txt`,
  ].join("/");

  console.log("R2 storage integration test");
  console.log(`accountId=${accountId}`);
  console.log(`bucket=${bucketName}`);
  console.log(`endpoint=${endpoint}`);
  console.log(`objectKey=${objectKey}`);

  await uploadCounselingAudioObject({
    objectKey,
    bytes: testPayload,
    mimeType: "text/plain",
    sha256,
  });
  console.log(`upload=ok bytes=${testPayload.byteLength}`);

  const fullObject = await downloadCounselingAudioObject(objectKey);
  const fullText = fullObject.bytes.toString("utf8");

  if (fullText !== testPayload.toString("utf8")) {
    throw new Error("전체 다운로드 결과가 업로드 원문과 다릅니다.");
  }

  console.log(`download=ok bytes=${fullObject.bytes.byteLength}`);

  const rangedObject = await downloadCounselingAudioObjectRange({
    objectKey,
    rangeHeader: "bytes=0-15",
  });
  const expectedRangeText = testPayload.subarray(0, 16).toString("utf8");
  const actualRangeText = rangedObject.bytes.toString("utf8");

  if (actualRangeText !== expectedRangeText) {
    throw new Error("부분 다운로드 결과가 예상 범위와 다릅니다.");
  }

  console.log(
    `range=ok bytes=${rangedObject.bytes.byteLength} contentRange=${rangedObject.contentRange ?? "none"}`,
  );

  await deleteCounselingAudioObject(objectKey);
  console.log("delete=ok");
  console.log("passed=true");
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

  console.error(`R2 storage integration test failed: ${message}`);
  process.exitCode = 1;
});
