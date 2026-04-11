import type { StudentSpaceCreateStep } from "@/features/student-management/components/space-create-modal";

export type SpaceContextMenuState = {
  spaceId: string;
  spaceName: string;
  x: number;
  y: number;
} | null;

export type SpaceDialogTarget = {
  spaceId: string;
  spaceName: string;
};

export type SpaceSelectionState = {
  ids: string[];
  anchorId: string | null;
};

export type LocalImportDraftSummary = {
  id: string;
  status:
    | "uploaded"
    | "analyzing"
    | "analyzed"
    | "edited"
    | "imported"
    | "error";
  selectedFile: {
    name: string;
  };
  processingMessage: string | null;
  error: string | null;
  updatedAt: string;
  expiresAt: string;
};

export type CreateModalState = {
  open: boolean;
  initialStep: StudentSpaceCreateStep;
};
