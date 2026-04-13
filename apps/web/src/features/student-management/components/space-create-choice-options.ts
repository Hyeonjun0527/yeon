export type SpaceCreateChoiceStep = "blank" | "import";

export interface SpaceCreateChoice {
  step: SpaceCreateChoiceStep;
  title: string;
  description: string;
  tone: "default" | "recommended";
  badgeLabel?: string;
  chips?: readonly string[];
}

export const SPACE_CREATE_CHOICES: readonly SpaceCreateChoice[] = [
  {
    step: "import",
    title: "AI로 파일 가져와 스페이스 만들기",
    description:
      "Google Drive, OneDrive, 내 컴퓨터의 엑셀/CSV를 분석해 스페이스와 수강생 초안을 함께 만듭니다.",
    tone: "recommended",
    badgeLabel: "권장",
    chips: ["Google Drive", "OneDrive", "내 컴퓨터"],
  },
  {
    step: "blank",
    title: "빈 스페이스 만들기",
    description:
      "수강생 없이 먼저 공간만 만들고, 이후 상단의 수강생 추가나 설정에서 직접 채웁니다.",
    tone: "default",
  },
] as const;
