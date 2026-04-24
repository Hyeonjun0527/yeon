#!/usr/bin/env node
// schema ↔ migration drift 감지.
// drizzle-kit generate를 임시 이름으로 실행해 새 SQL이 생성되면 drift 있음.
// 생성된 임시 파일/journal 변경은 반드시 원복한다.

import { execSync } from "node:child_process";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  unlinkSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = join(
  __dirname,
  "..",
  "src",
  "server",
  "db",
  "migrations",
);
const META_DIR = join(MIGRATIONS_DIR, "meta");
const JOURNAL = join(META_DIR, "_journal.json");
const SENTINEL = `_drift_check_${Date.now()}`;

function snapshot(dir) {
  return new Set(readdirSync(dir));
}

const sqlBefore = snapshot(MIGRATIONS_DIR);
const metaBefore = snapshot(META_DIR);
const journalBefore = readFileSync(JOURNAL, "utf8");

let generateError = null;
try {
  execSync(`pnpm drizzle-kit generate --name=${SENTINEL}`, {
    cwd: join(__dirname, ".."),
    stdio: "pipe",
  });
} catch (e) {
  generateError = e;
}

const newSqls = readdirSync(MIGRATIONS_DIR).filter(
  (f) => !sqlBefore.has(f),
);
const newMetas = readdirSync(META_DIR).filter((f) => !metaBefore.has(f));

for (const f of newSqls) {
  try {
    unlinkSync(join(MIGRATIONS_DIR, f));
  } catch {
    // 이미 삭제됐거나 접근 불가 — 무시하고 나머지 정리 계속
  }
}
for (const f of newMetas) {
  try {
    unlinkSync(join(META_DIR, f));
  } catch {
    // 이미 삭제됐거나 접근 불가 — 무시하고 나머지 정리 계속
  }
}
writeFileSync(JOURNAL, journalBefore);

if (generateError) {
  console.error("[drift-check] drizzle-kit generate 실행 실패");
  const stdout = generateError.stdout?.toString() ?? "";
  const stderr = generateError.stderr?.toString() ?? "";
  if (stdout) console.error(stdout);
  if (stderr) console.error(stderr);
  process.exit(1);
}

if (newSqls.length > 0) {
  console.error(
    "\n❌ Schema drift 감지: schema 파일이 마이그레이션보다 앞서 있습니다.",
  );
  console.error("   누락된 마이그레이션 내용:");
  for (const f of newSqls) {
    console.error(`    - ${f.replace(SENTINEL, "<설명적 이름>")}`);
  }
  console.error(
    "\n   해결: pnpm --filter @yeon/web db:generate --name=<설명적 이름>",
  );
  console.error(
    "         그리고 생성된 SQL을 검토·commit 하세요.\n",
  );
  process.exit(1);
}

console.log("✅ Schema drift 없음");
