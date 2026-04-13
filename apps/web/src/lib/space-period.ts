const SPACE_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function normalizeSpaceDateInput(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function isSpaceDateString(value: string) {
  if (!SPACE_DATE_REGEX.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function compareSpaceDateStrings(left: string, right: string) {
  return left.localeCompare(right);
}

export function getSpacePeriodInputError(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  const normalizedStartDate = normalizeSpaceDateInput(startDate);
  const normalizedEndDate = normalizeSpaceDateInput(endDate);

  if (!normalizedStartDate && !normalizedEndDate) {
    return null;
  }

  if (!normalizedStartDate || !normalizedEndDate) {
    return "진행기간을 입력하려면 시작일과 종료일을 모두 선택해 주세요.";
  }

  if (
    !isSpaceDateString(normalizedStartDate) ||
    !isSpaceDateString(normalizedEndDate)
  ) {
    return "진행기간 날짜 형식이 올바르지 않습니다.";
  }

  if (compareSpaceDateStrings(normalizedEndDate, normalizedStartDate) < 0) {
    return "종료일은 시작일보다 빠를 수 없습니다.";
  }

  return null;
}

function formatSpaceDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${year}.${month}.${day}.`;
}

export function formatSpacePeriodLabel(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
) {
  const normalizedStartDate = normalizeSpaceDateInput(startDate);
  const normalizedEndDate = normalizeSpaceDateInput(endDate);

  if (!normalizedStartDate && !normalizedEndDate) {
    return null;
  }

  if (normalizedStartDate && normalizedEndDate) {
    return `${formatSpaceDate(normalizedStartDate)} ~ ${formatSpaceDate(normalizedEndDate)}`;
  }

  if (normalizedStartDate) {
    return `시작 ${formatSpaceDate(normalizedStartDate)}`;
  }

  return `종료 ${formatSpaceDate(normalizedEndDate as string)}`;
}
