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
