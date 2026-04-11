import type {
  CounselingRecordAnalysisStatus,
  CounselingRecordProcessingStage,
} from "@yeon/api-contract/counseling-records";

export const PROCESSING_STEPS = [
  { label: "음성 파일 업로드" },
  { label: "화자 분리" },
  { label: "음성 전사" },
  { label: "화자 식별" },
  { label: "상담 분석" },
  { label: "요약 생성" },
] as const;

const PROCESSING_STAGE_TO_STEP: Record<
  CounselingRecordProcessingStage,
  number
> = {
  queued: 0,
  downloading: 0,
  chunking: 1,
  transcribing: 2,
  resolving_speakers: 3,
  transcript_ready: 4,
  analyzing: 4,
  completed: 5,
  error: 0,
};

export function getProcessingChecklistStep(params: {
  processingStage?: CounselingRecordProcessingStage;
  analysisStatus?: CounselingRecordAnalysisStatus;
}) {
  const stageStep = params.processingStage
    ? PROCESSING_STAGE_TO_STEP[params.processingStage]
    : 0;

  if (params.analysisStatus === "ready") {
    return PROCESSING_STEPS.length - 1;
  }

  return stageStep;
}
