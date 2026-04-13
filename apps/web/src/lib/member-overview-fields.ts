import type { FieldType } from "@/features/space-settings/types";

export const OVERVIEW_SECTION_TITLES = {
  contact: "연락처",
  status: "운영 상태",
  counseling: "상담 기록",
  additional: "추가 정보",
} as const;

export type OverviewSectionKey = keyof typeof OVERVIEW_SECTION_TITLES;

export const OVERVIEW_FIELD_SOURCE_KEYS = {
  memberName: "member_name",
  memberEmail: "member_email",
  memberPhone: "member_phone",
  memberStatus: "member_status",
  memberCreatedAt: "member_created_at",
  counselingCount: "member_counseling_count",
  memoCount: "member_memo_count",
  aiRiskSignals: "member_ai_risk_signals",
} as const;

export type OverviewFieldSourceKey =
  (typeof OVERVIEW_FIELD_SOURCE_KEYS)[keyof typeof OVERVIEW_FIELD_SOURCE_KEYS];

export interface DefaultOverviewFieldDefinition {
  sourceKey: OverviewFieldSourceKey;
  name: string;
  fieldType: FieldType;
  sectionKey: OverviewSectionKey;
  displayOrder: number;
}

export const DEFAULT_OVERVIEW_FIELDS: DefaultOverviewFieldDefinition[] = [
  {
    sourceKey: OVERVIEW_FIELD_SOURCE_KEYS.memberName,
    name: "이름",
    fieldType: "text",
    sectionKey: "contact",
    displayOrder: 0,
  },
  {
    sourceKey: OVERVIEW_FIELD_SOURCE_KEYS.memberEmail,
    name: "이메일",
    fieldType: "email",
    sectionKey: "contact",
    displayOrder: 1,
  },
  {
    sourceKey: OVERVIEW_FIELD_SOURCE_KEYS.memberPhone,
    name: "전화번호",
    fieldType: "phone",
    sectionKey: "contact",
    displayOrder: 2,
  },
  {
    sourceKey: OVERVIEW_FIELD_SOURCE_KEYS.memberStatus,
    name: "수강 상태",
    fieldType: "text",
    sectionKey: "status",
    displayOrder: 3,
  },
  {
    sourceKey: OVERVIEW_FIELD_SOURCE_KEYS.memberCreatedAt,
    name: "등록일",
    fieldType: "date",
    sectionKey: "status",
    displayOrder: 4,
  },
  {
    sourceKey: OVERVIEW_FIELD_SOURCE_KEYS.counselingCount,
    name: "연결된 상담",
    fieldType: "number",
    sectionKey: "counseling",
    displayOrder: 5,
  },
  {
    sourceKey: OVERVIEW_FIELD_SOURCE_KEYS.memoCount,
    name: "운영 메모",
    fieldType: "number",
    sectionKey: "counseling",
    displayOrder: 6,
  },
  {
    sourceKey: OVERVIEW_FIELD_SOURCE_KEYS.aiRiskSignals,
    name: "AI 위험 신호",
    fieldType: "text",
    sectionKey: "counseling",
    displayOrder: 7,
  },
];

export const OVERVIEW_FIELD_SOURCE_KEY_SET = new Set<OverviewFieldSourceKey>(
  DEFAULT_OVERVIEW_FIELDS.map((field) => field.sourceKey),
);

export const OVERVIEW_FIELD_META_BY_SOURCE_KEY = Object.fromEntries(
  DEFAULT_OVERVIEW_FIELDS.map((field) => [field.sourceKey, field]),
) as Record<OverviewFieldSourceKey, DefaultOverviewFieldDefinition>;
