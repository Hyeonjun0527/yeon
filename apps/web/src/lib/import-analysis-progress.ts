export const IMPORT_ANALYSIS_STAGES = [
  "queued",
  "downloading_source",
  "loading_bytes",
  "parsing_file",
  "extracting_rows",
  "ai_mapping",
  "applying_refinement",
  "building_preview",
  "preview_ready",
  "importing",
  "completed",
  "error",
] as const;

export type ImportAnalysisStage = (typeof IMPORT_ANALYSIS_STAGES)[number];

export interface ImportAnalysisProgressState {
  stage: ImportAnalysisStage;
  progress: number;
  message: string;
}

export const IMPORT_ANALYSIS_CHECKLIST = [
  { label: "업로드 준비" },
  { label: "파일 읽기" },
  { label: "구조 해석" },
  { label: "학생 추출" },
  { label: "미리보기 가공" },
  { label: "완료 준비" },
] as const;

const IMPORT_ANALYSIS_STAGE_TO_STEP: Record<ImportAnalysisStage, number> = {
  queued: 0,
  downloading_source: 0,
  loading_bytes: 1,
  parsing_file: 2,
  extracting_rows: 3,
  ai_mapping: 3,
  applying_refinement: 4,
  building_preview: 4,
  preview_ready: 5,
  importing: 5,
  completed: 5,
  error: 0,
};

const DEFAULT_IMPORT_ANALYSIS_PROGRESS: Record<ImportAnalysisStage, number> = {
  queued: 5,
  downloading_source: 12,
  loading_bytes: 22,
  parsing_file: 38,
  extracting_rows: 58,
  ai_mapping: 74,
  applying_refinement: 84,
  building_preview: 92,
  preview_ready: 100,
  importing: 96,
  completed: 100,
  error: 0,
};

const DEFAULT_IMPORT_ANALYSIS_MESSAGE: Record<ImportAnalysisStage, string> = {
  queued: "분석을 준비하고 있습니다.",
  downloading_source: "원본 파일을 가져오고 있습니다.",
  loading_bytes: "파일 내용을 읽고 있습니다.",
  parsing_file: "데이터 구조를 해석하고 있습니다.",
  extracting_rows: "수강생 정보를 추출하고 있습니다.",
  ai_mapping: "AI가 데이터를 해석하고 있습니다.",
  applying_refinement: "수정 요청을 반영하고 있습니다.",
  building_preview: "미리보기를 정리하고 있습니다.",
  preview_ready: "분석이 완료되었습니다.",
  importing: "스페이스와 수강생을 생성하고 있습니다.",
  completed: "가져오기가 완료되었습니다.",
  error: "분석에 실패했습니다.",
};

export function createImportAnalysisProgressState(
  stage: ImportAnalysisStage,
  overrides?: Partial<
    Pick<ImportAnalysisProgressState, "progress" | "message">
  >,
): ImportAnalysisProgressState {
  return {
    stage,
    progress: overrides?.progress ?? DEFAULT_IMPORT_ANALYSIS_PROGRESS[stage],
    message: overrides?.message ?? DEFAULT_IMPORT_ANALYSIS_MESSAGE[stage],
  };
}

export function getImportAnalysisChecklistStep(stage?: ImportAnalysisStage) {
  if (!stage) return 0;
  return IMPORT_ANALYSIS_STAGE_TO_STEP[stage] ?? 0;
}
