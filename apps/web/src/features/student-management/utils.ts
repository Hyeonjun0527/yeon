import { AVATAR_COLORS } from "./constants";
import type { Student, StudentStatus } from "./types";

/** 이름 해시 → 파스텔 배경색 */
export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** 이름에서 이니셜 추출 (한글: 마지막 글자, 영문: 첫 글자) */
export function getInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  // 한글이면 이름의 첫 글자
  if (/[가-힣]/.test(trimmed)) return trimmed[0];
  return trimmed[0].toUpperCase();
}

/** 학생 필터링 */
export function filterStudents(
  students: Student[],
  filters: {
    search?: string;
    status?: StudentStatus | "all";
    classId?: string | "all";
    tag?: string | "all";
  },
): Student[] {
  let result = students;

  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.school && s.school.toLowerCase().includes(q)) ||
        s.tags.some((t) => t.toLowerCase().includes(q)) ||
        s.memos.some((m) => m.text.toLowerCase().includes(q)),
    );
  }

  if (filters.status && filters.status !== "all") {
    result = result.filter((s) => s.status === filters.status);
  }

  if (filters.classId && filters.classId !== "all") {
    result = result.filter((s) => s.classIds.includes(filters.classId!));
  }

  if (filters.tag && filters.tag !== "all") {
    result = result.filter((s) => s.tags.includes(filters.tag!));
  }

  return result;
}

/** 학생 정렬 */
export function sortStudents(
  students: Student[],
  key: "name" | "registeredAt" | "status",
): Student[] {
  const sorted = [...students];
  sorted.sort((a, b) => {
    if (key === "name") return a.name.localeCompare(b.name, "ko");
    if (key === "registeredAt")
      return (
        new Date(b.registeredAt).getTime() -
        new Date(a.registeredAt).getTime()
      );
    return a.status.localeCompare(b.status);
  });
  return sorted;
}
