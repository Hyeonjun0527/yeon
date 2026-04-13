import { z } from "zod";

export const studentAttendanceStatusValues = [
  "unknown",
  "present",
  "absent",
] as const;
export const studentAssignmentStatusValues = [
  "unknown",
  "done",
  "not_done",
] as const;
export const studentBoardSourceValues = [
  "manual",
  "public_qr",
  "public_location",
] as const;
export const publicCheckMethodValues = ["qr", "location"] as const;
export const publicCheckSessionStatusValues = ["active", "closed"] as const;
export const publicCheckSessionModeValues = [
  "attendance_only",
  "assignment_only",
  "attendance_and_assignment",
] as const;
export const publicCheckVerificationStatusValues = [
  "matched",
  "not_found",
  "ambiguous",
  "not_ready",
  "outside_radius",
] as const;

export const studentAttendanceStatusSchema = z.enum(
  studentAttendanceStatusValues,
);
export const studentAssignmentStatusSchema = z.enum(
  studentAssignmentStatusValues,
);
export const studentBoardSourceSchema = z.enum(studentBoardSourceValues);
export const publicCheckMethodSchema = z.enum(publicCheckMethodValues);
export const publicCheckSessionStatusSchema = z.enum(
  publicCheckSessionStatusValues,
);
export const publicCheckSessionModeSchema = z.enum(
  publicCheckSessionModeValues,
);
export const publicCheckVerificationStatusSchema = z.enum(
  publicCheckVerificationStatusValues,
);

export const studentBoardRowSchema = z.object({
  memberId: z.string().uuid(),
  attendanceStatus: studentAttendanceStatusSchema,
  attendanceMarkedAt: z.string().datetime().nullable(),
  attendanceMarkedSource: studentBoardSourceSchema.nullable(),
  assignmentStatus: studentAssignmentStatusSchema,
  assignmentLink: z.string().max(1000).nullable(),
  assignmentMarkedAt: z.string().datetime().nullable(),
  assignmentMarkedSource: studentBoardSourceSchema.nullable(),
  lastPublicCheckAt: z.string().datetime().nullable(),
  isSelfCheckReady: z.boolean(),
});

export const updateStudentBoardBodySchema = z.object({
  attendanceStatus: studentAttendanceStatusSchema.optional(),
  assignmentStatus: studentAssignmentStatusSchema.optional(),
  assignmentLink: z.string().max(1000).nullable().optional(),
});

export const publicCheckSessionSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  status: publicCheckSessionStatusSchema,
  checkMode: publicCheckSessionModeSchema,
  enabledMethods: z.array(publicCheckMethodSchema).min(1),
  publicPath: z.string(),
  opensAt: z.string().datetime().nullable(),
  closesAt: z.string().datetime().nullable(),
  locationLabel: z.string().nullable(),
  radiusMeters: z.number().int().nullable(),
  createdAt: z.string().datetime(),
});

export const publicCheckLocationSearchSourceSchema = z.enum([
  "keyword",
  "address",
]);

export const publicCheckLocationSearchResultSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  placeName: z.string().nullable(),
  roadAddressName: z.string().nullable(),
  addressName: z.string().nullable(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  source: publicCheckLocationSearchSourceSchema,
});

export const publicCheckLocationSearchResponseSchema = z.object({
  results: z.array(publicCheckLocationSearchResultSchema),
});

export const studentBoardResponseSchema = z.object({
  rows: z.array(studentBoardRowSchema),
  sessions: z.array(publicCheckSessionSummarySchema),
});

export const createPublicCheckSessionBodySchema = z.object({
  title: z.string().min(1).max(120),
  checkMode: publicCheckSessionModeSchema.default("attendance_and_assignment"),
  enabledMethods: z.array(publicCheckMethodSchema).min(1),
  opensAt: z.string().datetime().nullable().optional(),
  closesAt: z.string().datetime().nullable().optional(),
  locationLabel: z.string().max(120).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
  radiusMeters: z.number().int().min(50).max(300).nullable().optional(),
});

export const updatePublicCheckSessionBodySchema = z.object({
  status: publicCheckSessionStatusSchema.optional(),
  closesAt: z.string().datetime().nullable().optional(),
});

export const publicCheckSessionPublicSchema = z.object({
  title: z.string(),
  checkMode: publicCheckSessionModeSchema,
  enabledMethods: z.array(publicCheckMethodSchema).min(1),
  locationLabel: z.string().nullable(),
  requiresPhoneLast4: z.boolean(),
});

export const submitPublicCheckBodySchema = z.object({
  method: publicCheckMethodSchema,
  name: z.string().min(1).max(100),
  phoneLast4: z.string().regex(/^\d{4}$/),
  assignmentStatus: studentAssignmentStatusSchema.optional(),
  assignmentLink: z.string().max(1000).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

export const submitPublicCheckResultSchema = z.object({
  verificationStatus: publicCheckVerificationStatusSchema,
  message: z.string(),
  matchedMemberName: z.string().nullable(),
});

export type StudentAttendanceStatus = z.infer<
  typeof studentAttendanceStatusSchema
>;
export type StudentAssignmentStatus = z.infer<
  typeof studentAssignmentStatusSchema
>;
export type StudentBoardSource = z.infer<typeof studentBoardSourceSchema>;
export type StudentBoardRow = z.infer<typeof studentBoardRowSchema>;
export type UpdateStudentBoardBody = z.infer<
  typeof updateStudentBoardBodySchema
>;
export type PublicCheckMethod = z.infer<typeof publicCheckMethodSchema>;
export type PublicCheckSessionStatus = z.infer<
  typeof publicCheckSessionStatusSchema
>;
export type PublicCheckSessionMode = z.infer<
  typeof publicCheckSessionModeSchema
>;
export type PublicCheckVerificationStatus = z.infer<
  typeof publicCheckVerificationStatusSchema
>;
export type PublicCheckSessionSummary = z.infer<
  typeof publicCheckSessionSummarySchema
>;
export type PublicCheckLocationSearchSource = z.infer<
  typeof publicCheckLocationSearchSourceSchema
>;
export type PublicCheckLocationSearchResult = z.infer<
  typeof publicCheckLocationSearchResultSchema
>;
export type PublicCheckLocationSearchResponse = z.infer<
  typeof publicCheckLocationSearchResponseSchema
>;
export type StudentBoardResponse = z.infer<typeof studentBoardResponseSchema>;
export type CreatePublicCheckSessionBody = z.infer<
  typeof createPublicCheckSessionBodySchema
>;
export type UpdatePublicCheckSessionBody = z.infer<
  typeof updatePublicCheckSessionBodySchema
>;
export type PublicCheckSessionPublic = z.infer<
  typeof publicCheckSessionPublicSchema
>;
export type SubmitPublicCheckBody = z.infer<typeof submitPublicCheckBodySchema>;
export type SubmitPublicCheckResult = z.infer<
  typeof submitPublicCheckResultSchema
>;
