import { asc, eq } from "drizzle-orm";

import { getDb } from "@/server/db";
import { users } from "@/server/db/schema";

export type UserRow = typeof users.$inferSelect;
export type InsertUserRow = typeof users.$inferInsert;

export async function listUserRows() {
  return getDb().select().from(users).orderBy(asc(users.createdAt));
}

export async function findUserRowByEmail(email: string) {
  const [user] = await getDb()
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function insertUserRow(input: InsertUserRow) {
  const [user] = await getDb().insert(users).values(input).returning();

  return user;
}
