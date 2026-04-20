export type StudentManagementLayoutSurface = "space-gate" | "workspace";

export type StudentManagementLayoutUiPolicy = {
  surface: StudentManagementLayoutSurface;
  showStudentShell: boolean;
  canToggleSidebar: boolean;
};

type StudentManagementLayoutUiPolicyParams = {
  spacesLoading: boolean;
  spaceCount: number;
};

export function getStudentManagementLayoutUiPolicy(
  params: StudentManagementLayoutUiPolicyParams,
): StudentManagementLayoutUiPolicy {
  const hasNoSpaces = !params.spacesLoading && params.spaceCount === 0;

  if (hasNoSpaces) {
    return {
      surface: "space-gate",
      showStudentShell: false,
      canToggleSidebar: false,
    };
  }

  return {
    surface: "workspace",
    showStudentShell: true,
    canToggleSidebar: true,
  };
}
