import { describe, expect, it } from "vitest";

import { getStudentManagementLayoutUiPolicy } from "../student-management-layout-ui-policy";

describe("getStudentManagementLayoutUiPolicy", () => {
  it("스페이스 로딩 중에는 workspace shell을 유지한다", () => {
    expect(
      getStudentManagementLayoutUiPolicy({
        spacesLoading: true,
        spaceCount: 0,
      }),
    ).toMatchObject({
      surface: "workspace",
      showStudentShell: true,
      canToggleSidebar: true,
    });
  });

  it("스페이스가 없으면 space-gate surface를 반환한다", () => {
    expect(
      getStudentManagementLayoutUiPolicy({
        spacesLoading: false,
        spaceCount: 0,
      }),
    ).toMatchObject({
      surface: "space-gate",
      showStudentShell: false,
      canToggleSidebar: false,
    });
  });

  it("스페이스가 있으면 workspace shell을 반환한다", () => {
    expect(
      getStudentManagementLayoutUiPolicy({
        spacesLoading: false,
        spaceCount: 3,
      }),
    ).toMatchObject({
      surface: "workspace",
      showStudentShell: true,
      canToggleSidebar: true,
    });
  });
});
