import { z } from "zod";

export const counselingRecordStatusSchema = z.enum([
  "processing",
  "ready",
  "error",
]);

export const counselingRecordProcessingStageSchema = z.enum([
  "queued",
  "downloading",
  "chunking",
  "transcribing",
  "resolving_speakers",
  "transcript_ready",
  "analyzing",
  "completed",
  "error",
]);

export const counselingRecordAnalysisStatusSchema = z.enum([
  "idle",
  "queued",
  "processing",
  "ready",
  "error",
]);

export const counselingRecordSpeakerToneSchema = z.enum([
  "teacher",
  "student",
  "unknown",
]);

export const counselingTranscriptSegmentSchema = z.object({
  id: z.string().uuid(),
  segmentIndex: z.number().int().nonnegative(),
  startMs: z.number().int().nonnegative().nullable(),
  endMs: z.number().int().nonnegative().nullable(),
  speakerLabel: z.string(),
  speakerTone: counselingRecordSpeakerToneSchema,
  text: z.string(),
});

export const counselingRecordListItemSchema = z.object({
  id: z.string().uuid(),
  spaceId: z.string().uuid().nullable(),
  memberId: z.string().uuid().nullable(),
  studentName: z.string(),
  sessionTitle: z.string(),
  counselingType: z.string(),
  counselorName: z.string().nullable(),
  status: counselingRecordStatusSchema,
  preview: z.string(),
  tags: z.array(z.string()),
  audioOriginalName: z.string(),
  audioMimeType: z.string(),
  audioByteSize: z.number().int().nonnegative(),
  audioDurationMs: z.number().int().nonnegative().nullable(),
  transcriptSegmentCount: z.number().int().nonnegative(),
  transcriptTextLength: z.number().int().nonnegative(),
  processingStage: counselingRecordProcessingStageSchema,
  processingProgress: z.number().int().min(0).max(100),
  processingMessage: z.string().nullable(),
  processingChunkCount: z.number().int().nonnegative(),
  processingChunkCompletedCount: z.number().int().nonnegative(),
  transcriptionAttemptCount: z.number().int().nonnegative(),
  analysisStatus: counselingRecordAnalysisStatusSchema,
  analysisProgress: z.number().int().min(0).max(100),
  analysisErrorMessage: z.string().nullable(),
  analysisAttemptCount: z.number().int().nonnegative(),
  language: z.string().nullable(),
  sttModel: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  transcriptionCompletedAt: z.string().datetime().nullable(),
  analysisCompletedAt: z.string().datetime().nullable(),
});

// ── AI 분석 결과 구조화 스키마 ──

export const analysisIssueSchema = z.object({
  title: z.string(),
  detail: z.string(),
  timestamp: z.string().nullable().optional(),
});

export const analysisActionsSchema = z.object({
  mentor: z.array(z.string()),
  member: z.array(z.string()),
  nextSession: z.array(z.string()),
});

export const analysisResultSchema = z.object({
  summary: z.string(),
  member: z.object({
    name: z.string().nullable(),
    traits: z.array(z.string()),
    emotion: z.string(),
  }),
  issues: z.array(analysisIssueSchema),
  actions: analysisActionsSchema,
  keywords: z.array(z.string()),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

export const counselingRecordDetailSchema =
  counselingRecordListItemSchema.extend({
    transcriptText: z.string(),
    transcriptSegments: z.array(counselingTranscriptSegmentSchema),
    audioUrl: z.string().nullable(),
    analysisResult: analysisResultSchema.nullable(),
  });

export const listCounselingRecordsResponseSchema = z.object({
  records: z.array(counselingRecordListItemSchema),
});

export const counselingRecordDetailResponseSchema = z.object({
  record: counselingRecordDetailSchema,
});

export type CounselingRecordStatus = z.infer<
  typeof counselingRecordStatusSchema
>;
export type CounselingRecordProcessingStage = z.infer<
  typeof counselingRecordProcessingStageSchema
>;
export type CounselingRecordAnalysisStatus = z.infer<
  typeof counselingRecordAnalysisStatusSchema
>;
export type CounselingRecordSpeakerTone = z.infer<
  typeof counselingRecordSpeakerToneSchema
>;
export type CounselingTranscriptSegment = z.infer<
  typeof counselingTranscriptSegmentSchema
>;
export type CounselingRecordListItem = z.infer<
  typeof counselingRecordListItemSchema
>;
export type CounselingRecordDetail = z.infer<
  typeof counselingRecordDetailSchema
>;
export type ListCounselingRecordsResponse = z.infer<
  typeof listCounselingRecordsResponseSchema
>;
export type CounselingRecordDetailResponse = z.infer<
  typeof counselingRecordDetailResponseSchema
>;

export const updateSegmentRequestSchema = z.object({
  text: z.string().min(1).optional(),
  speakerLabel: z.string().min(1).max(40).optional(),
  speakerTone: counselingRecordSpeakerToneSchema.optional(),
});

export const updateSegmentResponseSchema = z.object({
  segment: counselingTranscriptSegmentSchema,
});

export const bulkUpdateSpeakerRequestSchema = z.object({
  fromSpeakerLabel: z.string().min(1).max(40),
  toSpeakerLabel: z.string().min(1).max(40),
  toSpeakerTone: counselingRecordSpeakerToneSchema.optional(),
});

export const bulkUpdateSpeakerResponseSchema = z.object({
  updatedCount: z.number().int().nonnegative(),
});

export type UpdateSegmentRequest = z.infer<typeof updateSegmentRequestSchema>;
export type BulkUpdateSpeakerRequest = z.infer<
  typeof bulkUpdateSpeakerRequestSchema
>;

// ── AI 분석 응답 ──

export const analyzeRecordResponseSchema = z.object({
  analysisResult: analysisResultSchema,
});

export type AnalyzeRecordResponse = z.infer<typeof analyzeRecordResponseSchema>;

// ── 수강생 연결 ──

export const linkMemberRequestSchema = z.object({
  memberId: z.string().uuid().nullable(),
});

export const linkMemberResponseSchema = z.object({ ok: z.literal(true) });

export type LinkMemberRequest = z.infer<typeof linkMemberRequestSchema>;
export type LinkMemberResponse = z.infer<typeof linkMemberResponseSchema>;

// 78차: 학생별 요약
export const studentSummarySchema = z.object({
  studentName: z.string(),
  recordCount: z.number().int().nonnegative(),
  firstCounselingAt: z.string().datetime(),
  lastCounselingAt: z.string().datetime(),
  records: z.array(counselingRecordListItemSchema),
});

export const listStudentSummariesResponseSchema = z.object({
  students: z.array(studentSummarySchema),
});

export type StudentSummary = z.infer<typeof studentSummarySchema>;
export type ListStudentSummariesResponse = z.infer<
  typeof listStudentSummariesResponseSchema
>;
