import { describe, expect, it } from "vitest";

import { getHomeWorkspaceUiPolicy } from "../home-workspace-ui-policy";

describe("getHomeWorkspaceUiPolicy", () => {
  it("스페이스가 없으면 space-gate surface를 반환한다", () => {
    expect(
      getHomeWorkspaceUiPolicy({
        spacesLoading: false,
        spaceCount: 0,
        viewStateKind: "empty",
        hasSelectedMember: false,
        selectedRecordStatus: null,
      }),
    ).toMatchObject({
      surface: "space-gate",
      showSidebar: false,
      canToggleSidebar: false,
      tutorial: { mode: "disabled", showTrigger: false },
    });
  });

  it("녹음 중이면 recording surface를 반환한다", () => {
    expect(
      getHomeWorkspaceUiPolicy({
        spacesLoading: true,
        spaceCount: 0,
        viewStateKind: "recording",
        hasSelectedMember: false,
        selectedRecordStatus: null,
      }),
    ).toMatchObject({
      surface: "recording",
      showSidebar: false,
      showCenterPanel: false,
    });
  });

  it("상담기록이 없고 선택된 수강생도 없으면 empty surface를 반환한다", () => {
    expect(
      getHomeWorkspaceUiPolicy({
        spacesLoading: false,
        spaceCount: 2,
        viewStateKind: "empty",
        hasSelectedMember: false,
        selectedRecordStatus: null,
      }),
    ).toMatchObject({
      surface: "empty",
      showSidebar: false,
      showMemberPanel: false,
      showCenterPanel: false,
    });
  });

  it("ready 기록이 열려 있으면 workspace와 full 튜토리얼 정책을 반환한다", () => {
    expect(
      getHomeWorkspaceUiPolicy({
        spacesLoading: false,
        spaceCount: 2,
        viewStateKind: "ready",
        hasSelectedMember: false,
        selectedRecordStatus: "ready",
      }),
    ).toMatchObject({
      surface: "workspace",
      showSidebar: true,
      showCenterPanel: true,
      canToggleSidebar: true,
      tutorial: { mode: "full", showTrigger: true },
    });
  });

  it("수강생 패널이 열려 있으면 center panel 튜토리얼을 끈다", () => {
    expect(
      getHomeWorkspaceUiPolicy({
        spacesLoading: false,
        spaceCount: 2,
        viewStateKind: "ready",
        hasSelectedMember: true,
        selectedRecordStatus: "ready",
      }),
    ).toMatchObject({
      surface: "workspace",
      showSidebar: true,
      showMemberPanel: true,
      showCenterPanel: false,
      tutorial: { mode: "disabled", showTrigger: false },
    });
  });
});
