import type { CounselingRecordStatus } from "@yeon/api-contract/counseling-records";

import type { CounselingWorkspaceViewState } from "./types";

type TutorialPolicy = {
  mode: "disabled" | "empty" | "full";
  showTrigger: boolean;
};

export type CounselingWorkspaceSurface =
  | "space-gate"
  | "empty"
  | "recording"
  | "workspace";

export type CounselingWorkspaceUiPolicy = {
  surface: CounselingWorkspaceSurface;
  showMemberPanel: boolean;
  showCenterPanel: boolean;
  showSidebar: boolean;
  canToggleSidebar: boolean;
  tutorial: TutorialPolicy;
};

type CounselingWorkspaceUiPolicyParams = {
  spacesLoading: boolean;
  spaceCount: number;
  viewStateKind: CounselingWorkspaceViewState["kind"];
  hasSelectedMember: boolean;
  selectedRecordStatus: CounselingRecordStatus | null;
};

export function getCounselingWorkspaceUiPolicy(
  params: CounselingWorkspaceUiPolicyParams,
): CounselingWorkspaceUiPolicy {
  const hasNoSpaces = !params.spacesLoading && params.spaceCount === 0;
  const isWorkspaceViewState =
    params.viewStateKind === "processing" || params.viewStateKind === "ready";
  const showMemberPanel = params.hasSelectedMember && isWorkspaceViewState;
  const showCenterPanel = !showMemberPanel && isWorkspaceViewState;
  const showSidebar = isWorkspaceViewState;

  if (hasNoSpaces) {
    return {
      surface: "space-gate",
      showMemberPanel: false,
      showCenterPanel: false,
      showSidebar: false,
      canToggleSidebar: false,
      tutorial: { mode: "disabled", showTrigger: false },
    };
  }

  if (params.viewStateKind === "recording") {
    return {
      surface: "recording",
      showMemberPanel: false,
      showCenterPanel: false,
      showSidebar: false,
      canToggleSidebar: false,
      tutorial: { mode: "disabled", showTrigger: false },
    };
  }

  if (params.viewStateKind === "empty" && !params.hasSelectedMember) {
    return {
      surface: "empty",
      showMemberPanel: false,
      showCenterPanel: false,
      showSidebar: false,
      canToggleSidebar: false,
      tutorial: { mode: "disabled", showTrigger: false },
    };
  }

  return {
    surface: "workspace",
    showMemberPanel,
    showCenterPanel,
    showSidebar,
    canToggleSidebar: showSidebar,
    tutorial:
      params.viewStateKind === "ready" &&
      params.selectedRecordStatus === "ready" &&
      !showMemberPanel
        ? { mode: "full", showTrigger: true }
        : { mode: "disabled", showTrigger: false },
  };
}
