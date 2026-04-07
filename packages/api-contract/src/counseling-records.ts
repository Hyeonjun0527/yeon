import { z } from "zod";

export const counselingRecordStatusSchema = z.enum([
  "processing",
  "ready",
  "error",
]);

export const counselingRecordSpeakerToneSchema = z.enum([
  "teacher",
  "student",
  "guardian",
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
  language: z.string().nullable(),
  sttModel: z.string().nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  transcriptionCompletedAt: z.string().datetime().nullable(),
});

export const counselingRecordDetailSchema =
  counselingRecordListItemSchema.extend({
    transcriptText: z.string(),
    transcriptSegments: z.array(counselingTranscriptSegmentSchema),
    audioUrl: z.string(),
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
