import { existsSync, cpSync, rmSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";

const appRoot = process.cwd();
const distRoot = path.join(appRoot, ".next");
const standaloneRoot = path.join(distRoot, "standalone", "apps", "web");
const standaloneNextRoot = path.join(standaloneRoot, ".next");
const staticSourceRoot = path.join(distRoot, "static");
const staticTargetRoot = path.join(standaloneNextRoot, "static");
const publicSourceRoot = path.join(appRoot, "public");
const publicTargetRoot = path.join(standaloneRoot, "public");
const serverEntryPath = path.join(standaloneRoot, "server.js");

function ensurePathExists(targetPath, errorMessage) {
  if (!existsSync(targetPath)) {
    throw new Error(errorMessage);
  }
}

function syncDirectory(sourcePath, targetPath) {
  rmSync(targetPath, { recursive: true, force: true });
  cpSync(sourcePath, targetPath, { recursive: true });
}

ensurePathExists(
  serverEntryPath,
  "standalone 서버 엔트리를 찾지 못했습니다. 먼저 `pnpm --filter @yeon/web build`를 실행하세요.",
);
ensurePathExists(
  staticSourceRoot,
  "정적 청크 산출물을 찾지 못했습니다. 먼저 `pnpm --filter @yeon/web build`를 실행하세요.",
);

syncDirectory(staticSourceRoot, staticTargetRoot);

if (existsSync(publicSourceRoot)) {
  syncDirectory(publicSourceRoot, publicTargetRoot);
}

const child = spawn(process.execPath, [serverEntryPath], {
  stdio: "inherit",
  env: process.env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
