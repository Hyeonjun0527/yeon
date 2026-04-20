import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fmtTime,
  fmtDuration,
  fmtMs,
  createTimestamp,
  fmtRelativeDate,
  fmtDurationMs,
} from "../utils";

// ---------------------------------------------------------------------------
// fmtTime
// ---------------------------------------------------------------------------
describe("fmtTime", () => {
  it("0초 → 00:00", () => {
    expect(fmtTime(0)).toBe("00:00");
  });

  it("59초 → 00:59", () => {
    expect(fmtTime(59)).toBe("00:59");
  });

  it("60초 → 01:00", () => {
    expect(fmtTime(60)).toBe("01:00");
  });

  it("61초 → 01:01", () => {
    expect(fmtTime(61)).toBe("01:01");
  });

  it("3661초 → 61:01 (분이 두 자리 이상)", () => {
    expect(fmtTime(3661)).toBe("61:01");
  });

  it("3599초 → 59:59", () => {
    expect(fmtTime(3599)).toBe("59:59");
  });

  it("1초 → 00:01 (초 패딩)", () => {
    expect(fmtTime(1)).toBe("00:01");
  });

  it("600초 → 10:00", () => {
    expect(fmtTime(600)).toBe("10:00");
  });
});

// ---------------------------------------------------------------------------
// fmtDuration
// ---------------------------------------------------------------------------
describe("fmtDuration", () => {
  it("0초 → '0분 00초'", () => {
    expect(fmtDuration(0)).toBe("0분 00초");
  });

  it("59초 → '0분 59초'", () => {
    expect(fmtDuration(59)).toBe("0분 59초");
  });

  it("60초 → '1분 00초'", () => {
    expect(fmtDuration(60)).toBe("1분 00초");
  });

  it("61초 → '1분 01초'", () => {
    expect(fmtDuration(61)).toBe("1분 01초");
  });

  it("3661초 → '61분 01초'", () => {
    expect(fmtDuration(3661)).toBe("61분 01초");
  });

  it("90초 → '1분 30초'", () => {
    expect(fmtDuration(90)).toBe("1분 30초");
  });

  it("1초 → '0분 01초' (초 패딩 확인)", () => {
    expect(fmtDuration(1)).toBe("0분 01초");
  });

  it("3600초 → '60분 00초'", () => {
    expect(fmtDuration(3600)).toBe("60분 00초");
  });
});

// ---------------------------------------------------------------------------
// fmtMs
// ---------------------------------------------------------------------------
describe("fmtMs", () => {
  it("null → '0:00'", () => {
    expect(fmtMs(null)).toBe("0:00");
  });

  it("음수 → '0:00'", () => {
    expect(fmtMs(-1)).toBe("0:00");
  });

  it("-9999 → '0:00'", () => {
    expect(fmtMs(-9999)).toBe("0:00");
  });

  it("0ms → '0:00'", () => {
    expect(fmtMs(0)).toBe("0:00");
  });

  it("999ms → '0:00' (1초 미만 버림)", () => {
    expect(fmtMs(999)).toBe("0:00");
  });

  it("1000ms → '0:01'", () => {
    expect(fmtMs(1000)).toBe("0:01");
  });

  it("59000ms → '0:59'", () => {
    expect(fmtMs(59000)).toBe("0:59");
  });

  it("60000ms → '1:00'", () => {
    expect(fmtMs(60000)).toBe("1:00");
  });

  it("61000ms → '1:01'", () => {
    expect(fmtMs(61000)).toBe("1:01");
  });

  it("3661000ms → '61:01'", () => {
    expect(fmtMs(3661000)).toBe("61:01");
  });

  it("3599000ms → '59:59'", () => {
    expect(fmtMs(3599000)).toBe("59:59");
  });
});

