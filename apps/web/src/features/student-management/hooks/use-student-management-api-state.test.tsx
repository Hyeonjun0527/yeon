// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useStudentManagementApiState } from "./use-student-management-api-state";

const replaceMock = vi.fn();
const pathnameState = {
  value: "/counseling-service/student-management",
};
const searchState = {
  value: "spaceId=space-2",
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: replaceMock,
  }),
  usePathname: () => pathnameState.value,
  useSearchParams: () => new URLSearchParams(searchState.value),
}));

vi.mock("@/lib/app-route-context", () => ({
  useAppRoute: () => ({
    normalizeAppPathname: (pathname: string) => pathname,
    resolveApiHref: (href: string) => href,
    resolveAppHref: (href: string) => href,
  }),
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

function createJsonResponse(payload: unknown) {
  return {
    ok: true,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as Response;
}

describe("useStudentManagementApiState", () => {
  beforeEach(() => {
    replaceMock.mockReset();
    pathnameState.value = "/counseling-service/student-management";
    searchState.value = "spaceId=space-2";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);

        if (url === "/api/v1/spaces") {
          return createJsonResponse({
            spaces: [
              {
                id: "space-1",
                name: "1기",
                createdAt: "",
                updatedAt: "",
              },
              {
                id: "space-2",
                name: "2기",
                createdAt: "",
                updatedAt: "",
              },
              {
                id: "space-3",
                name: "3기",
                createdAt: "",
                updatedAt: "",
              },
            ],
          });
        }

        const membersMatch = url.match(/^\/api\/v1\/spaces\/([^/]+)\/members$/);
        if (membersMatch) {
          return createJsonResponse({
            members: [
              {
                id: `member-${membersMatch[1]}`,
                spaceId: membersMatch[1],
                name: "김민지",
                status: "active",
                createdAt: "",
                updatedAt: "",
              },
            ],
          });
        }

        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("스페이스 클릭 직후 selectedSpaceId를 optimistic하게 갱신한다", async () => {
    const { result } = renderHook(() => useStudentManagementApiState(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.selectedSpaceId).toBe("space-2");
    });

    act(() => {
      result.current.setSelectedSpaceId("space-3");
    });

    expect(result.current.selectedSpaceId).toBe("space-3");
    expect(replaceMock).toHaveBeenCalledWith(
      "/counseling-service/student-management?spaceId=space-3",
    );
  });

  it("query가 없으면 첫 스페이스를 선택하고 URL에 즉시 반영한다", async () => {
    searchState.value = "";

    const { result } = renderHook(() => useStudentManagementApiState(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.selectedSpaceId).toBe("space-1");
    });

    expect(replaceMock).toHaveBeenCalledWith(
      "/counseling-service/student-management?spaceId=space-1",
    );
  });

  it("현재 선택한 스페이스를 유지한 채 query 없는 하위 route로 이동하면 같은 spaceId를 다시 반영한다", async () => {
    searchState.value = "spaceId=space-3";

    const { result, rerender } = renderHook(
      () => useStudentManagementApiState(),
      {
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => {
      expect(result.current.selectedSpaceId).toBe("space-3");
    });

    pathnameState.value = "/counseling-service/student-management/members/new";
    searchState.value = "";
    rerender();

    await waitFor(() => {
      expect(result.current.selectedSpaceId).toBe("space-3");
    });

    expect(replaceMock).toHaveBeenLastCalledWith(
      "/counseling-service/student-management/members/new?spaceId=space-3",
    );
  });

  it("상세 route에서 query가 없으면 첫 스페이스로 섣불리 보정하지 않는다", async () => {
    pathnameState.value = "/counseling-service/student-management/member-1";
    searchState.value = "";

    const { result } = renderHook(() => useStudentManagementApiState(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.spacesLoading).toBe(false);
    });

    expect(result.current.selectedSpaceId).toBeNull();
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
