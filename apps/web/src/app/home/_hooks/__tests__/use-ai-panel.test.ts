// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAiPanel } from "../use-ai-panel";

describe("useAiPanel", () => {
  it("기록이 선택되지 않으면 패널이 강제로 닫히고 다시 선택되면 기존 열린 상태를 복원한다", () => {
    const { result, rerender } = renderHook(
      ({ hasSelectedRecord }: { hasSelectedRecord: boolean }) =>
        useAiPanel({ hasSelectedRecord }),
      {
        initialProps: { hasSelectedRecord: true },
      },
    );

    expect(result.current.collapsed).toBe(false);
    expect(result.current.canExpand).toBe(true);

    rerender({ hasSelectedRecord: false });

    expect(result.current.collapsed).toBe(true);
    expect(result.current.canExpand).toBe(false);

    act(() => {
      result.current.expand();
      result.current.toggleCollapsed();
    });

    expect(result.current.collapsed).toBe(true);

    rerender({ hasSelectedRecord: true });

    expect(result.current.collapsed).toBe(false);
    expect(result.current.canExpand).toBe(true);
  });

  it("사용자가 직접 접어둔 상태는 기록 재선택 이후에도 유지된다", () => {
    const { result, rerender } = renderHook(
      ({ hasSelectedRecord }: { hasSelectedRecord: boolean }) =>
        useAiPanel({ hasSelectedRecord }),
      {
        initialProps: { hasSelectedRecord: true },
      },
    );

    act(() => {
      result.current.toggleCollapsed();
    });

    expect(result.current.collapsed).toBe(true);

    rerender({ hasSelectedRecord: false });
    expect(result.current.collapsed).toBe(true);

    rerender({ hasSelectedRecord: true });
    expect(result.current.collapsed).toBe(true);
  });
});
