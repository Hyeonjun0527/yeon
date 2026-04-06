import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

const DATABASE_URL_ENV = "DATABASE_URL";

type GlobalDatabase = typeof globalThis & {
  yeonPgPool?: Pool;
  yeonDb?: NodePgDatabase<typeof schema>;
};

function getDatabaseUrl() {
  const databaseUrl = process.env[DATABASE_URL_ENV];

  if (!databaseUrl) {
    throw new Error(`${DATABASE_URL_ENV} 환경변수가 필요합니다.`);
  }

  return databaseUrl;
}

const globalDatabase = globalThis as GlobalDatabase;

export function getPool() {
  if (globalDatabase.yeonPgPool) {
    return globalDatabase.yeonPgPool;
  }

  const pool = new Pool({
    connectionString: getDatabaseUrl(),
  });

  if (process.env.NODE_ENV !== "production") {
    globalDatabase.yeonPgPool = pool;
  }

  return pool;
}

export function getDb() {
  if (globalDatabase.yeonDb) {
    return globalDatabase.yeonDb;
  }

  const db = drizzle({
    client: getPool(),
    schema,
  });

  if (process.env.NODE_ENV !== "production") {
    globalDatabase.yeonDb = db;
  }

  return db;
}
