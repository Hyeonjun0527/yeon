import { and, asc, desc, eq, gte, lte, sql } from "drizzle-orm";

import {
  buildLifeOsReport,
  computeLifeOsDailyMetrics,
  computeLifeOsWeeklyMetrics,
  createEmptyLifeOsEntries,
  type LifeOsDayInput,
  type LifeOsHourEntry,
} from "@yeon/domain/life-os";
import type {
  LifeOsDayDto,
  LifeOsReportResponse,
  UpsertLifeOsDayBody,
} from "@yeon/api-contract/life-os";

import { getDb } from "@/server/db";
import { lifeOsDays } from "@/server/db/schema";
import { generatePublicId, ID_PREFIX } from "@/server/lib/public-id";

import { ServiceError } from "./service-error";

type LifeOsDayRow = typeof lifeOsDays.$inferSelect;

function normalizeEntries(entries: LifeOsHourEntry[]) {
  const byHour = new Map(entries.map((entry) => [entry.hour, entry]));

  return createEmptyLifeOsEntries().map((emptyEntry) => ({
    ...emptyEntry,
    ...byHour.get(emptyEntry.hour),
  }));
}

function toDayDto(row: LifeOsDayRow): LifeOsDayDto {
  return {
    id: row.publicId,
    localDate: row.localDate,
    timezone: row.timezone,
    mindset: row.mindset,
    backlogText: row.backlogText,
    entries: normalizeEntries(row.entries),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function buildEmptyDay(localDate: string): LifeOsDayDto {
  return {
    localDate,
    timezone: "Asia/Seoul",
    mindset: "",
    backlogText: "",
    entries: createEmptyLifeOsEntries(),
  };
}

async function findLifeOsDayRow(userId: string, localDate: string) {
  const [row] = await getDb()
    .select()
    .from(lifeOsDays)
    .where(
      and(
        eq(lifeOsDays.ownerUserId, userId),
        eq(lifeOsDays.localDate, localDate),
      ),
    )
    .limit(1);

  return row ?? null;
}

export async function listLifeOsDays(userId: string): Promise<LifeOsDayDto[]> {
  const rows = await getDb()
    .select()
    .from(lifeOsDays)
    .where(eq(lifeOsDays.ownerUserId, userId))
    .orderBy(desc(lifeOsDays.localDate))
    .limit(60);

  return rows.map(toDayDto);
}

export async function getLifeOsDay(
  userId: string,
  localDate: string,
): Promise<LifeOsDayDto> {
  const row = await findLifeOsDayRow(userId, localDate);
  return row ? toDayDto(row) : buildEmptyDay(localDate);
}

export async function upsertLifeOsDay(
  userId: string,
  body: UpsertLifeOsDayBody,
): Promise<LifeOsDayDto> {
  const normalizedEntries = normalizeEntries(body.entries);
  const now = new Date();

  const [row] = await getDb()
    .insert(lifeOsDays)
    .values({
      publicId: generatePublicId(ID_PREFIX.lifeOsDays),
      ownerUserId: userId,
      localDate: body.localDate,
      timezone: body.timezone,
      mindset: body.mindset,
      backlogText: body.backlogText,
      entries: normalizedEntries,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [lifeOsDays.ownerUserId, lifeOsDays.localDate],
      set: {
        timezone: sql`excluded.timezone`,
        mindset: sql`excluded.mindset`,
        backlogText: sql`excluded.backlog_text`,
        entries: sql`excluded.entries`,
        updatedAt: sql`excluded.updated_at`,
      },
    })
    .returning();

  if (!row) {
    throw new ServiceError(500, "Life OS 기록을 저장하지 못했습니다.");
  }

  return toDayDto(row);
}

export async function buildLifeOsDailyReport(
  userId: string,
  localDate: string,
): Promise<LifeOsReportResponse["report"]> {
  const day = await getLifeOsDay(userId, localDate);
  const metrics = computeLifeOsDailyMetrics({
    localDate: day.localDate,
    entries: day.entries,
  });

  return buildLifeOsReport({
    periodType: "daily",
    periodStart: localDate,
    periodEnd: localDate,
    metrics,
  });
}

export async function buildLifeOsWeeklyReport(
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<LifeOsReportResponse["report"]> {
  const rows = await getDb()
    .select()
    .from(lifeOsDays)
    .where(
      and(
        eq(lifeOsDays.ownerUserId, userId),
        gte(lifeOsDays.localDate, periodStart),
        lte(lifeOsDays.localDate, periodEnd),
      ),
    )
    .orderBy(asc(lifeOsDays.localDate));
  const days: LifeOsDayInput[] = rows.map((row) => ({
    localDate: row.localDate,
    timezone: row.timezone,
    mindset: row.mindset,
    backlogText: row.backlogText,
    entries: normalizeEntries(row.entries),
  }));
  const metrics = computeLifeOsWeeklyMetrics({ periodStart, periodEnd, days });

  return buildLifeOsReport({
    periodType: "weekly",
    periodStart,
    periodEnd,
    metrics,
  });
}
