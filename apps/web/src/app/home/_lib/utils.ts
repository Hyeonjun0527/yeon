import {
  SIDEBAR_RECORDS,
  TRANSCRIPT,
} from "../../mockdata/app/_data/mock-data";
import type { RecordItem } from "./types";

export function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function fmtDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}분 ${String(s).padStart(2, "0")}초`;
}

const DEFAULT_AI_SUMMARY =
  "학원 일정(주 5회)으로 과제 시간 부족. 제출 기한을 익일 오전으로 조정하기로 합의. 2주 후 학습 루틴 재점검 예정.";

export function buildInitialRecords(): RecordItem[] {
  return SIDEBAR_RECORDS.filter((r) => r.status === "ready").map((r) => ({
    ...r,
    transcript: TRANSCRIPT,
    aiSummary: DEFAULT_AI_SUMMARY,
    aiMessages: [],
  }));
}

export function createTimestamp() {
  const now = new Date();
  return `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}
