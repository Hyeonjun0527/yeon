export type TabType = "system" | "custom";

export interface SpaceTab {
  id: string;
  spaceId: string;
  tabType: TabType;
  systemKey: string | null;
  name: string;
  isVisible: boolean;
  displayOrder: number;
}

export type FieldType =
  | "text"
  | "long_text"
  | "number"
  | "date"
  | "select"
  | "multi_select"
  | "checkbox"
  | "url"
  | "email"
  | "phone";

export interface SelectOption {
  value: string;
  color: string;
}

export interface SpaceField {
  id: string;
  spaceId: string;
  tabId: string;
  name: string;
  sourceKey?: string | null;
  fieldType: FieldType;
  options: SelectOption[] | null;
  isRequired: boolean;
  displayOrder: number;
  deletedAt?: string | null;
}

export interface SpaceTemplateSummary {
  id: string;
  name: string;
  description: string | null;
  isSystem: boolean;
  tabCount: number;
  fieldCount: number;
  tabPreviewNames: string[];
  fieldPreviewNames: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SpaceTemplateFieldConfig {
  name: string;
  fieldType: FieldType;
  options?: SelectOption[] | null;
  isRequired: boolean;
  displayOrder: number;
}

export interface SpaceTemplateTabConfig {
  name: string;
  tabType: TabType;
  systemKey?: string | null;
  displayOrder: number;
  fields: SpaceTemplateFieldConfig[];
}

export interface SpaceTemplateDetail extends SpaceTemplateSummary {
  tabsConfig: SpaceTemplateTabConfig[];
}

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "텍스트",
  long_text: "긴 텍스트",
  number: "숫자",
  date: "날짜",
  select: "단일 선택",
  multi_select: "복수 선택",
  checkbox: "체크박스",
  url: "URL",
  email: "이메일",
  phone: "전화번호",
};