// ---------------------------------------------------------------------------
// createTimestamp
// ---------------------------------------------------------------------------
describe("createTimestamp", () => {
  const TIMESTAMP_PATTERN = /^\d{4}\.\d{2}\.\d{2} \d{2}:\d{2}$/;

  it("반환 형식이 YYYY.MM.DD HH:mm 패턴", () => {
    expect(createTimestamp()).toMatch(TIMESTAMP_PATTERN);
  });

  it("월·일·시·분이 두 자리로 패딩됨", () => {
    // 2023-01-05 03:07 처럼 한 자리 숫자가 나오는 날짜로 고정해 검증
    vi.setSystemTime(new Date("2023-01-05T03:07:00"));
    expect(createTimestamp()).toBe("2023.01.05 03:07");
    vi.useRealTimers();
  });

  it("현재 날짜 기준 연도·월·일 값이 실제 Date 와 일치", () => {
    const fixed = new Date("2025-11-20T14:55:00");
    vi.setSystemTime(fixed);
    const result = createTimestamp();
    expect(result).toBe("2025.11.20 14:55");
    vi.useRealTimers();
  });

  it("자정(00:00)도 올바르게 포맷", () => {
    vi.setSystemTime(new Date("2024-06-15T00:00:00"));
    expect(createTimestamp()).toBe("2024.06.15 00:00");
    vi.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// fmtRelativeDate
// ---------------------------------------------------------------------------
describe("fmtRelativeDate", () => {
  beforeEach(() => {
    // 기준 날짜: 2025-04-11 12:00:00 UTC
    vi.setSystemTime(new Date("2025-04-11T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("같은 날(오늘) → '오늘'", () => {
    expect(fmtRelativeDate("2025-04-11T08:00:00.000Z")).toBe("오늘");
  });

  it("같은 날 현재 시각 직전 → '오늘'", () => {
    expect(fmtRelativeDate("2025-04-11T00:00:00.000Z")).toBe("오늘");
  });

  it("1일 전 → '어제'", () => {
    expect(fmtRelativeDate("2025-04-10T12:00:00.000Z")).toBe("어제");
  });

  it("2일 전 → '2일 전'", () => {
    expect(fmtRelativeDate("2025-04-09T12:00:00.000Z")).toBe("2일 전");
  });

  it("3일 전 → '3일 전'", () => {
    expect(fmtRelativeDate("2025-04-08T12:00:00.000Z")).toBe("3일 전");
  });

  it("6일 전 → '6일 전' (7일 미만 경계)", () => {
    expect(fmtRelativeDate("2025-04-05T12:00:00.000Z")).toBe("6일 전");
  });

  it("7일 전 → 날짜 형식 'YYYY.MM.DD'", () => {
    expect(fmtRelativeDate("2025-04-04T12:00:00.000Z")).toBe("2025.04.04");
  });

  it("30일 전 → 날짜 형식 반환", () => {
    expect(fmtRelativeDate("2025-03-12T12:00:00.000Z")).toBe("2025.03.12");
  });

  it("1년 전 → 날짜 형식 반환", () => {
    expect(fmtRelativeDate("2024-04-11T12:00:00.000Z")).toBe("2024.04.11");
  });

  it("날짜 포맷이 YYYY.MM.DD 패턴인지 regex 검증", () => {
    const result = fmtRelativeDate("2020-06-05T00:00:00.000Z");
    expect(result).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });
});

// ---------------------------------------------------------------------------
// fmtDurationMs
// ---------------------------------------------------------------------------
describe("fmtDurationMs", () => {
  it("null → '분석 중'", () => {
    expect(fmtDurationMs(null)).toBe("분석 중");
  });

  it("0 → '분석 중' (falsy 값)", () => {
    expect(fmtDurationMs(0)).toBe("분석 중");
  });

  it("60000ms → '1분 00초'", () => {
    expect(fmtDurationMs(60000)).toBe("1분 00초");
  });

  it("3661000ms → '61분 01초'", () => {
    expect(fmtDurationMs(3661000)).toBe("61분 01초");
  });

  it("1000ms → '0분 01초'", () => {
    expect(fmtDurationMs(1000)).toBe("0분 01초");
  });

  it("90000ms → '1분 30초'", () => {
    expect(fmtDurationMs(90000)).toBe("1분 30초");
  });

  it("999ms → '0분 00초' (1초 미만 버림)", () => {
    expect(fmtDurationMs(999)).toBe("0분 00초");
  });

  it("3600000ms → '60분 00초'", () => {
    expect(fmtDurationMs(3600000)).toBe("60분 00초");
  });
});
