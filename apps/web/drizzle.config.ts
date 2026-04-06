import "dotenv/config";

import { defineConfig } from "drizzle-kit";

const DB_REQUIRED_COMMANDS = new Set([
  "migrate",
  "push",
  "pull",
  "studio",
  "up",
]);
const drizzleCommand = process.argv[2];
const databaseUrl = process.env.DATABASE_URL;

if (
  drizzleCommand &&
  DB_REQUIRED_COMMANDS.has(drizzleCommand) &&
  !databaseUrl
) {
  throw new Error("DATABASE_URL 환경변수가 필요합니다.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema/index.ts",
  out: "./src/server/db/migrations",
  ...(databaseUrl
    ? {
        dbCredentials: {
          url: databaseUrl,
        },
      }
    : {}),
});
