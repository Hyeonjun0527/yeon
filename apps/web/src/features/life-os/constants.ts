import type { LifeOsBlockKey, LifeOsCategory, LifeOsHourEntry } from "./types";

export const LIFE_OS_HOURS = Array.from({ length: 24 }, (_, hour) => hour);

export const LIFE_OS_HOUR_BLOCKS: Array<{
  key: LifeOsBlockKey;
  label: string;
  hours: number[];
}> = [
  { key: "0-7", label: "0–7", hours: LIFE_OS_HOURS.slice(0, 8) },
  { key: "8-15", label: "8–15", hours: LIFE_OS_HOURS.slice(8, 16) },
  { key: "16-23", label: "16–23", hours: LIFE_OS_HOURS.slice(16, 24) },
];

export const LIFE_OS_ACTIVE_CATEGORIES = new Set<LifeOsCategory>([
  "deep_work",
  "learning",
  "admin",
  "meeting",
  "exercise",
]);

export const LIFE_OS_CATEGORY_KEYWORDS: Record<LifeOsCategory, string[]> = {
  deep_work: ["코딩", "개발", "구현", "리팩토링", "설계", "pr", "버그", "디버깅"],
  learning: ["공부", "학습", "강의", "시험", "문제", "sql", "코테", "독서"],
  admin: ["정리", "메일", "서류", "신청", "예약", "문서", "회의준비"],
  meeting: ["회의", "미팅", "통화", "상담", "인터뷰"],
  rest: ["휴식", "잠", "수면", "낮잠", "쉬기", "멍", "유튜브"],
  meal: ["밥", "식사", "점심", "저녁", "아침", "카페"],
  movement: ["이동", "지하철", "버스", "운전", "산책"],
  exercise: ["운동", "헬스", "러닝", "스트레칭"],
  social: ["친구", "가족", "약속", "커뮤니티"],
  other: [],
};

export function createEmptyLifeOsEntries(): LifeOsHourEntry[] {
  return LIFE_OS_HOURS.map((hour) => ({
    hour,
    goalText: "",
    actionText: "",
    goalCategory: null,
    actionCategory: null,
    note: "",
  }));
}
