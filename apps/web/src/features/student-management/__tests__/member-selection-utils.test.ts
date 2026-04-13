import { describe, expect, it } from "vitest";

import {
  createSelectAllState,
  getOrderedSelectedMemberIds,
  pruneMemberSelection,
  resolveMemberCardPrimaryAction,
  resolveMemberContextSelection,
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

describe("resolveMemberCardPrimaryAction", () => {
  it("선택 모드가 아니면 shift 클릭도 상세 열람으로 본다", () => {
    expect(
      resolveMemberCardPrimaryAction({
        selectedCount: 0,
        shiftKey: true,
      }),
    ).toBe("open-detail");
  });

  it("선택 모드에서는 shift 클릭을 범위 선택으로 본다", () => {
    expect(
      resolveMemberCardPrimaryAction({
        selectedCount: 2,
        shiftKey: true,
      }),
    ).toBe("range-select");
  });

  it("ctrl/cmd 클릭은 항상 토글 선택으로 본다", () => {
    expect(
      resolveMemberCardPrimaryAction({
        selectedCount: 0,
        ctrlKey: true,
      }),
    ).toBe("toggle-select");
    expect(
      resolveMemberCardPrimaryAction({
        selectedCount: 3,
        metaKey: true,
      }),
    ).toBe("toggle-select");
  });
});

describe("getOrderedSelectedMemberIds", () => {
  it("현재 화면 순서대로 선택된 수강생 id를 반환한다", () => {
    expect(
      getOrderedSelectedMemberIds(["c", "a", "b", "d"], new Set(["b", "c"])),
    ).toEqual(["c", "b"]);
  });
});

describe("resolveMemberContextSelection", () => {
  it("현재 선택 안의 항목을 우클릭하면 기존 선택을 유지한다", () => {
    const result = resolveMemberContextSelection(
      {
        selectedIds: new Set(["b", "d"]),
        anchorId: "b",
      },
      {
        memberId: "d",
        visibleMemberIds: ["a", "b", "c", "d"],
      },
    );

    expect(Array.from(result.selectedIds)).toEqual(["b", "d"]);
    expect(result.anchorId).toBe("b");
  });

  it("선택 밖 항목을 우클릭하면 그 항목 1명만 선택으로 바꾼다", () => {
    const result = resolveMemberContextSelection(
      {
        selectedIds: new Set(["b", "d"]),
        anchorId: "b",
      },
      {
        memberId: "c",
        visibleMemberIds: ["a", "b", "c", "d"],
      },
    );

    expect(Array.from(result.selectedIds)).toEqual(["c"]);
    expect(result.anchorId).toBe("c");
  });
});
