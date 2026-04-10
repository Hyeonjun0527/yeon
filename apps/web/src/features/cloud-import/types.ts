import type { FileKind } from "./file-kind";

export type CloudProvider = "onedrive" | "googledrive";

export type FolderEntry = { id: string | undefined; name: string };

export interface DriveFile {
  id: string;
  name: string;
  size: number;
  lastModifiedAt: string;
  mimeType?: string;
  isFolder: boolean;
  isSpreadsheet: boolean;
  isImage: boolean;
  fileKind: FileKind;
}

export interface ImportStudent {
  name: string;
  email?: string | null;
  phone?: string | null;
  status?: string | null;
}

export interface ImportCohort {
  name: string;
  students: ImportStudent[];
}

export interface ImportPreview {
  cohorts: ImportCohort[];
}

export interface ImportResult {
  spaces: number;
  members: number;
}

export interface ChatMessage {
  role: "user" | "ai";
  text: string;
  id: string | number;
}

/** ImportRightPanel과 useLocalImport가 공유하는 최소 인터페이스 */
export interface ImportHook {
  selectedFile: DriveFile | null;
  fileProxyUrl: string | null;
  analyzing: boolean;
  streamingText: string | null;
  editablePreview: ImportPreview | null;
  importing: boolean;
  importResult: ImportResult | null;
  error: string | null;
  chatMessages: ChatMessage[];
  analyzeSelectedFile: () => Promise<void>;
  updatePreview: (preview: ImportPreview) => void;
  confirmImport: () => Promise<void>;
  selectFileForPreview: (file: DriveFile) => void;
  deselectFile: () => void;
  refineWithInstruction: (instruction: string) => Promise<void>;
}
