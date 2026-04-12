import { z } from "zod";

export const memberTabTypeValues = ["system", "custom"] as const;
export const memberTabSystemKeyValues = [
  "overview",
  "counseling",
  "memos",
  "report",
] as const;
export const memberFieldTypeValues = [
  "text",
  "long_text",
  "number",
  "date",
  "select",
  "multi_select",
  "checkbox",
  "url",
  "email",
  "phone",
] as const;

export const memberTabTypeSchema = z.enum(memberTabTypeValues);
export const memberTabSystemKeySchema = z.enum(memberTabSystemKeyValues);
export const memberFieldTypeSchema = z.enum(memberFieldTypeValues);

export const memberFieldSelectOptionSchema = z.object({
  value: z.string(),
  color: z.string(),
});

export const createSpaceBodySchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullish(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
});

export const updateSpaceBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

export const createMemberBodySchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(255).nullish(),
  phone: z.string().max(20).nullish(),
  status: z.string().max(20).nullish(),
  initialRiskLevel: z.string().max(10).nullish(),
});

export const updateMemberBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(255).nullish(),
  phone: z.string().max(20).nullish(),
  status: z.string().max(20).nullish(),
  initialRiskLevel: z.string().max(10).nullish(),
});

export const bulkDeleteMembersBodySchema = z.object({
  memberIds: z.array(z.string().uuid()).min(1).max(200),
});

export const createMemberTabBodySchema = z.object({
  name: z.string().min(1).max(80),
});

export const updateMemberTabBodySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  isVisible: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
});

export const reorderMemberTabsBodySchema = z.object({
  order: z.array(z.string().uuid()),
});

export const createMemberFieldBodySchema = z.object({
  name: z.string().min(1).max(80),
  fieldType: memberFieldTypeSchema,
  options: z.array(memberFieldSelectOptionSchema).nullish(),
  isRequired: z.boolean().optional(),
});

export const updateMemberFieldBodySchema = z.object({
  name: z.string().min(1).max(80).optional(),
  fieldType: memberFieldTypeSchema.optional(),
  options: z.array(memberFieldSelectOptionSchema).nullish(),
  isRequired: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  tabId: z.string().uuid().optional(),
});

export const reorderMemberFieldsBodySchema = z.object({
  order: z.array(z.string().uuid()),
});

export const memberFieldValuePayloadSchema = z.object({
  fieldDefinitionId: z.string().uuid(),
  value: z.unknown(),
});

export const bulkUpsertMemberFieldValuesBodySchema = z.object({
  values: z.array(memberFieldValuePayloadSchema),
});

export type MemberTabType = z.infer<typeof memberTabTypeSchema>;
export type MemberTabSystemKey = z.infer<typeof memberTabSystemKeySchema>;
export type MemberFieldType = z.infer<typeof memberFieldTypeSchema>;
export type MemberFieldSelectOption = z.infer<
  typeof memberFieldSelectOptionSchema
>;
export type CreateSpaceBody = z.infer<typeof createSpaceBodySchema>;
export type UpdateSpaceBody = z.infer<typeof updateSpaceBodySchema>;
export type CreateMemberBody = z.infer<typeof createMemberBodySchema>;
export type UpdateMemberBody = z.infer<typeof updateMemberBodySchema>;
export type BulkDeleteMembersBody = z.infer<typeof bulkDeleteMembersBodySchema>;
export type CreateMemberTabBody = z.infer<typeof createMemberTabBodySchema>;
export type UpdateMemberTabBody = z.infer<typeof updateMemberTabBodySchema>;
export type ReorderMemberTabsBody = z.infer<typeof reorderMemberTabsBodySchema>;
export type CreateMemberFieldBody = z.infer<typeof createMemberFieldBodySchema>;
export type UpdateMemberFieldBody = z.infer<typeof updateMemberFieldBodySchema>;
export type ReorderMemberFieldsBody = z.infer<
  typeof reorderMemberFieldsBodySchema
>;
export type MemberFieldValuePayload = z.infer<
  typeof memberFieldValuePayloadSchema
>;
export type BulkUpsertMemberFieldValuesBody = z.infer<
  typeof bulkUpsertMemberFieldValuesBodySchema
>;
