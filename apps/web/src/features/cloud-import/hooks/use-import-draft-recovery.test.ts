// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useImportDraftRecovery } from "./use-import-draft-recovery";

type Snapshot = {
  id: string;
  status:
    | "uploaded"
    | "analyzing"
    | "analyzed"
    | "edited"
    | "imported"
    | "error";
};

describe("useImportDraftRecovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("초기 draftId를 복구하고 snapshot 적용 및 안내 문구를 세팅한다", async () => {
    const loadDraft = vi
      .fn<(_: string) => Promise<Snapshot | null>>()
      .mockResolvedValue({
        id: "draft-1",
        status: "analyzed",
      });
    const applySnapshot = vi.fn();

    const { result } = renderHook(() =>
      useImportDraftRecovery({
        storageKey: "yeon:test:draft",
        initialDraftId: "draft-1",
        analyzing: false,
        loadDraft,
        applySnapshot,
      }),
    );

    await waitFor(() =>
      expect(applySnapshot).toHaveBeenCalledWith({
        id: "draft-1",
        status: "analyzed",
      }),
    );

    expect(loadDraft).toHaveBeenCalledWith("draft-1");
    expect(result.current.draftId).toBe("draft-1");
    expect(result.current.recoveryNotice).toBe(
      "분석 결과를 복구했습니다. 이어서 검토하고 가져오세요.",
    );
    expect(localStorage.getItem("yeon:test:draft")).toBe("draft-1");
  });

  it("복구된 analyzing draft는 4초마다 polling 한다", async () => {
    const loadDraft = vi
      .fn<(_: string) => Promise<Snapshot | null>>()
      .mockResolvedValue({
        id: "draft-2",
        status: "analyzing",
      });
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    renderHook(() =>
      useImportDraftRecovery({
        storageKey: "yeon:test:polling",
        initialDraftId: "draft-2",
        analyzing: true,
        loadDraft,
        applySnapshot: vi.fn(),
      }),
    );

    await waitFor(() => expect(loadDraft).toHaveBeenCalled());
    await waitFor(() => expect(setIntervalSpy).toHaveBeenCalled());
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 4000);
  });

  it("복구 실패 시 저장된 draft 상태를 비운다", async () => {
    localStorage.setItem("yeon:test:clear", "draft-3");

    const { result } = renderHook(() =>
      useImportDraftRecovery({
        storageKey: "yeon:test:clear",
        analyzing: false,
        loadDraft: vi
          .fn<(_: string) => Promise<Snapshot | null>>()
          .mockResolvedValue(null),
        applySnapshot: vi.fn(),
      }),
    );

    await waitFor(() => expect(result.current.draftId).toBeNull());
    expect(result.current.recoveryNotice).toBeNull();
    expect(localStorage.getItem("yeon:test:clear")).toBeNull();
  });
});
