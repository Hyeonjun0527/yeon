export const AI_QUICK_CHIPS = [
  "후속 조치 정리",
  "이전 상담 비교",
  "학습 루틴 제안",
  "멘토링 리포트 작성",
] as const;

export const AI_MODELS = ["일반 모델", "고급 모델"] as const;
export type AiModelType = (typeof AI_MODELS)[number];

export const AI_PANEL_MIN_WIDTH = 280;
export const AI_PANEL_MAX_WIDTH = 600;
export const AI_PANEL_DEFAULT_WIDTH = 400;
