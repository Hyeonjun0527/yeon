// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useMemberDetail } from "./use-member-detail";

const replaceMock = vi.fn();
const useStudentManagementMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => "/home/student-management/member-1",
}));

vi.mock("../student-management-provider", () => ({
  useStudentManagement: () => useStudentManagementMock(),
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: queryClient },
      children,
    );
  };
}

describe("useMemberDetail", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    useStudentManagementMock.mockReturnValue({
      members: [
        {
          id: "member-1",
          spaceId: "space-1",
          name: "김민지",
        },
      ],
      selectedSpaceId: "space-1",
      setSelectedSpaceId: vi.fn(),
    });
    window.history.replaceState(
      null,
      "",
      "/home/student-management/member-1?tab=overview",
    );
  });

  it("초기 activeTab을 URL query에서 읽는다", () => {
    window.history.replaceState(
      null,
      "",
      "/home/student-management/member-1?tab=memos",
    );

    const { result } = renderHook(
      () => useMemberDetail({ memberId: "member-1" }),
      {
        wrapper: createWrapper(),
      },
    );

    expect(result.current.activeTab).toBe("memos");
  });

  it("탭 클릭 시 URL 라우터 반영 전에 activeTab이 즉시 바뀐다", async () => {
    const { result } = renderHook(
      () => useMemberDetail({ memberId: "member-1" }),
      {
        wrapper: createWrapper(),
      },
    );

    expect(result.current.activeTab).toBe("overview");

    act(() => {
      result.current.setActiveTab("counseling");
    });

    expect(result.current.activeTab).toBe("counseling");
    expect(replaceMock).toHaveBeenCalledWith(
      "/home/student-management/member-1?tab=counseling",
    );

    await waitFor(() => {
      expect(result.current.activeTab).toBe("counseling");
    });
  });

  it("외부 popstate로 URL의 tab이 바뀌면 activeTab을 다시 동기화한다", async () => {
    const { result } = renderHook(
      () => useMemberDetail({ memberId: "member-1" }),
      {
        wrapper: createWrapper(),
      },
    );

    act(() => {
      window.history.pushState(
        null,
        "",
        "/home/student-management/member-1?tab=report",
      );
      window.dispatchEvent(new PopStateEvent("popstate"));
    });

    await waitFor(() => {
      expect(result.current.activeTab).toBe("report");
    });
  });
});
