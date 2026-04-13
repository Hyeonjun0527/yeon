import type { StudentBoardDailyCell } from "@yeon/api-contract";

export const STUDENT_BOARD_GRASS_DAY_LABELS = [
  "",
  "월",
  "",
  "수",
  "",
  "금",
  "",
];

export type StudentBoardGrassWeek = Date[];

export function parseStudentBoardGrassDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function addUtcDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getUtcWeekStart(date: Date) {
  return addUtcDays(date, -date.getUTCDay());
}

function getUtcWeekEnd(date: Date) {
  return addUtcDays(date, 6 - date.getUTCDay());
}

function getMonthLabel(date: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

export function buildStudentBoardGrassCalendar(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  const parsedStartDate = parseStudentBoardGrassDate(startDate);
  const parsedEndDate = parseStudentBoardGrassDate(endDate);
  const today = new Date();
  const fallbackEnd = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const rangeStart = parsedStartDate ?? addUtcDays(fallbackEnd, -83);
  const rangeEnd = parsedEndDate ?? fallbackEnd;
  const calendarStart = getUtcWeekStart(rangeStart);
  const calendarEnd = getUtcWeekEnd(rangeEnd);
  const weeks: StudentBoardGrassWeek[] = [];

  for (
    let cursor = calendarStart;
    cursor.getTime() <= calendarEnd.getTime();
    cursor = addUtcDays(cursor, 7)
  ) {
    weeks.push(
      Array.from({ length: 7 }, (_, index) => addUtcDays(cursor, index)),
    );
  }

  const monthHeaders = weeks.map((week, index) => {
    const weekMonthKey = `${week[0]?.getUTCFullYear()}-${week[0]?.getUTCMonth()}`;
    const previousWeek = weeks[index - 1];
    const previousMonthKey = previousWeek
      ? `${previousWeek[0]?.getUTCFullYear()}-${previousWeek[0]?.getUTCMonth()}`
      : null;

    return previousMonthKey === weekMonthKey
      ? ""
      : getMonthLabel(week[0] as Date);
  });

  return { weeks, monthHeaders };
}

export function buildStudentBoardDailyCellDateMap(
  dailyCells: StudentBoardDailyCell[],
) {
  const latestByDate = new Map<string, StudentBoardDailyCell>();

  for (const cell of dailyCells) {
    const current = latestByDate.get(cell.date);

    if (!current || (current.occurredAt ?? "") < (cell.occurredAt ?? "")) {
      latestByDate.set(cell.date, cell);
    }
  }

  return latestByDate;
}

export function toStudentBoardGrassDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function isStudentBoardGrassDateInRange(params: {
  date: Date;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
}) {
  const { date, startDate, endDate } = params;
  const parsedStartDate = parseStudentBoardGrassDate(startDate);

  if (!parsedStartDate) {
    return false;
  }

  const parsedEndDate =
    parseStudentBoardGrassDate(endDate) ??
    new Date(
      Date.UTC(
        new Date().getUTCFullYear(),
        new Date().getUTCMonth(),
        new Date().getUTCDate(),
      ),
    );

  return (
    date.getTime() >= parsedStartDate.getTime() &&
    date.getTime() <= parsedEndDate.getTime()
  );
}

export function getStudentBoardGrassHalfTone(params: {
  item: StudentBoardDailyCell | null;
  half: "attendance" | "assignment";
  inRange: boolean;
}) {
  const { item, half, inRange } = params;

  if (!inRange) {
    return half === "attendance"
      ? "bg-[rgba(255,255,255,0.06)]"
      : "bg-[rgba(255,255,255,0.04)]";
  }

  if (!item) {
    return half === "attendance"
      ? "bg-[rgba(255,255,255,0.14)]"
      : "bg-[rgba(255,255,255,0.10)]";
  }

  if (half === "attendance") {
    if (item.attendanceStatus === "present") {
      return "bg-[rgba(99,102,241,0.80)]";
    }

    if (item.attendanceStatus === "absent") {
      return "bg-[rgba(244,63,94,0.78)]";
    }
  }

  if (half === "assignment") {
    if (item.assignmentStatus === "done") {
      return "bg-[rgba(99,102,241,0.54)]";
    }

    if (item.assignmentStatus === "not_done") {
      return "bg-[rgba(245,158,11,0.72)]";
    }
  }

  return half === "attendance"
    ? "bg-[rgba(255,255,255,0.12)]"
    : "bg-[rgba(255,255,255,0.08)]";
}
