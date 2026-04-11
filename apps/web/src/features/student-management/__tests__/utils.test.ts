import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fmtDate,
  fmtRelative,
  getAvatarColor,
  getInitial,
  filterStudents,
  sortStudents,
} from "../utils";
import type { Student } from "../types";

vi.mock("../constants", () => ({
  AVATAR_COLORS: [
    "color-0",
    "color-1",
    "color-2",
    "color-3",
    "color-4",
    "color-5",
    "color-6",
    "color-7",
    "color-8",
    "color-9",
  ],
}));

/* ─────────────────────────────────────────────
   헬퍼: 최소 Student 픽스처
───────────────────────────────────────────── */
function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: "s1",
    name: "홍길동",
    grade: "1기",
    status: "enrolled",
    registeredAt: "2024-01-01T00:00:00.000Z",
    tags: [],
    classIds: [],
    guardians: [],
    memos: [],
    counselingHistory: [],
    courseHistory: [],
    ...overrides,
  };
}

/* ─────────────────────────────────────────────
   fmtDate
───────────────────────────────────────────── */
describe("fmtDate", () => {
  it("ISO 날짜를 ko-KR 형식으로 변환한다", () => {
    const result = fmtDate("2024-03-15T00:00:00.000Z");
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/03/);
    expect(result).toMatch(/15/);
  });

  it("년/월/일 세 요소가 모두 포함된다", () => {
    const result = fmtDate("2025-12-31T00:00:00.000Z");
    expect(result).toMatch(/2025/);
    expect(result).toMatch(/12/);
    expect(result).toMatch(/31/);
  });

  it("2000년대 초반 날짜를 처리한다", () => {
    const result = fmtDate("2000-01-01T00:00:00.000Z");
    expect(result).toMatch(/2000/);
  });

  it("월이 두 자리 패딩으로 표시된다", () => {
    const result = fmtDate("2024-06-05T00:00:00.000Z");
    expect(result).toMatch(/06/);
  });

  it("문자열을 반환한다", () => {
    const result = fmtDate("2024-01-01T00:00:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

/* ─────────────────────────────────────────────
   fmtRelative
───────────────────────────────────────────── */
describe("fmtRelative", () => {
  const NOW = new Date("2024-06-15T12:00:00.000Z").getTime();

  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("오늘(0일 차이)은 '오늘'을 반환한다", () => {
    expect(fmtRelative("2024-06-15T06:00:00.000Z")).toBe("오늘");
  });

  it("어제(1일 차이)는 '어제'를 반환한다", () => {
    expect(fmtRelative("2024-06-14T12:00:00.000Z")).toBe("어제");
  });

  it("2일 전은 '2일 전'을 반환한다", () => {
    expect(fmtRelative("2024-06-13T12:00:00.000Z")).toBe("2일 전");
  });

  it("6일 전은 '6일 전'을 반환한다", () => {
    expect(fmtRelative("2024-06-09T12:00:00.000Z")).toBe("6일 전");
  });

  it("7일 전은 '1주 전'을 반환한다", () => {
    expect(fmtRelative("2024-06-08T12:00:00.000Z")).toBe("1주 전");
  });

  it("14일 전은 '2주 전'을 반환한다", () => {
    expect(fmtRelative("2024-06-01T12:00:00.000Z")).toBe("2주 전");
  });

  it("30일 전은 '1개월 전'을 반환한다", () => {
    expect(fmtRelative("2024-05-16T12:00:00.000Z")).toBe("1개월 전");
  });
});

/* ─────────────────────────────────────────────
   getAvatarColor
───────────────────────────────────────────── */
describe("getAvatarColor", () => {
  it("반환값은 AVATAR_COLORS 배열 내 값이다", () => {
    const colors = [
      "color-0",
      "color-1",
      "color-2",
      "color-3",
      "color-4",
      "color-5",
      "color-6",
      "color-7",
      "color-8",
      "color-9",
    ];
    expect(colors).toContain(getAvatarColor("홍길동"));
  });

  it("같은 이름은 항상 같은 색을 반환한다", () => {
    expect(getAvatarColor("김철수")).toBe(getAvatarColor("김철수"));
  });

  it("다른 이름은 다를 수 있다 (해시 분산 확인)", () => {
    const results = new Set(
      [
        "김철수",
        "이영희",
        "박민준",
        "최지수",
        "정하늘",
        "윤서연",
        "조현우",
        "강다은",
        "임준혁",
        "오지현",
      ].map(getAvatarColor),
    );
    // 10개 이름이 모두 같은 색일 확률은 극히 낮다
    expect(results.size).toBeGreaterThan(1);
  });

  it("빈 문자열도 오류 없이 처리한다", () => {
    expect(() => getAvatarColor("")).not.toThrow();
    const colors = [
      "color-0",
      "color-1",
      "color-2",
      "color-3",
      "color-4",
      "color-5",
      "color-6",
      "color-7",
      "color-8",
      "color-9",
    ];
    expect(colors).toContain(getAvatarColor(""));
  });

  it("영문 이름도 AVATAR_COLORS 내 값을 반환한다", () => {
    const colors = [
      "color-0",
      "color-1",
      "color-2",
      "color-3",
      "color-4",
      "color-5",
      "color-6",
      "color-7",
      "color-8",
      "color-9",
    ];
    expect(colors).toContain(getAvatarColor("Alice"));
  });
});

/* ─────────────────────────────────────────────
   getInitial
───────────────────────────────────────────── */
describe("getInitial", () => {
  it("한글 이름의 첫 글자를 반환한다", () => {
    expect(getInitial("홍길동")).toBe("홍");
  });

  it("영문 이름의 첫 글자를 대문자로 반환한다", () => {
    expect(getInitial("Alice")).toBe("A");
  });

  it("영문 소문자 이름의 첫 글자를 대문자로 반환한다", () => {
    expect(getInitial("bob")).toBe("B");
  });

  it("공백만 있는 문자열은 '?'를 반환한다", () => {
    expect(getInitial("   ")).toBe("?");
  });

  it("빈 문자열은 '?'를 반환한다", () => {
    expect(getInitial("")).toBe("?");
  });

  it("한글로 시작하는 혼합 문자열은 첫 한글을 반환한다", () => {
    expect(getInitial("홍Alice")).toBe("홍");
  });

  it("영문으로 시작하는 혼합 문자열은 첫 글자(소문자)를 반환한다", () => {
    // 문자열에 한글이 포함되어 있으면 한글 분기로 진입해 trimmed[0]을 그대로 반환한다
    expect(getInitial("alice홍")).toBe("a");
  });
});

/* ─────────────────────────────────────────────
   filterStudents
───────────────────────────────────────────── */
describe("filterStudents", () => {
  const students: Student[] = [
    makeStudent({
      id: "s1",
      name: "홍길동",
      school: "서울대",
      tags: ["우수"],
      status: "enrolled",
      classIds: ["c1"],
      memos: [{ id: "m1", date: "2024-01-01", text: "성적 우수" }],
    }),
    makeStudent({
      id: "s2",
      name: "김철수",
      school: "연세대",
      tags: ["주의"],
      status: "on_leave",
      classIds: ["c2"],
      memos: [],
    }),
    makeStudent({
      id: "s3",
      name: "이영희",
      school: "고려대",
      tags: ["우수", "개근"],
      status: "graduated",
      classIds: ["c1", "c3"],
      memos: [],
    }),
    makeStudent({
      id: "s4",
      name: "박민준",
      school: undefined,
      tags: [],
      status: "withdrawn",
      classIds: ["c3"],
      memos: [{ id: "m2", date: "2024-02-01", text: "출석 불량" }],
    }),
  ];

  it("검색어가 이름에 매칭되는 경우 필터링한다", () => {
    const result = filterStudents(students, { search: "홍" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  it("검색어가 school에 매칭되는 경우 필터링한다", () => {
    const result = filterStudents(students, { search: "연세" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s2");
  });

  it("검색어가 tags에 매칭되는 경우 필터링한다", () => {
    const result = filterStudents(students, { search: "개근" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s3");
  });

  it("검색어가 memos.text에 매칭되는 경우 필터링한다", () => {
    const result = filterStudents(students, { search: "출석" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s4");
  });

  it("status 필터가 'all'이면 전체를 반환한다", () => {
    const result = filterStudents(students, { status: "all" });
    expect(result).toHaveLength(4);
  });

  it("status 필터로 특정 상태만 반환한다", () => {
    const result = filterStudents(students, { status: "enrolled" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s1");
  });

  it("classId 필터로 특정 반 수강생만 반환한다", () => {
    const result = filterStudents(students, { classId: "c3" });
    expect(result).toHaveLength(2);
    const ids = result.map((s) => s.id);
    expect(ids).toContain("s3");
    expect(ids).toContain("s4");
  });

  it("tag 필터로 특정 태그 보유 수강생만 반환한다", () => {
    const result = filterStudents(students, { tag: "우수" });
    expect(result).toHaveLength(2);
    const ids = result.map((s) => s.id);
    expect(ids).toContain("s1");
    expect(ids).toContain("s3");
  });

  it("search + status 복합 필터가 AND 조건으로 동작한다", () => {
    const result = filterStudents(students, {
      search: "이영희",
      status: "graduated",
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("s3");
  });

  it("필터가 없으면 원본 배열을 그대로 반환한다", () => {
    const result = filterStudents(students, {});
    expect(result).toHaveLength(4);
  });
});

/* ─────────────────────────────────────────────
   sortStudents
───────────────────────────────────────────── */
describe("sortStudents", () => {
  const students: Student[] = [
    makeStudent({
      id: "s1",
      name: "홍길동",
      registeredAt: "2024-03-01T00:00:00.000Z",
      status: "on_leave",
    }),
    makeStudent({
      id: "s2",
      name: "가나다",
      registeredAt: "2024-01-01T00:00:00.000Z",
      status: "enrolled",
    }),
    makeStudent({
      id: "s3",
      name: "마바사",
      registeredAt: "2024-05-01T00:00:00.000Z",
      status: "withdrawn",
    }),
  ];

  it("name 키로 가나다순 정렬한다", () => {
    const result = sortStudents(students, "name");
    expect(result[0].name).toBe("가나다");
    expect(result[1].name).toBe("마바사");
    expect(result[2].name).toBe("홍길동");
  });

  it("registeredAt 키로 최신순(내림차순) 정렬한다", () => {
    const result = sortStudents(students, "registeredAt");
    expect(result[0].id).toBe("s3"); // 2024-05
    expect(result[1].id).toBe("s1"); // 2024-03
    expect(result[2].id).toBe("s2"); // 2024-01
  });

  it("status 키로 알파벳 오름차순 정렬한다", () => {
    const result = sortStudents(students, "status");
    const statuses = result.map((s) => s.status);
    const sorted = [...statuses].sort((a, b) => a.localeCompare(b));
    expect(statuses).toEqual(sorted);
  });

  it("정렬은 원본 배열을 변경하지 않는다", () => {
    const original = students.map((s) => s.id);
    sortStudents(students, "name");
    expect(students.map((s) => s.id)).toEqual(original);
  });

  it("단일 요소 배열을 정렬해도 오류가 없다", () => {
    const single = [makeStudent({ name: "유일한" })];
    expect(() => sortStudents(single, "name")).not.toThrow();
    expect(sortStudents(single, "name")).toHaveLength(1);
  });
});
