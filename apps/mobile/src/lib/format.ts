export function formatRelativeTime(input: string) {
  const target = new Date(input).getTime();
  const diffMinutes = Math.max(0, Math.floor((Date.now() - target) / 60_000));

  if (diffMinutes < 1) {
    return "방금전";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}분전`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `${diffHours}시간전`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}일전`;
}

export function createInitials(label: string) {
  const trimmed = label.trim();

  if (!trimmed) {
    return "?";
  }

  return trimmed.slice(0, 2).toUpperCase();
}

export function parseOptionalString(value: string | string[] | undefined) {
  if (typeof value === "string") {
    return value;
  }

  return undefined;
}
