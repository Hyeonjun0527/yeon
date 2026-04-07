import { existsSync } from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import { runOpenAiChatIntegrationTest } from "../src/server/services/openai-chat-test-service";

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

async function main() {
  loadEnvFiles();

  const result = await runOpenAiChatIntegrationTest();

  console.log("OpenAI chat integration test");
  console.log(`model=${result.model}`);
  console.log(`requestId=${result.requestId ?? "none"}`);
  console.log(`output=${result.outputText}`);
  console.log(`passed=${result.passed ? "true" : "false"}`);

  if (!result.passed) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  const message =
    error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";

  console.error(`OpenAI chat integration test failed: ${message}`);
  process.exitCode = 1;
});
