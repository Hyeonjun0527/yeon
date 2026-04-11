import { describe, expect, it } from "vitest";

import {
  createSelectAllState,
  pruneMemberSelection,
  resolveMemberSelection,
} from "../member-selection-utils";

describe("pruneMemberSelection", () => {
  it("보이는 항목만 선택 상태에 남긴다", () => {
    const result = pruneMemberSelection(
      {
        selectedIds: new Set(["a", "b", "c"]),
        anchorId: "b",
      },
      ["b", "d"],
    );

    expect(Array.from(result.selectedIds)).toEqual(["b"]);
    expect(result.anchorId).toBe("b");
  });

  it("anchor가 사라지면 null로 초기화한다", () => {
    const result = pruneMemberSelection(
      {
        selectedIds: new Set(["a", "b"]),
        anchorId: "a",
      },
      ["b", "c"],
    );

    expect(Array.from(result.selectedIds)).toEqual(["b"]);
    expect(result.anchorId).toBeNull();
  });
});

describe("resolveMemberSelection", () => {
  it("일반 선택은 해당 항목만 추가하고 anchor를 갱신한다", () => {
    const result = resolveMemberSelection(
      {
        selectedIds: new Set(["a"]),
        anchorId: "a",
      },
      {
        memberId: "c",
        visibleMemberIds: ["a", "b", "c"],
      },
    );

    expect(Array.from(result.selectedIds)).toEqual(["a", "c"]);
    expect(result.anchorId).toBe("c");
  });

  it("shift 선택은 anchor와 현재 항목 사이를 모두 선택한다", () => {
    const result = resolveMemberSelection(
      {
        selectedIds: new Set(["b"]),
        anchorId: "b",
      },
      {
        memberId: "d",
        visibleMemberIds: ["a", "b", "c", "d", "e"],
        shiftKey: true,
      },
    );

    expect(Array.from(result.selectedIds)).toEqual(["b", "c", "d"]);
    expect(result.anchorId).toBe("d");
  });

  it("shouldSelect=false면 해당 항목을 해제한다", () => {
    const result = resolveMemberSelection(
      {
        selectedIds: new Set(["a", "b"]),
        anchorId: "a",
      },
      {
        memberId: "b",
        visibleMemberIds: ["a", "b", "c"],
        shouldSelect: false,
      },
    );

    expect(Array.from(result.selectedIds)).toEqual(["a"]);
    expect(result.anchorId).toBe("b");
  });
});

describe("createSelectAllState", () => {
  it("전체 선택 상태를 만든다", () => {
    const result = createSelectAllState(["a", "b", "c"], false);

    expect(Array.from(result.selectedIds)).toEqual(["a", "b", "c"]);
    expect(result.anchorId).toBe("a");
  });

  it("전체 해제 상태를 만든다", () => {
    const result = createSelectAllState(["a", "b", "c"], true);

    expect(Array.from(result.selectedIds)).toEqual([]);
    expect(result.anchorId).toBeNull();
  });
});
